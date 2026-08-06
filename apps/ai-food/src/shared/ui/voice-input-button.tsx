import * as React from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib';
import { useSpeechToText } from '@/shared/lib/useSpeechToText';

export interface VoiceInputButtonProps {
  onTranscript: (text: string, meta: { isFinal: boolean }) => void;
  onListeningChange?: (listening: boolean) => void;
  language?: string;
  className?: string;
  disabled?: boolean;
}

export function VoiceInputButton({
  onTranscript,
  onListeningChange,
  language,
  className,
  disabled,
}: VoiceInputButtonProps) {
  const { supported, listening, toggle } = useSpeechToText({
    language,
    onTranscript,
  });

  React.useEffect(() => {
    onListeningChange?.(listening);
  }, [listening, onListeningChange]);

  if (!supported) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      onClick={() => void toggle()}
      className={cn(
        'h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground',
        listening && 'text-emerald-600 hover:text-emerald-700',
        className,
      )}
      aria-label={listening ? 'Остановить запись' : 'Голосовой ввод'}
      aria-pressed={listening}
    >
      {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
    </Button>
  );
}
