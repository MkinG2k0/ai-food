import type { ReactNode } from 'react';
import { SubpageShell } from '@/shared/ui';
import type { LegalSection } from '@/shared/legal/types';
import { legalConfig } from '@/shared/legal/legalConfig';

type Props = {
  title: string;
  onBack: () => void;
  sections: LegalSection[];
  loadingHint?: string | null;
};

const linkClassName =
  'text-foreground underline underline-offset-2 break-all';

/** Turn email and Telegram handle/URL in legal copy into clickable links. */
function linkifyLegalText(text: string): ReactNode {
  const { email, telegramSupport, telegramLabel } = legalConfig;
  const tokens = [email, telegramLabel, telegramSupport].filter(Boolean);
  const escaped = tokens.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  if (escaped.length === 0) return text;

  const re = new RegExp(`(${escaped.join('|')})`, 'g');
  const parts = text.split(re);

  return parts.map((part, i) => {
    if (part === email) {
      return (
        <a
          key={`email-${i}`}
          href={`mailto:${email}`}
          className={linkClassName}
        >
          {email}
        </a>
      );
    }
    if (part === telegramLabel || part === telegramSupport) {
      return (
        <a
          key={`tg-${i}`}
          href={telegramSupport}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
        >
          {telegramLabel}
        </a>
      );
    }
    return part;
  });
}

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
              {linkifyLegalText(p)}
            </p>
          ))}
        </section>
      ))}
    </SubpageShell>
  );
}
