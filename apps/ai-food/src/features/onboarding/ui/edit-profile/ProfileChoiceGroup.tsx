import { cn } from '@/shared/lib';
import type { ProfileChoiceGroupProps } from './ProfileChoiceGroup.types';

export function ProfileChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: ProfileChoiceGroupProps<T>) {
  return (
    <fieldset className={cn('space-y-1.5', className)}>
      <legend className="text-xs text-muted-foreground">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(opt.value)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                selected
                  ? 'border-primary bg-primary/10 font-medium'
                  : 'border-border bg-background text-foreground',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
