import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

const DEFAULT_LANG = 'ru-RU';

type SpeechRecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<{
      isFinal: boolean;
      0: { transcript: string };
    }>;
  }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function getWebSpeechRecognition(): SpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function webSpeechErrorMessage(code: string | undefined): string | null {
  switch (code) {
    case 'aborted':
    case 'no-speech':
      return null;
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Разрешите доступ к микрофону в браузере';
    case 'audio-capture':
      return 'Микрофон недоступен';
    case 'network':
      return 'Нет связи с сервисом распознавания (нужен интернет / Chrome). На Android надёжнее нативное приложение.';
    case 'language-not-supported':
      return 'Язык ru-RU не поддерживается этим браузером';
    default:
      return 'Не удалось распознать речь';
  }
}

/** Warm up mic permission — Chrome STT often fails without a prior getUserMedia grant. */
async function ensureMicPermission(): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia) return true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    toast.error('Разрешите доступ к микрофону');
    return false;
  }
}

export interface UseSpeechToTextOptions {
  language?: string;
  /** Called with the latest transcript chunk (final or interim). */
  onTranscript?: (text: string, meta: { isFinal: boolean }) => void;
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}) {
  const language = options.language ?? DEFAULT_LANG;
  const onTranscriptRef = useRef(options.onTranscript);
  onTranscriptRef.current = options.onTranscript;

  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const webRecognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(
    null,
  );
  const intentionalStopRef = useRef(false);
  const nativeListenerHandlesRef = useRef<Array<{ remove: () => Promise<void> }>>(
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const { SpeechRecognition } = await import(
            '@capgo/capacitor-speech-recognition'
          );
          const { available } = await SpeechRecognition.available();
          if (!cancelled) setSupported(available);
        } catch {
          if (!cancelled) setSupported(false);
        }
        return;
      }

      const hasApi = getWebSpeechRecognition() !== null;
      const secure =
        typeof window.isSecureContext === 'boolean'
          ? window.isSecureContext
          : true;
      if (!cancelled) setSupported(hasApi && secure);
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  const cleanupNativeListeners = useCallback(async () => {
    const handles = nativeListenerHandlesRef.current;
    nativeListenerHandlesRef.current = [];
    await Promise.all(handles.map((h) => h.remove().catch(() => undefined)));
  }, []);

  const stop = useCallback(async () => {
    intentionalStopRef.current = true;

    if (Capacitor.isNativePlatform()) {
      try {
        const { SpeechRecognition } = await import(
          '@capgo/capacitor-speech-recognition'
        );
        await SpeechRecognition.stop();
      } catch {
        /* ignore */
      }
      await cleanupNativeListeners();
      setListening(false);
      return;
    }

    const recognition = webRecognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
      webRecognitionRef.current = null;
    }
    setListening(false);
  }, [cleanupNativeListeners]);

  const start = useCallback(async () => {
    if (listening) return;
    intentionalStopRef.current = false;

    if (Capacitor.isNativePlatform()) {
      try {
        const { SpeechRecognition } = await import(
          '@capgo/capacitor-speech-recognition'
        );
        const perms = await SpeechRecognition.requestPermissions();
        if (perms.speechRecognition !== 'granted') {
          toast.error('Нужен доступ к микрофону');
          return;
        }

        await cleanupNativeListeners();

        const partial = await SpeechRecognition.addListener(
          'partialResults',
          (event) => {
            const text = event.matches?.[0]?.trim();
            if (!text) return;
            onTranscriptRef.current?.(text, { isFinal: false });
          },
        );
        const errorListener = await SpeechRecognition.addListener(
          'error',
          (event) => {
            toast.message(event.message || 'Ошибка распознавания речи');
            setListening(false);
          },
        );
        const stateListener = await SpeechRecognition.addListener(
          'listeningState',
          (event) => {
            if (event.status === 'stopped') setListening(false);
          },
        );
        nativeListenerHandlesRef.current = [
          partial,
          errorListener,
          stateListener,
        ];

        setListening(true);
        await SpeechRecognition.start({
          language,
          maxResults: 3,
          partialResults: true,
          popup: false,
        });
      } catch {
        setListening(false);
        await cleanupNativeListeners();
        toast.error('Не удалось начать голосовой ввод');
      }
      return;
    }

    if (!window.isSecureContext) {
      toast.message(
        'Голос в браузере только по HTTPS или localhost (не по IP вроде 192.168.x.x)',
      );
      return;
    }

    const Ctor = getWebSpeechRecognition();
    if (!Ctor) {
      toast.message('Голосовой ввод не поддерживается в этом браузере — откройте Chrome');
      return;
    }

    const micOk = await ensureMicPermission();
    if (!micOk) return;

    const recognition = new Ctor();
    recognition.lang = language;
    // continuous: пользователь сам жмёт mic ещё раз, чтобы остановить
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const chunk = result[0]?.transcript ?? '';
        if (result.isFinal) finalText += chunk;
        else interim += chunk;
      }
      if (finalText.trim()) {
        onTranscriptRef.current?.(finalText.trim(), { isFinal: true });
      } else if (interim.trim()) {
        onTranscriptRef.current?.(interim.trim(), { isFinal: false });
      }
    };

    recognition.onerror = (event) => {
      if (!intentionalStopRef.current) {
        const message = webSpeechErrorMessage(event.error);
        if (message) toast.message(message);
      }
      setListening(false);
      webRecognitionRef.current = null;
    };

    recognition.onend = () => {
      // Chrome ends the session after a pause even with continuous in some versions
      setListening(false);
      webRecognitionRef.current = null;
    };

    webRecognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
      webRecognitionRef.current = null;
      toast.error('Не удалось начать голосовой ввод');
    }
  }, [cleanupNativeListeners, language, listening]);

  const toggle = useCallback(async () => {
    if (listening) await stop();
    else await start();
  }, [listening, start, stop]);

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return { supported, listening, start, stop, toggle };
}
