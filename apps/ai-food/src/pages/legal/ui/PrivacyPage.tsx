import { useNavigate } from 'react-router-dom';
import { buildPrivacySections } from '@/shared/legal/privacyContent';
import { LegalDocumentPage } from './LegalDocumentPage';

export function PrivacyPage() {
  const navigate = useNavigate();
  const sections = buildPrivacySections();
  return (
    <LegalDocumentPage
      title="Приватность"
      onBack={() => navigate('/settings')}
      sections={sections}
    />
  );
}
