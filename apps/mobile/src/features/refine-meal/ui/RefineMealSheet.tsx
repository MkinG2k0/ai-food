import { useState } from 'react';
import { toast } from 'sonner';
import type { ApiError } from '@ai-food/shared-types';
import { BottomSheet, Button, Textarea } from '@/shared/ui';
import { useRefineMeal } from '../model/useRefineMeal';

export interface RefineMealSheetProps {
  open: boolean;
  onClose: () => void;
  mealId: string;
}

export function RefineMealSheet({ open, onClose, mealId }: RefineMealSheetProps) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const refine = useRefineMeal();

  const handleClose = () => {
    if (isSubmitting) return;
    setText('');
    onClose();
  };

  const handleSubmit = async () => {
    const correction = text.trim();
    if (!correction || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await refine(mealId, correction);
      toast.success('Приём обновлён');
      setText('');
      onClose();
    } catch (error) {
      const apiError = error as Partial<ApiError>;
      toast.error(apiError.message ?? 'Не удалось обновить приём. Попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <div className="w-full space-y-4 px-2 py-2">
        <h2 className="text-lg font-semibold text-foreground">Дополнить</h2>

        <Textarea
          placeholder="Напр.: съел половину / котлета не куриная а мясная"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isSubmitting}
          className="min-h-32 resize-none"
        />

        <Button
          onClick={() => void handleSubmit()}
          disabled={!text.trim() || isSubmitting}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isSubmitting ? 'Применяем…' : 'Применить'}
        </Button>
      </div>
    </BottomSheet>
  );
}
