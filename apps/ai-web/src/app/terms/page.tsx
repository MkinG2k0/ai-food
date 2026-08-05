import type { Metadata } from 'next';

import { LegalDocumentLayout } from '@/components/LegalDocumentLayout';
import { buildTermsSections } from '@/lib/legal/termsContent';

export const metadata: Metadata = {
  title: 'Условия использования',
  description:
    'Условия использования сервиса AI Food: правила доступа, лицензии и ограничения.',
  alternates: {
    canonical: '/terms',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
  return (
    <LegalDocumentLayout
      title="Условия использования"
      sections={buildTermsSections()}
    />
  );
}
