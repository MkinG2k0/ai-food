import { useEffect, useState } from 'react';
import type { MicronutrientId } from '@ai-food/shared-types';
import { MICRONUTRIENT_IDS } from '@ai-food/shared-types';
import {
  isMineralMicronutrient,
  isVitaminMicronutrient,
  MICRONUTRIENT_LABELS,
} from '@/entities/nutrition';
import {
  DEFAULT_STATS_MICRONUTRIENT_IDS,
  useSettingsStore,
} from '@/features/settings';
import { BottomSheet, Button } from '@/shared/ui';

export interface MicronutrientVisibilitySheetProps {
  open: boolean;
  onClose: () => void;
}

function toggleId(ids: MicronutrientId[], id: MicronutrientId): MicronutrientId[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

function CheckboxRow({
  id,
  checked,
  onChange,
}: {
  id: MicronutrientId;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-2 hover:bg-muted/60">
      <input
        type="checkbox"
        className="size-4 shrink-0 rounded border-border accent-foreground"
        checked={checked}
        onChange={onChange}
      />
      <span className="text-sm text-foreground">{MICRONUTRIENT_LABELS[id]}</span>
    </label>
  );
}

export function MicronutrientVisibilitySheet({
  open,
  onClose,
}: MicronutrientVisibilitySheetProps) {
  const savedIds = useSettingsStore((s) => s.statsMicronutrientIds);
  const setStatsMicronutrientIds = useSettingsStore(
    (s) => s.setStatsMicronutrientIds,
  );
  const [draft, setDraft] = useState<MicronutrientId[]>(savedIds);

  useEffect(() => {
    if (!open) return;
    setDraft(savedIds);
  }, [open, savedIds]);

  const vitamins = MICRONUTRIENT_IDS.filter(isVitaminMicronutrient);
  const minerals = MICRONUTRIENT_IDS.filter(isMineralMicronutrient);
  const selectedCount = draft.length;

  function handleSave() {
    setStatsMicronutrientIds(draft);
    onClose();
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      className="max-h-[85dvh] pb-[max(2rem,calc(env(safe-area-inset-bottom)+1.25rem))]"
    >
      <div className="flex max-h-[calc(85dvh-3rem)] flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Настройка</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Какие витамины и минералы показывать по умолчанию. Полный список — через
            «Посмотреть все».
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-1">
          <section>
            <h3 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Витамины
            </h3>
            <div className="divide-y divide-border/60">
              {vitamins.map((id) => (
                <CheckboxRow
                  key={id}
                  id={id}
                  checked={draft.includes(id)}
                  onChange={() => setDraft((d) => toggleId(d, id))}
                />
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Минералы
            </h3>
            <div className="divide-y divide-border/60">
              {minerals.map((id) => (
                <CheckboxRow
                  key={id}
                  id={id}
                  checked={draft.includes(id)}
                  onChange={() => setDraft((d) => toggleId(d, id))}
                />
              ))}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-2 border-t border-border/60 pt-3 pb-4">
          <p className="text-center text-xs text-muted-foreground">
            Выбрано: {selectedCount}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setDraft([...DEFAULT_STATS_MICRONUTRIENT_IDS])}
            >
              Сбросить
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleSave}
              disabled={selectedCount === 0}
            >
              Готово
            </Button>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
