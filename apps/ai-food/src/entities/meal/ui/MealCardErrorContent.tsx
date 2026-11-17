import { Button } from '@/shared/ui';

export interface MealCardErrorContentProps {
  errorLabel: string;
  time: string;
  quotaCtaLabel: string;
  className?: string;
  onRetry: (e: React.MouseEvent) => void;
}

export function MealCardErrorContent({
  errorLabel,
  time,
  quotaCtaLabel,
  className,
  onRetry,
}: MealCardErrorContentProps) {
  return (
    <div className={className ?? 'flex flex-col justify-center gap-2'}>
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-destructive">
          {errorLabel}
        </p>
        <span className="shrink-0 pt-0.5 text-sm text-muted-foreground">
          {time}
        </span>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-fit"
        onClick={onRetry}
      >
        {quotaCtaLabel}
      </Button>
    </div>
  );
}
