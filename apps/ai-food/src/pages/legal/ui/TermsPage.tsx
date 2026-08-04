import { useNavigate } from 'react-router-dom';
import { useSubscriptionPrice } from '@/features/billing';
import { buildTermsSections } from '@/shared/legal/termsContent';
import { LegalDocumentPage } from './LegalDocumentPage';

export function TermsPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useSubscriptionPrice();
  const sections = buildTermsSections({
    amountKopecks: isError ? null : (data?.amountKopecks ?? null),
    durationDays: isError ? null : (data?.durationDays ?? null),
  });
  return (
    <LegalDocumentPage
      title="Условия"
      onBack={() => navigate('/settings')}
      sections={sections}
      loadingHint={
        isLoading ? 'Загружаем актуальный тариф…' : null
      }
    />
  );
}
