import { cn } from '@/shared/lib';
import type { ProfileNumberFieldProps } from './ProfileNumberField.types';

const inputClassName = cn(
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm tabular-nums',
  'ring-offset-background placeholder:text-muted-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
);

export function ProfileNumberField({
  label,
  value,
  unit,
  min,
  max,
  step = 1,
  onChange,
  className,
}: ProfileNumberFieldProps) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-xs text-muted-foreground">
        {label}
        {unit ? `, ${unit}` : ''}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        aria-label={label}
        className={inputClassName}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
