import * as React from 'react';
import { Textarea, type TextareaProps } from '@/shared/ui/textarea';
import { cn } from '@/shared/lib';
import { VoiceInputButton } from '@/shared/ui/voice-input-button';

export interface TextareaWithVoiceProps extends TextareaProps {
  /** When true, interim results replace the draft suffix instead of stacking. */
  replaceWhileListening?: boolean;
}

/**
 * Textarea with a mic button. Voice appends (or replaces interim) into the value
 * via the normal onChange contract.
 */
export const TextareaWithVoice = React.forwardRef<
  HTMLTextAreaElement,
  TextareaWithVoiceProps
>(function TextareaWithVoice(
  {
    className,
    value,
    onChange,
    disabled,
    replaceWhileListening = true,
    ...props
  },
  ref,
) {
  const committedRef = React.useRef(typeof value === 'string' ? value : '');
  const listeningDraftRef = React.useRef(false);

  React.useEffect(() => {
    if (!listeningDraftRef.current && typeof value === 'string') {
      committedRef.current = value;
    }
  }, [value]);

  const emit = (next: string) => {
    onChange?.({
      target: { value: next },
      currentTarget: { value: next },
    } as React.ChangeEvent<HTMLTextAreaElement>);
  };

  const handleTranscript = (text: string, meta: { isFinal: boolean }) => {
    const base = committedRef.current.trimEnd();
    const next = base ? `${base} ${text}` : text;
    if (meta.isFinal || !replaceWhileListening) {
      committedRef.current = next;
      listeningDraftRef.current = false;
      emit(next);
      return;
    }

    listeningDraftRef.current = true;
    emit(next);
  };

  const handleListeningChange = (listening: boolean) => {
    if (!listening && listeningDraftRef.current && typeof value === 'string') {
      committedRef.current = value;
      listeningDraftRef.current = false;
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => {
          listeningDraftRef.current = false;
          committedRef.current = e.target.value;
          onChange?.(e);
        }}
        disabled={disabled}
        className={cn('pr-12', className)}
        {...props}
      />
      <VoiceInputButton
        disabled={disabled}
        onTranscript={handleTranscript}
        onListeningChange={handleListeningChange}
        className="absolute bottom-2 right-2"
      />
    </div>
  );
});
