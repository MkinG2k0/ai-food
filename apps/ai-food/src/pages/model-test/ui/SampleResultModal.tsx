import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { NutritionResult } from '@ai-food/shared-types';
import { FoodMacrosBadges, formatItemGrams } from '@/entities/meal';
import {
  aiFoodUrl,
  formatPct,
  type FoodBenchmark,
} from '@/features/model-test';
import { NutritionCard } from '@/widgets/nutrition-card';
import { Badge, Button, Card, CardContent } from '@/shared/ui';

export interface SampleResultModalProps {
  open: boolean;
  onClose: () => void;
  result: NutritionResult | null;
  benchmark: FoodBenchmark | null;
  modelLabel: string;
  runIndex: number;
  accuracy: number | null;
  imageSrc: string | null;
}

export function SampleResultModal({
  open,
  onClose,
  result,
  benchmark,
  modelLabel,
  runIndex,
  accuracy,
  imageSrc,
}: SampleResultModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && result ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-background shadow-lg sm:rounded-2xl"
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'tween', duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-label="Детали ответа модели"
          >
            <header className="flex shrink-0 items-center gap-2 border-b px-4 py-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold">
                  {result.foodName || benchmark?.name || 'Ответ модели'}
                </h2>
                <p className="truncate text-xs text-muted-foreground">
                  {modelLabel} · прогон {runIndex}
                  {accuracy != null ? ` · ${formatPct(accuracy)}` : ''}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </Button>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt=""
                  className="aspect-[4/3] w-full rounded-xl object-cover"
                />
              ) : null}

              {benchmark ? (
                <p className="text-xs text-muted-foreground">
                  Эталон: {benchmark.name} · {benchmark.reference.calories} ккал
                  / Б {benchmark.reference.protein} / Ж{' '}
                  {benchmark.reference.fat} / У {benchmark.reference.carbs}
                  {benchmark.classificationLabel
                    ? ` · class: ${benchmark.classificationLabel}`
                    : ''}
                </p>
              ) : null}

              <NutritionCard result={result} />

              <div className="flex flex-wrap gap-2 text-xs">
                {result.totalGrams != null ? (
                  <Badge variant="outline">{Math.round(result.totalGrams)} г</Badge>
                ) : null}
                {result.healthiness != null ? (
                  <Badge variant="outline">
                    полезность {result.healthiness}/10
                  </Badge>
                ) : null}
                {result.confidence != null ? (
                  <Badge variant="outline">
                    уверенность {Math.round(result.confidence * 100)}%
                  </Badge>
                ) : null}
                {result.portionReference ? (
                  <Badge variant="outline">{result.portionReference}</Badge>
                ) : null}
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Состав</h3>
                {result.items.length === 0 ? (
                  <p className="py-2 text-center text-sm text-muted-foreground">
                    Нет ингредиентов
                  </p>
                ) : (
                  result.items.map((item, index) => (
                    <Card key={`${item.name}-${index}`}>
                      <CardContent className="space-y-2 py-3">
                        <div className="flex items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm font-medium">
                            {item.name}
                          </p>
                          {item.grams != null ? (
                            <Badge variant="outline" className="shrink-0">
                              {formatItemGrams(item.grams)} г
                            </Badge>
                          ) : null}
                        </div>
                        <FoodMacrosBadges
                          density="compact"
                          calories={item.calories}
                          protein={item.protein}
                          fat={item.fat}
                          carbs={item.carbs}
                          fiber={item.fiber ?? 0}
                        />
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {result.healthinessReason || result.confidenceReason ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  {result.healthinessReason ? (
                    <p>
                      <span className="font-medium text-foreground">
                        Полезность:{' '}
                      </span>
                      {result.healthinessReason}
                    </p>
                  ) : null}
                  {result.confidenceReason ? (
                    <p>
                      <span className="font-medium text-foreground">
                        Уверенность:{' '}
                      </span>
                      {result.confidenceReason}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {result.disclaimers && result.disclaimers.length > 0 ? (
                <div className="space-y-1">
                  <h3 className="font-semibold text-foreground">Замечания</h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {result.disclaimers.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

export function benchmarkImageSrc(benchmark: FoodBenchmark): string {
  return aiFoodUrl(benchmark.imageFiles[0] ?? '');
}

export function findBenchmark(
  foodId: string,
  benchmarks: FoodBenchmark[],
): FoodBenchmark | null {
  return benchmarks.find((b) => b.id === foodId) ?? null;
}
