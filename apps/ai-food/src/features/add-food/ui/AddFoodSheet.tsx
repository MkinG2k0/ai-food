import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ImageIcon,
  Camera,
  PenLine,
  ArrowLeft,
  Star,
  Keyboard,
  Lock,
  ScanBarcode,
} from 'lucide-react';
import { toast } from 'sonner';
import { BottomSheet, Button, TextareaWithVoice } from '@/shared/ui';
import { cn } from '@/shared/lib';
import { useSaveMeal } from '@/features/save-meal';
import { isGenerationQuotaAvailable, useUsage } from '@/features/auth';
import { showGenerationQuotaPaywall } from '@/features/billing';

/** Max photos per meal analysis — more angles rarely help. */
export const MAX_FOOD_IMAGES = 3;

export type AddFoodAutoAction = 'gallery' | 'describe';

export interface AddFoodSheetProps {
  open: boolean;
  onClose: () => void;
  /** When sheet opens, run gallery picker or switch to describe once. */
  autoAction?: AddFoodAutoAction | null;
  onAutoActionConsumed?: () => void;
}

type SheetMode = 'menu' | 'describe';

interface GenerationActionButtonProps {
  locked: boolean;
  onLocked: () => void;
  onClick: () => void;
  icon: typeof Camera;
  label: string;
}

function GenerationActionButton({
  locked,
  onLocked,
  onClick,
  icon: Icon,
  label,
}: GenerationActionButtonProps) {
  return (
    <Button
      variant="outline"
      className={cn(
        'h-12 w-full justify-start gap-3',
        locked && 'opacity-70',
      )}
      onClick={locked ? onLocked : onClick}
      aria-label={locked ? `${label} — лимит генераций исчерпан` : label}
    >
      <Icon
        className={cn(
          'h-5 w-5',
          locked ? 'text-muted-foreground' : 'text-emerald-600',
        )}
      />
      <span className="flex-1 text-left">{label}</span>
      {locked ? (
        <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
    </Button>
  );
}

export function AddFoodSheet({
  open,
  onClose,
  autoAction = null,
  onAutoActionConsumed,
}: AddFoodSheetProps) {
  const navigate = useNavigate();
  const { data: usage } = useUsage();
  const generationLocked = !isGenerationQuotaAvailable(usage);
  const [mode, setMode] = useState<SheetMode>('menu');
  const [text, setText] = useState('');
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const submitFood = useSaveMeal();
  const autoActionRef = useRef(autoAction);
  autoActionRef.current = autoAction;
  const onAutoActionConsumedRef = useRef(onAutoActionConsumed);
  onAutoActionConsumedRef.current = onAutoActionConsumed;

  useEffect(() => {
    if (!open) {
      setMode('menu');
      setText('');
    }
  }, [open]);

  useEffect(() => {
    if (!open || !autoAction) return;

    if (generationLocked) {
      onAutoActionConsumedRef.current?.();
      setMode('menu');
      setText('');
      onClose();
      showGenerationQuotaPaywall(navigate);
      return;
    }

    if (autoAction === 'gallery') {
      // Defer so the hidden input is mounted with the menu mode.
      const id = window.setTimeout(() => {
        galleryInputRef.current?.click();
        onAutoActionConsumedRef.current?.();
      }, 0);
      return () => window.clearTimeout(id);
    }

    if (autoAction === 'describe') {
      setMode('describe');
      onAutoActionConsumedRef.current?.();
    }
  }, [open, autoAction, generationLocked, navigate, onClose]);

  const resetSheetState = () => {
    setMode('menu');
    setText('');
  };

  const handleClose = () => {
    resetSheetState();
    onClose();
  };

  const handleGenerationLocked = () => {
    handleClose();
    showGenerationQuotaPaywall(navigate);
  };

  const handleImagesSelect = (files: File[]) => {
    if (generationLocked) {
      handleGenerationLocked();
      return;
    }
    if (files.length === 0) return;
    if (files.length > MAX_FOOD_IMAGES) {
      toast.message(`Можно выбрать не больше ${MAX_FOOD_IMAGES} фото`);
    }
    const limited = files.slice(0, MAX_FOOD_IMAGES);
    handleClose();
    void submitFood(
      limited.length === 1 ? { image: limited[0] } : { images: limited },
    );
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files ?? []);
    if (files.length > 0) {
      handleImagesSelect(files);
      e.currentTarget.value = '';
    }
  };

  const handleCameraClick = () => {
    if (generationLocked) return;
    handleClose();
    navigate('/scan');
  };

  const handleBarcodeClick = () => {
    handleClose();
    navigate('/scan?mode=barcode&barcodeOnly=1');
  };

  const handleDescribeClick = () => {
    if (generationLocked) return;
    setMode('describe');
  };

  const handleFavoritesClick = () => {
    handleClose();
    navigate('/favorites');
  };

  const handleManualClick = () => {
    handleClose();
    navigate('/manual-entry');
  };

  const handleBackClick = () => {
    resetSheetState();
  };

  const handleSubmitDescription = () => {
    if (generationLocked) {
      handleGenerationLocked();
      return;
    }
    if (text.trim()) {
      const description = text.trim();
      handleClose();
      void submitFood({ description });
    }
  };

  const handleDescriptionKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitDescription();
    }
  };

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <div className="w-full space-y-4 px-4 py-6">
        {mode === 'menu' ? (
          <>
            <h2 className="text-lg font-semibold text-foreground">
              Добавить еду
            </h2>
            <div className="space-y-3">
              <GenerationActionButton
                locked={generationLocked}
                onLocked={handleGenerationLocked}
                onClick={handleCameraClick}
                icon={Camera}
                label="Камера / Штрихкод"
              />

              <GenerationActionButton
                locked={generationLocked}
                onLocked={handleGenerationLocked}
                onClick={handleGalleryClick}
                icon={ImageIcon}
                label="Галерея"
              />

              <GenerationActionButton
                locked={generationLocked}
                onLocked={handleGenerationLocked}
                onClick={handleDescribeClick}
                icon={PenLine}
                label="Описать"
              />

              {generationLocked ? (
                <Button
                  variant="outline"
                  className="h-12 w-full justify-start gap-3"
                  onClick={handleBarcodeClick}
                >
                  <ScanBarcode className="h-5 w-5 text-emerald-600" />
                  <span className="flex-1 text-left">Штрихкод</span>
                </Button>
              ) : null}

              <Button
                variant="outline"
                className="h-12 w-full justify-start gap-3"
                onClick={handleManualClick}
              >
                <Keyboard className="h-5 w-5 text-emerald-600" />
                <span>Вручную</span>
              </Button>

              <Button
                variant="outline"
                className="h-12 w-full justify-start gap-3"
                onClick={handleFavoritesClick}
              >
                <Star className="h-5 w-5 text-emerald-600" />
                <span>Избранное</span>
              </Button>
            </div>

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleGalleryChange}
              className="hidden"
              aria-label="Выбор из галереи (до 3 ракурсов)"
            />
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackClick}
                className="px-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-semibold text-foreground">Описать</h2>
            </div>

            <div className="space-y-4">
              <TextareaWithVoice
                placeholder="Напр.: куриный салат с рисом"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleDescriptionKeyDown}
                className="min-h-32 resize-none"
              />

              <Button
                onClick={handleSubmitDescription}
                disabled={!text.trim() || generationLocked}
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {generationLocked ? (
                  <span className="inline-flex items-center gap-2">
                    <Lock className="h-4 w-4" aria-hidden />
                    Лимит исчерпан
                  </span>
                ) : (
                  'Отправить'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
