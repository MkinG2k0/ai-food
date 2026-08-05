import type { Metadata } from 'next';

import { LegalDocumentLayout } from '@/components/LegalDocumentLayout';
import { buildPrivacySections } from '@/lib/legal/privacyContent';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности',
  description:
    'Как AI Food обрабатывает персональные данные, фото еды и сведения об аккаунте.',
  alternates: {
    canonical: '/privacy',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
  return (
    <LegalDocumentLayout
      title="Политика конфиденциальности"
      sections={buildPrivacySections()}
    />
  );
}
