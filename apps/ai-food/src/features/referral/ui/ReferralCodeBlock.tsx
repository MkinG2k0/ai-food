import { useQuery } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { fetchReferral } from '../api/fetchReferral';
import { Button } from '@/shared/ui';

export function ReferralCodeBlock() {
  const { data } = useQuery({
    queryKey: ['billing', 'referral'],
    queryFn: fetchReferral,
    staleTime: 60_000,
  });

  if (!data) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(data.code);
      toast.success('Скопировано');
    } catch {
      toast.error('Не удалось скопировать');
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Реферальный код</p>
      <p className="text-sm text-muted-foreground">
        Друг вводит этот код при оплате и получает скидку 10%. После оплаты вам
        +30 дней.
      </p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1 font-mono text-sm">
          {data.code}
        </code>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => void handleCopy()}
          aria-label="Скопировать реферальный код"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Оплачено по коду: {data.conversionCount}
      </p>
    </div>
  );
}
