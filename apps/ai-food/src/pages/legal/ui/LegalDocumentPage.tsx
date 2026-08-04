import { SubpageShell } from '@/shared/ui';
import type { LegalSection } from '@/shared/legal/types';
import { legalConfig } from '@/shared/legal/legalConfig';

type Props = {
  title: string;
  onBack: () => void;
  sections: LegalSection[];
  loadingHint?: string | null;
};

export function LegalDocumentPage({
  title,
  onBack,
  sections,
  loadingHint,
}: Props) {
  return (
    <SubpageShell title={title} onBack={onBack} mainClassName="space-y-6">
      <p className="text-sm text-muted-foreground">
        Редакция от{' '}
        {new Date(legalConfig.revisionDate + 'T00:00:00').toLocaleDateString(
          'ru-RU',
        )}
      </p>
      {loadingHint ? (
        <p className="text-sm text-muted-foreground">{loadingHint}</p>
      ) : null}
      {sections.map((section) => (
        <section key={section.title} className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            {section.title}
          </h2>
          {section.paragraphs.map((p) => (
            <p key={p.slice(0, 48)} className="text-sm text-muted-foreground">
              {p}
            </p>
          ))}
        </section>
      ))}
    </SubpageShell>
  );
}
