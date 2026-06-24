import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useImageStore } from '@/features/add-food/model/useImageStore';
import { useAnalyzeFood } from '@/features/analyze-food/model/useAnalyzeFood';
import { useSaveMeal } from '@/features/save-meal/model/useSaveMeal';
import { NutritionCard } from '@/widgets/nutrition-card/ui/NutritionCard';
import { Button, Skeleton } from '@/shared/ui';

export function ResultPage() {
  const navigate = useNavigate();
  const { selectedImage, previewUrl } = useImageStore();
  const { data, isLoading, isError } = useAnalyzeFood(selectedImage);
  const saveMeal = useSaveMeal();

  useEffect(() => {
    if (!selectedImage) navigate('/add', { replace: true });
  }, [selectedImage, navigate]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center px-4 py-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate('/add')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold ml-2">Analysis Result</h1>
      </header>

      <main className="flex-1 px-4 py-6 space-y-4 max-w-lg mx-auto w-full">
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Food preview"
            className="w-full h-48 object-cover rounded-xl"
          />
        )}

        {isLoading && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" />
              <span className="text-sm text-muted-foreground">Analyzing your food…</span>
            </div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}

        {isError && (
          <div className="text-center py-8">
            <p className="font-medium text-destructive">Analysis failed</p>
            <p className="text-sm text-muted-foreground mt-1">Please try again</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/add')}
            >
              Retake Photo
            </Button>
          </div>
        )}

        {data && (
          <>
            <NutritionCard result={data.result} />
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/add')}
              >
                Retake
              </Button>
              <Button className="flex-1" onClick={() => saveMeal(data.result)}>
                Save to Diary
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
