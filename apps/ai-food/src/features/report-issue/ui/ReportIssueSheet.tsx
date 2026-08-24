import { useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { compressImageForAi, cn, fileToImageDataUrl } from '@/shared/lib';
import { BottomSheet, Button, TextareaWithVoice } from '@/shared/ui';
import { pickSupportReportImagesFromGallery } from '../lib/pickSupportReportImages';
import { submitSupportReportApi } from '../api/submitSupportReportApi';
import {
  DEFAULT_SUPPORT_REPORT_TYPE,
  MAX_SUPPORT_REPORT_IMAGES,
  MAX_SUPPORT_REPORT_MESSAGE_LENGTH,
  SUPPORT_REPORT_TYPE_LABELS,
  SUPPORT_REPORT_TYPES,
  type SupportReportType,
} from '../model/supportReportTypes';

export interface ReportIssueSheetProps {
  open: boolean;
  onClose: () => void;
}

export function ReportIssueSheet({ open, onClose }: ReportIssueSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<SupportReportType>(DEFAULT_SUPPORT_REPORT_TYPE);
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<Array<{ id: string; preview: string }>>(
    [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setType(DEFAULT_SUPPORT_REPORT_TYPE);
    setMessage('');
    setImages([]);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handlePickImages = () => {
    if (Capacitor.isNativePlatform()) {
      void handleNativePickImages();
      return;
    }
    inputRef.current?.click();
  };

  const appendImageFiles = async (files: File[]) => {
    if (files.length === 0) return;

    const remaining = MAX_SUPPORT_REPORT_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(`Можно прикрепить не больше ${MAX_SUPPORT_REPORT_IMAGES} фото`);
      return;
    }

    const limited = files.slice(0, remaining);
    const next = await Promise.all(
      limited.map(async (file) => {
        const compressed = await compressImageForAi(file, {
          maxSide: 1280,
          quality: 0.75,
        });
        const preview = await fileToImageDataUrl(compressed);
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          preview,
        };
      }),
    );
    setImages((prev) => [...prev, ...next]);
  };

  const handleNativePickImages = async () => {
    const remaining = MAX_SUPPORT_REPORT_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(`Можно прикрепить не больше ${MAX_SUPPORT_REPORT_IMAGES} фото`);
      return;
    }

    try {
      const files = await pickSupportReportImagesFromGallery(remaining);
      await appendImageFiles(files);
    } catch {
      toast.error('Не удалось выбрать фото');
    }
  };

  const handleFiles = async (fileList: FileList | null | undefined) => {
    if (!fileList?.length) return;

    try {
      await appendImageFiles(Array.from(fileList));
    } catch {
      toast.error('Не удалось обработать фото');
    } finally {
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error('Опишите проблему');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitSupportReportApi({
        type,
        message: trimmed,
        images: images.map((item) => item.preview),
      });
      toast.success('Обращение отправлено');
      resetForm();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Не удалось отправить обращение',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <div className="w-full space-y-5 px-2 py-1">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Сообщить об ошибке
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Опишите проблему — мы увидим обращение в админке и сможем помочь.
          </p>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Тип проблемы</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as SupportReportType)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base"
          >
            {SUPPORT_REPORT_TYPES.map((option) => (
              <option key={option} value={option}>
                {SUPPORT_REPORT_TYPE_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Описание</span>
          <TextareaWithVoice
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={MAX_SUPPORT_REPORT_MESSAGE_LENGTH}
            placeholder="Что произошло? Что вы ожидали?"
            rows={5}
          />
          <p className="text-xs text-muted-foreground tabular-nums">
            {message.length}/{MAX_SUPPORT_REPORT_MESSAGE_LENGTH}
          </p>
        </label>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Фото</span>
            <span className="text-xs text-muted-foreground">
              до {MAX_SUPPORT_REPORT_IMAGES} шт.
            </span>
          </div>

          {images.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="relative h-20 w-20 overflow-hidden rounded-lg border border-border"
                >
                  <img
                    src={image.preview}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Удалить фото"
                    className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground shadow"
                    onClick={() =>
                      setImages((prev) => prev.filter((item) => item.id !== image.id))
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <Button
            type="button"
            variant="outline"
            className="w-full justify-center gap-2"
            disabled={images.length >= MAX_SUPPORT_REPORT_IMAGES || isSubmitting}
            onClick={handlePickImages}
          >
            <ImagePlus className="h-4 w-4" />
            Прикрепить фото
          </Button>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => void handleFiles(event.target.files)}
          />
        </div>

        <Button
          className={cn('w-full', isSubmitting && 'pointer-events-none')}
          disabled={isSubmitting}
          onClick={() => void handleSubmit()}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Отправка…
            </>
          ) : (
            'Отправить'
          )}
        </Button>
      </div>
    </BottomSheet>
  );
}
