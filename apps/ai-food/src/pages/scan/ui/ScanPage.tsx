import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { ImageIcon, PenLine, X, Zap, ZapOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  BarcodeProductConfirm,
  LiveBarcodeScan,
  NativeMlKitBarcodeScan,
  detectBarcodeInFile,
  detectBarcodeInVideo,
  detectBarcodeInVideoWithMlKit,
  getOffProductErrorMessage,
  isNativeMlKitBarcodeAvailable,
  normalizeBarcode,
  useProductByBarcode,
  useSaveBarcodeMeal,
} from '@/features/scan-barcode';
import {
  beginAnalyzingMeal,
  cancelAnalyzingMeal,
  persistMealImages,
  runMealAnalyze,
  runMealAnalyzeWithFile,
  useSaveMeal,
} from '@/features/save-meal';
import { TextareaWithVoice, Button, SubpageShell } from '@/shared/ui';
import {
  AI_IMAGE_MAX_SIDE,
  appDebugLog,
  cn,
  takePhotoAsFile,
} from '@/shared/lib';
import {
  jpegFileFromCanvas,
  snapshotVideoFrame,
  warmJpegEncoder,
} from '../lib/captureVideoFrame';
import { createCaptureLock } from '../lib/createCaptureLock';
import { drawVideoContain } from '../lib/drawVideoContain';
import { isLivePreviewPainting } from '../lib/isLivePreviewPainting';
import { openRearCamera } from '../lib/openRearCamera';

type ScanMode = 'food' | 'barcode';

export function ScanPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const barcodeOnly = searchParams.get('barcodeOnly') === '1';
  const initialMode: ScanMode =
    searchParams.get('mode') === 'barcode' || barcodeOnly ? 'barcode' : 'food';

  const [mode, setMode] = useState<ScanMode>(initialMode);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  /**
   * Live getUserMedia failed (common on http://LAN-IP — not a secure context).
   * Food shutter then uses @capacitor/camera takePhoto.
   */
  const [nativeCaptureOnly, setNativeCaptureOnly] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [lookupCode, setLookupCode] = useState<string | null>(null);
  const [savingBarcode, setSavingBarcode] = useState(false);
  const [capturing, setCapturing] = useState(false);
  /** Native Android ML Kit path; false on web / unsupported. Resolved once. */
  const [nativeMlKit, setNativeMlKit] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const captureLockRef = useRef(createCaptureLock());

  const submitFood = useSaveMeal();
  const queryClient = useQueryClient();
  const saveBarcodeMeal = useSaveBarcodeMeal();
  const { data, error, isFetching, isSuccess, isError } =
    useProductByBarcode(lookupCode);

  const showBarcodeConfirm =
    mode === 'barcode' && Boolean(lookupCode) && isSuccess && data && !isFetching;

  /**
   * Shared getUserMedia for food + barcode (letterboxed canvas preview).
   * Native ML Kit decodes frames from the same stream — no fullscreen startScan.
   * When preview is unavailable (nativeCaptureOnly), still show the scan chrome.
   */
  const cameraActive = !pendingPhoto && !showBarcodeConfirm && !nativeCaptureOnly;

  useEffect(() => {
    let cancelled = false;
    void isNativeMlKitBarcodeAvailable().then((ok) => {
      if (!cancelled) setNativeMlKit(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    warmJpegEncoder();
  }, []);

  const stopStream = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  // Shared live preview for food + barcode (hidden video → canvas; no WebView Play glyph).
  useEffect(() => {
    if (!cameraActive) {
      stopStream();
      return;
    }

    let cancelled = false;

    const start = async () => {
      setCameraError(null);
      try {
        if (Capacitor.isNativePlatform()) {
          const status = await Camera.requestPermissions({
            permissions: ['camera'],
          });
          if (cancelled) return;
          if (status.camera !== 'granted' && status.camera !== 'limited') {
            throw new Error('camera-permission');
          }
        }

        const stream = await openRearCamera();
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          return;
        }

        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;

        if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
          await new Promise<void>((resolve) => {
            const done = () => {
              window.clearTimeout(timer);
              video.removeEventListener('loadedmetadata', done);
              resolve();
            };
            const timer = window.setTimeout(done, 2000);
            video.addEventListener('loadedmetadata', done);
          });
        }
        if (cancelled) {
          stopStream();
          return;
        }

        await video.play().catch(() => undefined);
        if (cancelled) {
          stopStream();
          return;
        }

        warmJpegEncoder();

        const track = stream.getVideoTracks()[0];
        const capabilities = track?.getCapabilities?.() as
          | (MediaTrackCapabilities & { torch?: boolean })
          | undefined;
        setTorchSupported(Boolean(capabilities?.torch));
      } catch (err) {
        if (cancelled) return;
        const name =
          err && typeof err === 'object' && 'name' in err
            ? String((err as { name: unknown }).name)
            : '';
        const message =
          err instanceof Error
            ? err.message
            : err && typeof err === 'object' && 'message' in err
              ? String((err as { message: unknown }).message)
              : String(err);
        const secure = window.isSecureContext;
        const hasMd = Boolean(navigator.mediaDevices?.getUserMedia);
        appDebugLog('photo', 'camera FAIL', undefined, {
          secure: secure ? 1 : 0,
          gUM: hasMd ? 1 : 0,
          name: name || '-',
          msg: message.slice(0, 60),
          host: location.host,
        });

        if (Capacitor.isNativePlatform() && message !== 'camera-permission') {
          // http://192.168.x.x is not a secure context → getUserMedia blocked.
          setNativeCaptureOnly(true);
          setCameraError(null);
          toast.message(
            'Live-камера недоступна по HTTP (LAN). Затвор откроет системную камеру.',
            { duration: 6000 },
          );
          return;
        }

        setNativeCaptureOnly(false);
        setCameraError(
          message === 'camera-permission'
            ? 'Нет доступа к камере'
            : !secure
              ? 'Камера недоступна: нужен HTTPS или localhost'
              : 'Камера недоступна',
        );
        toast.error(
          message === 'camera-permission'
            ? 'Нет доступа к камере'
            : `Камера: ${name || message || 'ошибка'}`,
        );
      }
    };

    void start();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [cameraActive, stopStream]);

  // Mirror camera frames onto canvas so the WebView Play glyph never shows.
  useEffect(() => {
    if (
      !isLivePreviewPainting({
        cameraActive,
        hasCameraError: Boolean(cameraError),
        capturing,
      })
    ) {
      return;
    }

    let raf = 0;
    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const cssW = canvas.clientWidth;
        const cssH = canvas.clientHeight;
        if (cssW > 0 && cssH > 0) {
          const dpr = Math.min(window.devicePixelRatio || 1, 3);
          const w = Math.round(cssW * dpr);
          const h = Math.round(cssH * dpr);
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
          }
          const ctx = canvas.getContext('2d');
          if (ctx) drawVideoContain(ctx, video, w, h);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cameraActive, cameraError, capturing]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!isError || !error) return;
    toast.error(getOffProductErrorMessage(error));
    setLookupCode(null);
  }, [isError, error]);

  const handleClose = () => {
    stopStream();
    navigate(-1);
  };

  const handleModeChange = (next: ScanMode) => {
    if (barcodeOnly || next === mode) return;
    captureLockRef.current.unlock();
    setCapturing(false);
    setLookupCode(null);
    setPendingPhoto(null);
    setDescription('');
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setMode(next);
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !torchSupported) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: next } as unknown as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      toast.message('Вспышка недоступна на этом устройстве');
    }
  };

  const acceptFoodFile = (file: File) => {
    stopStream();
    void submitFood({ image: file });
    navigate('/');
  };

  const beginPendingDescription = (file: File) => {
    stopStream();
    setPendingPhoto(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setDescription('');
  };

  const acceptBarcodeCode = (code: string) => {
    const normalized = normalizeBarcode(code);
    if (normalized.length < 8) {
      toast.message('Не удалось распознать код');
      return;
    }
    setLookupCode(normalized);
  };

  const handleShutter = async () => {
    if (capturing) return;

    if (mode === 'barcode') {
      if (cameraError || nativeCaptureOnly) return;
      const video = videoRef.current;
      if (!video) return;
      video.pause();
      setCapturing(true);
      try {
        const code = nativeMlKit
          ? await detectBarcodeInVideoWithMlKit(video)
          : await detectBarcodeInVideo(video);
        if (code) acceptBarcodeCode(code);
        else toast.message('Штрихкод не найден — наведите ближе');
      } finally {
        setCapturing(false);
        void video.play().catch(() => undefined);
      }
      return;
    }

    // Native / LAN HTTP: no getUserMedia preview → system camera.
    if (nativeCaptureOnly || cameraError) {
      if (!Capacitor.isNativePlatform()) return;
      setCapturing(true);
      const shutterT0 = performance.now();
      try {
        const file = await takePhotoAsFile();
        appDebugLog('photo', 'native takePhoto', performance.now() - shutterT0, {
          bytes: file?.size ?? 0,
        });
        if (!file) return;
        const handle = beginAnalyzingMeal();
        navigate('/');
        void runMealAnalyzeWithFile(queryClient, handle, file);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Не удалось сделать снимок',
        );
      } finally {
        setCapturing(false);
      }
      return;
    }

    await captureLockRef.current.run(async () => {
      const shutterT0 = performance.now();
      const video = videoRef.current;
      if (!video) {
        captureLockRef.current.unlock();
        setCapturing(false);
        return;
      }
      video.pause();
      setCapturing(true);
      const tSnap = performance.now();
      const canvas = snapshotVideoFrame(video, {
        maxSide: AI_IMAGE_MAX_SIDE,
      });
      appDebugLog('photo', 'snapshot', performance.now() - tSnap);
      if (!canvas) {
        captureLockRef.current.unlock();
        setCapturing(false);
        toast.error('Не удалось сделать снимок');
        void video.play().catch(() => undefined);
        return;
      }

      const tCard = performance.now();
      const handle = beginAnalyzingMeal();
      stopStream();
      navigate('/');
      appDebugLog('photo', 'card+nav', performance.now() - tCard, {
        since: Math.round(performance.now() - shutterT0),
      });

      const tJpeg = performance.now();
      void jpegFileFromCanvas(canvas).then((file) => {
        appDebugLog('photo', 'jpegEncode', performance.now() - tJpeg, {
          since: Math.round(performance.now() - shutterT0),
          bytes: file?.size ?? 0,
        });
        if (!file) {
          cancelAnalyzingMeal(handle.mealId);
          toast.error('Не удалось сделать снимок');
          return;
        }
        persistMealImages(handle.mealId, [file]);
        void runMealAnalyze(queryClient, handle, { image: file });
      });
    });
  };

  const handlePenCapture = async () => {
    if (mode !== 'food' || capturing) return;

    if (nativeCaptureOnly || cameraError) {
      if (!Capacitor.isNativePlatform()) return;
      setCapturing(true);
      try {
        const file = await takePhotoAsFile();
        if (!file) return;
        beginPendingDescription(file);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Не удалось сделать снимок',
        );
      } finally {
        setCapturing(false);
      }
      return;
    }

    await captureLockRef.current.run(async () => {
      const video = videoRef.current;
      if (!video) {
        captureLockRef.current.unlock();
        setCapturing(false);
        return;
      }
      video.pause();
      setCapturing(true);
      const canvas = snapshotVideoFrame(video, {
        maxSide: AI_IMAGE_MAX_SIDE,
      });
      if (!canvas) {
        captureLockRef.current.unlock();
        setCapturing(false);
        toast.error('Не удалось сделать снимок');
        void video.play().catch(() => undefined);
        return;
      }

      const file = await jpegFileFromCanvas(canvas);
      if (!file) {
        captureLockRef.current.unlock();
        setCapturing(false);
        toast.error('Не удалось сделать снимок');
        void video.play().catch(() => undefined);
        return;
      }
      beginPendingDescription(file);
    });
  };

  const handleGalleryChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (capturing) return;
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;

    if (mode === 'barcode') {
      setCapturing(true);
      void detectBarcodeInFile(file)
        .then((code) => {
          if (code) acceptBarcodeCode(code);
          else toast.message('На фото штрихкод не найден');
        })
        .finally(() => setCapturing(false));
      return;
    }

    setCapturing(true);
    acceptFoodFile(file);
  };

  const handleSubmitFood = () => {
    if (!pendingPhoto || !description.trim()) return;
    const image = pendingPhoto;
    const text = description.trim();
    setPendingPhoto(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    void submitFood({ image, description: text });
    navigate('/');
  };

  const handleScan = (code: string) => {
    acceptBarcodeCode(code);
  };

  const handleConfirmBarcode = async (grams: number) => {
    if (!data) return;
    setSavingBarcode(true);
    try {
      await saveBarcodeMeal(data, grams);
      toast.success('Добавлено в дневник');
      navigate('/');
    } catch {
      toast.error('Не удалось сохранить');
    } finally {
      setSavingBarcode(false);
    }
  };

  if (showBarcodeConfirm && data) {
    return (
      <SubpageShell
        title="Штрихкод"
        onBack={() => setLookupCode(null)}
        mainClassName="flex flex-col pb-safe"
      >
        <BarcodeProductConfirm
          product={data}
          onConfirm={handleConfirmBarcode}
          onCancel={() => setLookupCode(null)}
          saving={savingBarcode}
        />
      </SubpageShell>
    );
  }

  if (pendingPhoto && previewUrl) {
    return (
      <SubpageShell
        title="Камера + Описание"
        onBack={() => {
          captureLockRef.current.unlock();
          setCapturing(false);
          setPendingPhoto(null);
          setDescription('');
          setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
        }}
        mainClassName="space-y-4 pb-safe"
      >
        <img
          src={previewUrl}
          alt="Снимок блюда"
          className="h-48 w-full rounded-xl object-cover"
        />
        <TextareaWithVoice
          placeholder="Напр.: куриный салат с рисом, без соуса"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-28 resize-none"
          autoFocus
        />
        <Button
          className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={handleSubmitFood}
          disabled={!description.trim()}
        >
          Отправить
        </Button>
      </SubpageShell>
    );
  }

  const barcodeDecodeActive =
    mode === 'barcode' &&
    !cameraError &&
    !nativeCaptureOnly &&
    !lookupCode &&
    !capturing;
  const nativeBarcodeActive = nativeMlKit && barcodeDecodeActive;
  const torchDisabled = !torchSupported || nativeCaptureOnly;

  return (
    <div className="relative h-svh overflow-hidden bg-black text-white">
      <button
        type="button"
        onClick={handleClose}
        className="absolute left-4 top-safe z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40"
        aria-label="Закрыть"
        style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <X className="h-5 w-5" />
      </button>

      <div className="absolute inset-0">
        {cameraError ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/80">
            {cameraError}
          </div>
        ) : nativeCaptureOnly ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-white/80">
            <p>
              Live-preview недоступен по HTTP ({location.host}).
            </p>
            <p className="text-white/60">
              Затвор откроет системную камеру. Для live-превью — HTTPS или
              localhost.
            </p>
          </div>
        ) : (
          <>
            <div>
              <video
                ref={videoRef}
                className="camera-preview pointer-events-none absolute inset-0 h-full w-full opacity-0"
                autoPlay
                muted
                playsInline
                disablePictureInPicture
                disableRemotePlayback
                controls={false}
                controlsList="nodownload nofullscreen noremoteplayback"
                {...{ 'webkit-playsinline': 'true' }}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 z-[1] h-full w-full bg-black"
                aria-hidden
              />
            </div>
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              {mode === 'barcode' ? (
                <div className="relative h-36 w-72">
                  <span className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-white" />
                  <span className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-white" />
                  <span className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-white" />
                  <span className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-white" />
                </div>
              ) : (
                <div className="relative h-72 w-72">
                  <span className="absolute left-0 top-0 h-10 w-10 rounded-tl-[1.75rem] border-l-2 border-t-2 border-white" />
                  <span className="absolute right-0 top-0 h-10 w-10 rounded-tr-[1.75rem] border-r-2 border-t-2 border-white" />
                  <span className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-[1.75rem] border-b-2 border-l-2 border-white" />
                  <span className="absolute bottom-0 right-0 h-10 w-10 rounded-br-[1.75rem] border-b-2 border-r-2 border-white" />
                </div>
              )}
            </div>
            {mode === 'barcode' && isFetching ? (
              <p className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-24 text-center text-sm text-white/90">
                Поиск продукта…
              </p>
            ) : null}
          </>
        )}
      </div>

      {nativeMlKit ? (
        <NativeMlKitBarcodeScan
          videoRef={videoRef}
          active={nativeBarcodeActive}
          onScan={handleScan}
        />
      ) : (
        <LiveBarcodeScan
          videoRef={videoRef}
          active={barcodeDecodeActive}
          onScan={handleScan}
        />
      )}

      {/* Fixed chrome: mode toggle + controls always same height (no jump on switch). */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-5 px-6"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <div
          className={cn(
            'flex rounded-full bg-black/55 p-1 text-sm font-medium',
            barcodeOnly && 'hidden',
          )}
        >
          <button
            type="button"
            onClick={() => handleModeChange('food')}
            className={cn(
              'rounded-full px-5 py-2 transition-colors',
              mode === 'food' ? 'bg-white text-black' : 'text-white/80',
            )}
          >
            Еда
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('barcode')}
            className={cn(
              'rounded-full px-5 py-2 transition-colors',
              mode === 'barcode' ? 'bg-white text-black' : 'text-white/80',
            )}
          >
            Штрихкод
          </button>
        </div>

        <div className="flex w-full max-w-sm flex-col items-center gap-10">
          <button
            type="button"
            onClick={() => void handlePenCapture()}
            disabled={mode === 'barcode' || Boolean(cameraError) || capturing}
            aria-hidden={mode === 'barcode'}
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full bg-white text-black disabled:opacity-40',
              mode === 'barcode' && 'invisible pointer-events-none',
            )}
            aria-label="Сфотографировать с описанием"
          >
            <PenLine className="h-6 w-6" />
          </button>

          <div className="flex w-full items-center justify-between">
            <button
              type="button"
              onClick={() => void toggleTorch()}
              disabled={torchDisabled}
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full bg-black/45',
                torchDisabled && 'opacity-40',
              )}
              aria-label={torchOn ? 'Выключить вспышку' : 'Включить вспышку'}
            >
              {torchOn ? (
                <Zap className="h-5 w-5" />
              ) : (
                <ZapOff className="h-5 w-5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleShutter()}
              disabled={Boolean(cameraError) || capturing}
              className="flex items-center justify-center rounded-full border-4 border-white/80 bg-white disabled:opacity-40"
              style={{ height: '4.5rem', width: '4.5rem' }}
              aria-label={
                mode === 'barcode' ? 'Распознать штрихкод' : 'Сфотографировать'
              }
              aria-busy={capturing}
            >
              <span
                className={cn(
                  'h-14 w-14 rounded-full bg-white transition-opacity',
                  capturing && 'opacity-50',
                )}
              />
            </button>

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={capturing}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 disabled:opacity-40"
              aria-label="Галерея"
            >
              <ImageIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleGalleryChange}
        className="hidden"
        aria-label="Выбор из галереи"
      />
    </div>
  );
}
