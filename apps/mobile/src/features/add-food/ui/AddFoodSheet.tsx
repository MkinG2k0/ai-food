import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageIcon, Camera, PenLine, ArrowLeft } from 'lucide-react';
import { BottomSheet, Button, Textarea } from '@/shared/ui';
import { useImageStore } from '../model/useImageStore';

export interface AddFoodSheetProps {
  open: boolean;
  onClose: () => void;
}

export function AddFoodSheet({ open, onClose }: AddFoodSheetProps) {
  const [mode, setMode] = useState<'menu' | 'describe'>('menu');
  const [text, setText] = useState('');
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { setImage, setDescription } = useImageStore();

  const handleClose = () => {
    setMode('menu');
    setText('');
    onClose();
  };

  const handleImageSelect = (file: File) => {
    setImage(file);
    handleClose();
    navigate('/result');
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleDescribeClick = () => {
    setMode('describe');
  };

  const handleBackClick = () => {
    setMode('menu');
    setText('');
  };

  const handleSubmitDescription = () => {
    if (text.trim()) {
      setDescription(text);
      handleClose();
      navigate('/result');
    }
  };

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <div className="w-full space-y-4 px-4 py-6">
        {mode === 'menu' ? (
          <>
            <h2 className="text-lg font-semibold text-foreground">Add Food</h2>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12"
                onClick={handleGalleryClick}
              >
                <ImageIcon className="h-5 w-5 text-emerald-600" />
                <span>Gallery</span>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12"
                onClick={handleCameraClick}
              >
                <Camera className="h-5 w-5 text-emerald-600" />
                <span>Camera</span>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12"
                onClick={handleDescribeClick}
              >
                <PenLine className="h-5 w-5 text-emerald-600" />
                <span>Describe</span>
              </Button>
            </div>

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleGalleryChange}
              className="hidden"
              aria-label="Gallery input"
            />

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraChange}
              className="hidden"
              aria-label="Camera input"
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
              <h2 className="text-lg font-semibold text-foreground">Describe</h2>
            </div>

            <div className="space-y-4">
              <Textarea
                placeholder="e.g. Grilled chicken salad with rice"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-32 resize-none"
              />

              <Button
                onClick={handleSubmitDescription}
                disabled={!text.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Submit
              </Button>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
