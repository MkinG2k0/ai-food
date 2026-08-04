import type { Metadata } from 'next';

import { LegalDocumentLayout } from '@/components/LegalDocumentLayout';
import { buildTermsSections } from '@/lib/legal/termsContent';

export const metadata: Metadata = {
  title: 'Условия использования — AI Food',
  description: 'Условия использования приложения AI Food',
};

export default function TermsPage() {
  return (
    <LegalDocumentLayout
      title="Условия использования"
      sections={buildTermsSections()}
    />
  );
}
