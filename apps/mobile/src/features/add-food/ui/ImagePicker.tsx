import { useRef } from 'react';
import { Camera, ImageIcon } from 'lucide-react';
import { Button } from '@/shared/ui';

interface ImagePickerProps {
  onImageSelect: (file: File) => void;
}

export function ImagePicker({ onImageSelect }: ImagePickerProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelect(file);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      <button
        type="button"
        className="w-full h-64 border-2 border-dashed border-muted-foreground/30 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
        onClick={() => galleryInputRef.current?.click()}
      >
        <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-emerald-600" />
        </div>
        <div className="text-center px-4">
          <p className="font-medium text-foreground">Tap to select a photo</p>
          <p className="text-sm text-muted-foreground mt-1">JPG, PNG, HEIC supported</p>
        </div>
      </button>

      {/* Gallery input — no capture */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Camera input — capture environment */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex gap-3 w-full">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => galleryInputRef.current?.click()}
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          Gallery
        </Button>
        <Button
          className="flex-1"
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera className="h-4 w-4 mr-2" />
          Camera
        </Button>
      </div>
    </div>
  );
}
