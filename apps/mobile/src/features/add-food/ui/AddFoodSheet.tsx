import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageIcon, Camera, PenLine, ArrowLeft, Star } from 'lucide-react';
import { BottomSheet, Button, Textarea } from '@/shared/ui';
import { useSaveMeal } from '@/features/save-meal';

export interface AddFoodSheetProps {
  open: boolean;
  onClose: () => void;
}

type SheetMode = 'menu' | 'describe';

export function AddFoodSheet({ open, onClose }: AddFoodSheetProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<SheetMode>('menu');
  const [text, setText] = useState('');
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const submitFood = useSaveMeal();

  const handleClose = () => {
    setMode('menu');
    setText('');
    onClose();
  };

  const handleImagesSelect = (files: File[]) => {
    if (files.length === 0) return;
    handleClose();
    void submitFood(
      files.length === 1 ? { image: files[0] } : { images: files },
    );
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files ?? []);
    if (files.length > 0) {
      handleImagesSelect(files);
      e.currentTarget.value = '';
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) {
      handleImagesSelect([file]);
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

  const handleBackClick = () => {
    setMode('menu');
    setText('');
  };

  const handleSubmitDescription = () => {
    if (text.trim()) {
      const description = text.trim();
      handleClose();
      void submitFood({ description });
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
            <h2 className="text-lg font-semibold text-foreground">Добавить еду</h2>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12"
                onClick={handleGalleryClick}
              >
                <ImageIcon className="h-5 w-5 text-emerald-600" />
                <span>Галерея</span>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12"
                onClick={handleCameraClick}
              >
                <Camera className="h-5 w-5 text-emerald-600" />
                <span>Камера</span>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12"
                onClick={handleDescribeClick}
              >
                <PenLine className="h-5 w-5 text-emerald-600" />
                <span>Описать</span>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12"
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
              aria-label="Выбор из галереи (можно несколько ракурсов)"
            />

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraChange}
              className="hidden"
              aria-label="Съёмка камерой"
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
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
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
