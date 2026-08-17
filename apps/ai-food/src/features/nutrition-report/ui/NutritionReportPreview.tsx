import { ArrowLeft, Download, Share2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { Button } from '@/shared/ui';
import type { NutritionReportData } from '../model/buildReportData';
import { canSharePdf } from '../model/buildNutritionReportSnapshot';
import { exportReportPdfFromElement } from '../model/exportReportPdfFromElement';
import { reportFileName, type ReportPeriod } from '../model/reportPeriods';
import {
  NutritionReportError,
  saveNutritionReportPdf,
  shareNutritionReportPdf,
} from '../model/saveNutritionReportPdf';
import { NutritionReportDocument } from './NutritionReportDocument';

export interface NutritionReportPreviewProps {
  open: boolean;
  period: ReportPeriod;
  data: NutritionReportData;
  onBack: () => void;
  onClose: () => void;
}

export function NutritionReportPreview({
  open,
  period,
  data,
  onBack,
  onClose,
}: NutritionReportPreviewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<'download' | 'share' | null>(null);
  const shareAvailable = canSharePdf();

  if (!open) return null;

  const filename = reportFileName(period.start, period.end);

  const buildPdf = async (): Promise<Blob> => {
    const root = reportRef.current?.querySelector('[data-report-root]');
    if (!(root instanceof HTMLElement)) {
      throw new NutritionReportError('Не удалось подготовить превью');
    }
    return exportReportPdfFromElement(root, filename);
  };

  const handleDownload = async () => {
    setBusy('download');
    try {
      const blob = await buildPdf();
      await saveNutritionReportPdf(blob, filename);
      toast.success(
        Capacitor.isNativePlatform()
          ? `Отчёт сохранён: ${filename}`
          : 'PDF скачан',
      );
    } catch (err) {
      toast.error(
        err instanceof NutritionReportError
          ? err.message
          : 'Не удалось скачать PDF',
      );
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    setBusy('share');
    try {
      const blob = await buildPdf();
      await shareNutritionReportPdf(blob, filename);
    } catch (err) {
      toast.error(
        err instanceof NutritionReportError
          ? err.message
          : 'Не удалось отправить отчёт',
      );
    } finally {
      setBusy(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      <header className="shrink-0 border-b border-border bg-background/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
            aria-label="Назад к выбору периода"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold">Превью отчёта</h2>
            <p className="truncate text-sm text-muted-foreground">
              {data.periodRange}
            </p>
          </div>
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div ref={reportRef} className="mx-auto max-w-lg pb-4">
          <NutritionReportDocument data={data} />
        </div>
      </main>

      <footer className="shrink-0 border-t border-border bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto flex max-w-lg gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={busy !== null}
            onClick={() => void handleDownload()}
          >
            <Download className="mr-2 h-4 w-4" aria-hidden />
            {busy === 'download' ? 'Создаём…' : 'Скачать PDF'}
          </Button>
          {shareAvailable ? (
            <Button
              type="button"
              className="flex-1"
              disabled={busy !== null}
              onClick={() => void handleShare()}
            >
              <Share2 className="mr-2 h-4 w-4" aria-hidden />
              {busy === 'share' ? 'Готовим…' : 'Отправить'}
            </Button>
          ) : null}
        </div>
      </footer>
    </div>,
    document.body,
  );
}
