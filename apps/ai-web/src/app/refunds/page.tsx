import type { Metadata } from 'next';

import { LegalDocumentLayout } from '@/components/LegalDocumentLayout';
import { buildRefundsSections } from '@/lib/legal/refundsContent';

export const metadata: Metadata = {
  title: 'Политика возврата',
  description:
    'Условия возврата оплаты за годовую лицензию AI Food и порядок обращения.',
  alternates: {
    canonical: '/refunds',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RefundsPage() {
  return (
    <LegalDocumentLayout
      title="Политика возврата"
      sections={buildRefundsSections()}
    />
  );
}
