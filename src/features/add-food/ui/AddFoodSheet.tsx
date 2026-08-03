import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ImageIcon,
  Camera,
  PenLine,
  ArrowLeft,
  Star,
  Keyboard,
  ScanBarcode,
} from 'lucide-react';
import { toast } from 'sonner';
import { takePhotoAsFile } from '@/shared/lib';
import { BottomSheet, Button, Textarea } from '@/shared/ui';
import { useSaveMeal } from '@/features/save-meal';

/** Max photos per meal analysis — more angles rarely help. */
export const MAX_FOOD_IMAGES = 3;

export interface AddFoodSheetProps {
  open: boolean;
  onClose: () => void;
}

type SheetMode = 'menu' | 'describe' | 'photo-describe';

export function AddFoodSheet({ open, onClose }: AddFoodSheetProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<SheetMode>('menu');
  const [text, setText] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const submitFood = useSaveMeal();

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const resetSheetState = () => {
    setMode('menu');
    setText('');
    setPendingPhoto(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
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

  const capturePhoto = async (): Promise<File | null> => {
    try {
      return await takePhotoAsFile();
    } catch {
      toast.error('Не удалось открыть камеру');
      return null;
    }
  };

  const handleCameraClick = async () => {
    const file = await capturePhoto();
    if (file) handleImagesSelect([file]);
  };

  const handleCameraDescribeClick = async () => {
    const file = await capturePhoto();
    if (!file) return;
    setPendingPhoto(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setText('');
    setMode('photo-describe');
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files ?? []);
    if (files.length > 0) {
      handleImagesSelect(files);
      e.currentTarget.value = '';
    }
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

  const handleBarcodeClick = () => {
    handleClose();
    navigate('/barcode');
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

  const handleSubmitPhotoDescribe = () => {
    if (!pendingPhoto || !text.trim()) return;
    const description = text.trim();
    const image = pendingPhoto;
    handleClose();
    void submitFood({ image, description });
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (mode === 'photo-describe') {
        handleSubmitPhotoDescribe();
      } else {
        handleSubmitDescription();
      }
    }
  };

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <div className="w-full space-y-4 px-4 py-6">
        {mode === 'menu' ? (
          <>
            <h2 className="text-lg font-semibold text-foreground">Добавить еду</h2>
            <div className="space-y-3">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="h-12 flex-1 justify-start gap-3"
                  onClick={handleCameraClick}
                >
                  <Camera className="h-5 w-5 shrink-0 text-emerald-600" />
                  <span>Камера</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-12 flex-1 justify-start gap-3"
                  onClick={handleCameraDescribeClick}
                >
                  <PenLine className="h-5 w-5 shrink-0 text-emerald-600" />
                  <span className="text-left text-sm leading-tight">
                    Камера + Описание
                  </span>
                </Button>
              </div>

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
                onClick={handleBarcodeClick}
              >
                <ScanBarcode className="h-5 w-5 text-emerald-600" />
                <span>Штрих код</span>
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
        ) : mode === 'photo-describe' ? (
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
              <h2 className="text-lg font-semibold text-foreground">
                Камера + Описание
              </h2>
            </div>

            <div className="space-y-4">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Снимок блюда"
                  className="h-48 w-full rounded-xl object-cover"
                />
              ) : null}

              <Textarea
                placeholder="Напр.: куриный салат с рисом, без соуса"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleDescriptionKeyDown}
                className="min-h-28 resize-none"
                autoFocus
              />

              <Button
                onClick={handleSubmitPhotoDescribe}
                disabled={!text.trim() || !pendingPhoto}
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Отправить
              </Button>
            </div>
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
              <Textarea
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
