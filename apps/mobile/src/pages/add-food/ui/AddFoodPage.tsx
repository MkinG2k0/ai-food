import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ImagePicker } from '@/features/add-food/ui/ImagePicker';
import { useImageStore } from '@/features/add-food/model/useImageStore';
import { Button } from '@/shared/ui';

export function AddFoodPage() {
  const navigate = useNavigate();
  const setImage = useImageStore((s) => s.setImage);

  const handleImageSelect = (file: File) => {
    setImage(file);
    navigate('/result');
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center px-4 py-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold ml-2">Add Food</h1>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <ImagePicker onImageSelect={handleImageSelect} />
      </main>
    </div>
  );
}
