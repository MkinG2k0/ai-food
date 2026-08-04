import type { Metadata } from 'next';

import { LegalDocumentLayout } from '@/components/LegalDocumentLayout';
import { buildPrivacySections } from '@/lib/legal/privacyContent';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности — AI Food',
  description: 'Политика конфиденциальности AI Food',
};

export default function PrivacyPage() {
  return (
    <LegalDocumentLayout
      title="Политика конфиденциальности"
      sections={buildPrivacySections()}
    />
  );
}
