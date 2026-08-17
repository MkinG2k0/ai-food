interface NutritionRowProps {
  label: string;
  value: number;
  unit: string;
  max?: number;
  color?: string;
}

function formatRowValue(value: number): string {
  const n = Number.isFinite(value) ? Math.max(0, Math.round(value * 10) / 10) : 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function NutritionRow({
  label,
  value,
  unit,
  max = 100,
  color = 'bg-emerald-500',
}: NutritionRowProps) {
  const pct = Math.min((value / max) * 100, 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {formatRowValue(value)}
          {unit}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
