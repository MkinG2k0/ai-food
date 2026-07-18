import { Fragment, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import {
  FOOD_BENCHMARKS,
  formatMacro,
  formatPct,
  useModelTest,
  type ModelTestRow,
} from '@/features/model-test';
import { Button } from '@/shared/ui';

function statusLabel(status: ModelTestRow['status']): string {
  switch (status) {
    case 'idle':
      return '—';
    case 'running':
      return '…';
    case 'done':
      return 'OK';
    case 'error':
      return 'Err';
  }
}

function accuracyClass(accuracy: number | null): string {
  if (accuracy == null) return 'text-muted-foreground';
  if (accuracy >= 85) return 'text-emerald-600 font-semibold';
  if (accuracy >= 70) return 'text-amber-600 font-semibold';
  return 'text-destructive font-semibold';
}

export function ModelTestPage() {
  const navigate = useNavigate();
  const { rows, runStatus, progressLabel, runTest, runSingleModel, benchmarks } =
    useModelTest();
  const [expanded, setExpanded] = useState<string | null>(null);

  const isRunning = runStatus === 'running';

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/settings')}
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Тест моделей</h1>
        <div className="ml-auto">
          <Button onClick={() => void runTest()} disabled={isRunning}>
            {isRunning ? 'Тест…' : 'Тест'}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <p className="text-sm text-muted-foreground">
          По 3 запроса на модель (по одному фото на эталон). Метрика — средняя
          точность КБЖУ: 100% − относительная ошибка по ккал/Б/Ж/У.
        </p>

        {isRunning && progressLabel ? (
          <p className="text-sm font-medium text-foreground">
            Сейчас: {progressLabel}
          </p>
        ) : null}

        <section className="rounded-lg border overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Модель</th>
                <th className="px-3 py-2 font-medium text-right">ккал</th>
                <th className="px-3 py-2 font-medium text-right">Б</th>
                <th className="px-3 py-2 font-medium text-right">Ж</th>
                <th className="px-3 py-2 font-medium text-right">У</th>
                <th className="px-3 py-2 font-medium text-right">Точность</th>
                <th className="px-3 py-2 font-medium text-center">Статус</th>
                <th className="px-3 py-2 font-medium text-right"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const open = expanded === row.model;
                const rowRunning = row.status === 'running';
                return (
                  <Fragment key={row.model}>
                    <tr
                      className="border-t hover:bg-muted/30 cursor-pointer"
                      onClick={() =>
                        setExpanded(open ? null : row.model)
                      }
                    >
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1">
                          {open ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          {row.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.avgPredicted
                          ? formatMacro(row.avgPredicted.calories, 0)
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.avgPredicted
                          ? formatMacro(row.avgPredicted.protein)
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.avgPredicted
                          ? formatMacro(row.avgPredicted.fat)
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.avgPredicted
                          ? formatMacro(row.avgPredicted.carbs)
                          : '—'}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${accuracyClass(row.accuracy)}`}
                      >
                        {row.accuracy != null ? formatPct(row.accuracy) : '—'}
                      </td>
                      <td className="px-3 py-2 text-center text-muted-foreground">
                        {statusLabel(row.status)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isRunning}
                          onClick={(e) => {
                            e.stopPropagation();
                            void runSingleModel(row.model);
                          }}
                        >
                          {rowRunning ? '…' : 'Проверить'}
                        </Button>
                      </td>
                    </tr>
                    {open ? (
                      <tr className="border-t bg-muted/20">
                        <td colSpan={8} className="px-3 py-3">
                          <div className="space-y-3">
                            {benchmarks.map((b) => {
                              const sample = row.samples.find(
                                (s) => s.foodId === b.id,
                              );
                              return (
                                <div
                                  key={b.id}
                                  className="grid gap-1 text-xs sm:grid-cols-[1fr_auto] sm:items-start"
                                >
                                  <div>
                                    <p className="font-medium text-foreground">
                                      {b.name}
                                    </p>
                                    <p className="text-muted-foreground">
                                      Эталон: {b.reference.calories} ккал / Б{' '}
                                      {b.reference.protein} / Ж{' '}
                                      {b.reference.fat} / У{' '}
                                      {b.reference.carbs}
                                    </p>
                                    {sample?.predicted ? (
                                      <p>
                                        Ответ: {formatMacro(sample.predicted.calories, 0)}{' '}
                                        ккал / Б{' '}
                                        {formatMacro(sample.predicted.protein)} / Ж{' '}
                                        {formatMacro(sample.predicted.fat)} / У{' '}
                                        {formatMacro(sample.predicted.carbs)}
                                      </p>
                                    ) : sample?.status === 'error' ? (
                                      <p className="text-destructive">
                                        {sample.errorMessage ?? 'Ошибка'}
                                      </p>
                                    ) : sample?.status === 'running' ? (
                                      <p className="text-muted-foreground">
                                        Запрос…
                                      </p>
                                    ) : (
                                      <p className="text-muted-foreground">
                                        Ещё не запускалось
                                      </p>
                                    )}
                                  </div>
                                  <p
                                    className={`tabular-nums sm:text-right ${accuracyClass(sample?.accuracy ?? null)}`}
                                  >
                                    {sample?.accuracy != null
                                      ? formatPct(sample.accuracy)
                                      : '—'}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium">Эталоны</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {FOOD_BENCHMARKS.map((b) => (
              <li key={b.id}>
                <span className="font-medium text-foreground">{b.name}</span>
                {' — '}
                {b.weightGrams} г · {b.reference.calories} ккал / Б{' '}
                {b.reference.protein} / Ж {b.reference.fat} / У{' '}
                {b.reference.carbs}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
