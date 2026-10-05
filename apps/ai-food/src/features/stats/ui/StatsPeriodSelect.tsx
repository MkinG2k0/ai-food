import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/shared/ui';
import { STATS_PERIOD_OPTIONS, type StatsPeriod } from '../model/monthPeriod';

interface StatsPeriodSelectProps {
  value: StatsPeriod;
  onChange: (period: StatsPeriod) => void;
}

export function StatsPeriodSelect({ value, onChange }: StatsPeriodSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const label =
    STATS_PERIOD_OPTIONS.find((option) => option.value === value)?.label ?? '';

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Период статистики"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="gap-1 pr-2 font-medium"
      >
        {label}
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </Button>
      {open ? (
        <ul
          role="listbox"
          aria-label="Период статистики"
          className="absolute right-0 top-full z-50 mt-1 min-w-[10.5rem] overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          {STATS_PERIOD_OPTIONS.map((option) => {
            const selected = option.value === value;
            return (
              <li key={option.value} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`flex w-full px-3 py-2.5 text-left text-sm ${
                    selected
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-foreground hover:bg-muted/60'
                  }`}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
