import { Fragment, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import {
  aiFoodUrl,
  average,
  formatMacro,
  formatPct,
  useModelTest,
  type ModelTestRow,
  type SampleResult,
} from '@/features/model-test';
import { Button } from '@/shared/ui';
import {
  SampleResultModal,
  benchmarkImageSrc,
  findBenchmark,
} from './SampleResultModal';

interface PreviewState {
  result: NonNullable<SampleResult['result']>;
  foodId: string;
  modelLabel: string;
  runIndex: number;
  accuracy: number | null;
}

function statusLabel(status: ModelTestRow['status'] | SampleResult['status']): string {
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

function foodSamplesAverage(samples: SampleResult[]): {
  predicted: { calories: number; protein: number; fat: number; carbs: number } | null;
  accuracy: number | null;
} {
  const done = samples.filter((s) => s.predicted && s.status === 'done');
  if (done.length === 0) {
    return { predicted: null, accuracy: null };
  }
  return {
    predicted: {
      calories: average(done.map((s) => s.predicted!.calories)),
      protein: average(done.map((s) => s.predicted!.protein)),
      fat: average(done.map((s) => s.predicted!.fat)),
      carbs: average(done.map((s) => s.predicted!.carbs)),
    },
    accuracy: average(
      done
        .map((s) => s.accuracy)
        .filter((v): v is number => typeof v === 'number'),
    ),
  };
}

function KbjuCells({
  value,
  empty = '—',
}: {
  value: { calories: number; protein: number; fat: number; carbs: number } | null;
  empty?: string;
}) {
  if (!value) {
    return (
      <>
        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{empty}</td>
        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{empty}</td>
        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{empty}</td>
        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{empty}</td>
      </>
    );
  }
  return (
    <>
      <td className="px-2 py-1.5 text-right tabular-nums">
        {formatMacro(value.calories, 0)}
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums">
        {formatMacro(value.protein)}
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums">
        {formatMacro(value.fat)}
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums">
        {formatMacro(value.carbs)}
      </td>
    </>
  );
}

export function ModelTestPage() {
  const navigate = useNavigate();
  const {
    rows,
    runStatus,
    progressLabel,
    runTest,
    runSingleModel,
    stopTest,
    clearTests,
    hasResults,
    benchmarks,
    benchmarksStatus,
    benchmarksError,
    runsPerFood,
  } = useModelTest();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const isRunning = runStatus === 'running';
  const totalCallsPerModel = benchmarks.length * runsPerFood;
  const canRun =
    benchmarksStatus === 'ready' && benchmarks.length > 0 && !isRunning;

  function openSample(sample: SampleResult, modelLabel: string) {
    if (!sample.result) return;
    setPreview({
      result: sample.result,
      foodId: sample.foodId,
      modelLabel,
      runIndex: sample.runIndex,
      accuracy: sample.accuracy,
    });
  }

  const previewBenchmark = preview
    ? findBenchmark(preview.foodId, benchmarks)
    : null;

  return (
    <div className="min-h-dvh bg-zinc-50">
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-zinc-50/95 px-4 pt-safe-header pb-3 backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/settings')}
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold tracking-tight">Тест моделей</h1>
        <div className="ml-auto flex items-center gap-2">
          {isRunning ? (
            <Button variant="destructive" onClick={stopTest}>
              Стоп
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={!hasResults}
                onClick={clearTests}
              >
                Очистить
              </Button>
              <Button disabled={!canRun} onClick={() => void runTest()}>
                Тест
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-4">
        <p className="text-sm text-muted-foreground">
          Эталоны КБЖУ из <code className="text-xs">nutrition_en.jsonl</code>,
          названия — из{' '}
          <code className="text-xs">classification_en.jsonl</code>, фото —{' '}
          <code className="text-xs">images/</code> (список в{' '}
          <code className="text-xs">available_images.json</code>). Результаты
          сохраняются локально.{' '}
          {benchmarksStatus === 'loading'
            ? 'Загрузка датасета…'
            : benchmarksStatus === 'error'
              ? benchmarksError
              : `${benchmarks.length} блюд × ${runsPerFood} прогона = ${totalCallsPerModel} запросов на модель.`}{' '}
          Метрика — средняя точность КБЖУ. Нажмите «ответ», чтобы открыть
          детали.
        </p>

        {progressLabel ? (
          <p className="text-sm font-medium text-foreground">
            {isRunning ? `Сейчас: ${progressLabel}` : progressLabel}
          </p>
        ) : null}

        {benchmarksStatus === 'ready' && benchmarks.length === 0 ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            Нет пересечений nutrition_en.jsonl с локальными файлами в{' '}
            <code className="text-xs">images/</code>. Добавьте фото и обновите{' '}
            <code className="text-xs">available_images.json</code>.
          </p>
        ) : null}

        <section className="rounded-lg border overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Модель</th>
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
                      onClick={() => setExpanded(open ? null : row.model)}
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
                          disabled={!canRun}
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
                        <td colSpan={4} className="px-2 py-3">
                          <div className="overflow-x-auto rounded border bg-background">
                            <table className="w-full min-w-[780px] text-xs">
                              <thead className="bg-muted/40 text-left">
                                <tr>
                                  <th className="px-2 py-1.5 font-medium">Блюдо</th>
                                  <th className="px-2 py-1.5 font-medium text-center">
                                    прогон
                                  </th>
                                  <th className="px-2 py-1.5 font-medium text-right">
                                    ккал
                                  </th>
                                  <th className="px-2 py-1.5 font-medium text-right">
                                    Б
                                  </th>
                                  <th className="px-2 py-1.5 font-medium text-right">
                                    Ж
                                  </th>
                                  <th className="px-2 py-1.5 font-medium text-right">
                                    У
                                  </th>
                                  <th className="px-2 py-1.5 font-medium text-right">
                                    Точность
                                  </th>
                                  <th className="px-2 py-1.5 font-medium text-center">
                                    Статус
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {benchmarks.map((b) => {
                                  const foodSamples = row.samples
                                    .filter((s) => s.foodId === b.id)
                                    .sort((a, c) => a.runIndex - c.runIndex);
                                  const avg = foodSamplesAverage(foodSamples);
                                  return (
                                    <Fragment key={b.id}>
                                      <tr className="border-t bg-muted/30">
                                        <td className="px-2 py-1.5 font-medium">
                                          {b.name}
                                          <span className="ml-1 font-normal text-muted-foreground">
                                            (#{b.id}
                                            {b.imageFiles.length > 1
                                              ? ` · ${b.imageFiles.length} фото`
                                              : ''}
                                            )
                                          </span>
                                        </td>
                                        <td className="px-2 py-1.5 text-center text-muted-foreground">
                                          эталон
                                        </td>
                                        <KbjuCells value={b.reference} />
                                        <td className="px-2 py-1.5 text-right text-muted-foreground">
                                          —
                                        </td>
                                        <td className="px-2 py-1.5 text-center text-muted-foreground">
                                          —
                                        </td>
                                      </tr>
                                      {foodSamples.map((sample) => (
                                        <tr
                                          key={`${sample.foodId}-${sample.runIndex}`}
                                          className="border-t"
                                        >
                                          <td className="px-2 py-1.5 pl-4">
                                            {sample.status === 'error' ? (
                                              <span className="text-destructive">
                                                {sample.errorMessage ?? 'Ошибка'}
                                              </span>
                                            ) : sample.result ? (
                                              <button
                                                type="button"
                                                className="text-primary underline-offset-2 hover:underline"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  openSample(sample, row.label);
                                                }}
                                              >
                                                ответ
                                              </button>
                                            ) : (
                                              <span className="text-muted-foreground">
                                                ответ
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-2 py-1.5 text-center tabular-nums">
                                            {sample.runIndex}
                                          </td>
                                          <KbjuCells value={sample.predicted} />
                                          <td
                                            className={`px-2 py-1.5 text-right tabular-nums ${accuracyClass(sample.accuracy)}`}
                                          >
                                            {sample.accuracy != null
                                              ? formatPct(sample.accuracy)
                                              : '—'}
                                          </td>
                                          <td className="px-2 py-1.5 text-center text-muted-foreground">
                                            {statusLabel(sample.status)}
                                          </td>
                                        </tr>
                                      ))}
                                      <tr className="border-t bg-muted/20 font-medium">
                                        <td className="px-2 py-1.5 pl-4" />
                                        <td className="px-2 py-1.5 text-center text-muted-foreground">
                                          средняя
                                        </td>
                                        <KbjuCells value={avg.predicted} />
                                        <td
                                          className={`px-2 py-1.5 text-right tabular-nums ${accuracyClass(avg.accuracy)}`}
                                        >
                                          {avg.accuracy != null
                                            ? formatPct(avg.accuracy)
                                            : '—'}
                                        </td>
                                        <td className="px-2 py-1.5 text-center text-muted-foreground">
                                          —
                                        </td>
                                      </tr>
                                    </Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
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

        <section className="rounded-lg border overflow-x-auto">
          <h2 className="border-b bg-muted/40 px-3 py-2 text-sm font-medium">
            Эталоны (nutrition_en.jsonl ∩ images/)
          </h2>
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Фото</th>
                <th className="px-3 py-2 font-medium">Блюдо</th>
                <th className="px-3 py-2 font-medium text-right">ккал</th>
                <th className="px-3 py-2 font-medium text-right">Б</th>
                <th className="px-3 py-2 font-medium text-right">Ж</th>
                <th className="px-3 py-2 font-medium text-right">У</th>
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {b.imageFiles.slice(0, 3).map((file) => (
                        <img
                          key={file}
                          src={aiFoodUrl(file)}
                          alt={b.name}
                          className="h-12 w-12 rounded object-cover"
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-medium">
                    <div>{b.name}</div>
                    <div className="text-xs font-normal text-muted-foreground">
                      #{b.id}
                      {b.classificationLabel
                        ? ` · ${b.classificationLabel}`
                        : ''}
                    </div>
                  </td>
                  <KbjuCells value={b.reference} />
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>

      <SampleResultModal
        open={preview != null}
        onClose={() => setPreview(null)}
        result={preview?.result ?? null}
        benchmark={previewBenchmark}
        modelLabel={preview?.modelLabel ?? ''}
        runIndex={preview?.runIndex ?? 1}
        accuracy={preview?.accuracy ?? null}
        imageSrc={
          previewBenchmark ? benchmarkImageSrc(previewBenchmark) : null
        }
      />
    </div>
  );
}
