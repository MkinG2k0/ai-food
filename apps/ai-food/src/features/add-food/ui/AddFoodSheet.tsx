import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ImageIcon,
  Camera,
  PenLine,
  ArrowLeft,
  Star,
  Keyboard,
} from 'lucide-react';
import { toast } from 'sonner';
import { BottomSheet, Button, TextareaWithVoice } from '@/shared/ui';
import { useSaveMeal } from '@/features/save-meal';

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

export function AddFoodSheet({
  open,
  onClose,
  autoAction = null,
  onAutoActionConsumed,
}: AddFoodSheetProps) {
  const navigate = useNavigate();
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
  }, [open, autoAction]);

  const resetSheetState = () => {
    setMode('menu');
    setText('');
  };

  const handleClose = () => {
    resetSheetState();
    onClose();
  };

  const handleImagesSelect = (files: File[]) => {
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
    handleClose();
    navigate('/scan');
  };

  const handleDescribeClick = () => {
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
              <Button
                variant="outline"
                className="h-12 w-full justify-start gap-3"
                onClick={handleCameraClick}
              >
                <Camera className="h-5 w-5 text-emerald-600" />
                <span>Камера / Штрихкод</span>
              </Button>

              <Button
                variant="outline"
                className="h-12 w-full justify-start gap-3"
                onClick={handleGalleryClick}
              >
                <ImageIcon className="h-5 w-5 text-emerald-600" />
                <span>Галерея</span>
              </Button>

              <Button
                variant="outline"
                className="h-12 w-full justify-start gap-3"
                onClick={handleDescribeClick}
              >
                <PenLine className="h-5 w-5 text-emerald-600" />
                <span>Описать</span>
              </Button>

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
                disabled={!text.trim()}
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Отправить
              </Button>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
