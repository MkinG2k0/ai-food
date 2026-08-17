import { Calendar, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BottomSheet } from '@/shared/ui';
import { buildNutritionReportSnapshot } from '../model/buildNutritionReportSnapshot';
import type { NutritionReportData } from '../model/buildReportData';
import {
  buildReportPeriodPresets,
  formatReportPeriodRange,
  type ReportPeriod,
} from '../model/reportPeriods';
import { NutritionReportPreview } from './NutritionReportPreview';

export interface NutritionReportSheetProps {
  open: boolean;
  onClose: () => void;
}

type PreviewState = {
  period: ReportPeriod;
  data: NutritionReportData;
};

export function NutritionReportSheet({ open, onClose }: NutritionReportSheetProps) {
  const periods = useMemo(() => buildReportPeriodPresets(), []);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const handleCloseAll = () => {
    setPreview(null);
    onClose();
  };

  const handleSelect = (period: ReportPeriod) => {
    setPreview({
      period,
      data: buildNutritionReportSnapshot(period),
    });
  };

  return (
    <>
      <BottomSheet open={open && !preview} onClose={handleCloseAll}>
        <div className="w-full space-y-4 px-2 py-2">
          <h2 className="text-lg font-semibold text-foreground">
            Отчёт о питании
          </h2>
          <p className="text-sm text-muted-foreground">
            Сначала покажем превью, затем можно скачать PDF или отправить
            тренеру / нутрициологу.
          </p>
          <ul className="space-y-2">
            {periods.map((period) => (
              <li key={period.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm transition-colors hover:bg-muted/40"
                  onClick={() => handleSelect(period)}
                >
                  <Calendar
                    className="h-5 w-5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {period.label}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {formatReportPeriodRange(period.start, period.end)}
                    </span>
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </BottomSheet>

      {preview ? (
        <NutritionReportPreview
          open
          period={preview.period}
          data={preview.data}
          onBack={() => setPreview(null)}
          onClose={handleCloseAll}
        />
      ) : null}
    </>
  );
}
