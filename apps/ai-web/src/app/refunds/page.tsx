import type { Metadata } from 'next';

import { LegalDocumentLayout } from '@/components/LegalDocumentLayout';
import { buildRefundsSections } from '@/lib/legal/refundsContent';

export const metadata: Metadata = {
  title: 'Политика возврата — AI Food',
  description: 'Политика возврата AI Food',
};

export default function RefundsPage() {
  return (
    <LegalDocumentLayout
      title="Политика возврата"
      sections={buildRefundsSections()}
    />
  );
}
