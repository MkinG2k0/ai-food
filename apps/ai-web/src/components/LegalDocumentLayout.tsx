import Link from 'next/link';

import { LandingFooter, LandingNav } from '@/components/landing';
import { legalConfig } from '@/lib/legal/legalConfig';
import type { LegalSection } from '@/lib/legal/types';

type Props = {
  title: string;
  sections: LegalSection[];
  children?: never;
};

function linkify(text: string): React.ReactNode {
  const { email, telegramSupport, telegramLabel } = legalConfig;
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const emailIdx = remaining.indexOf(email);
    const tgIdx = remaining.indexOf(telegramLabel);
    const candidates = [
      emailIdx >= 0
        ? {
            idx: emailIdx,
            len: email.length,
            node: (
              <a key={key++} href={`mailto:${email}`}>
                {email}
              </a>
            ),
          }
        : null,
      tgIdx >= 0
        ? {
            idx: tgIdx,
            len: telegramLabel.length,
            node: (
              <a
                key={key++}
                href={telegramSupport}
                target="_blank"
                rel="noopener noreferrer"
              >
                {telegramLabel}
              </a>
            ),
          }
        : null,
    ].filter(Boolean) as { idx: number; len: number; node: React.ReactNode }[];

    if (candidates.length === 0) {
      parts.push(remaining);
      break;
    }
    candidates.sort((a, b) => a.idx - b.idx);
    const hit = candidates[0];
    if (hit.idx > 0) parts.push(remaining.slice(0, hit.idx));
    parts.push(hit.node);
    remaining = remaining.slice(hit.idx + hit.len);
  }
  return parts;
}

export function LegalDocumentLayout({ title, sections }: Props) {
  const revised = new Date(legalConfig.revisionDate + 'T00:00:00').toLocaleDateString(
    'ru-RU',
    { year: 'numeric', month: 'long', day: 'numeric' },
  );

  return (
    <div className="lp-page">
      <LandingNav />
      <main>
        <header className="lp-legal-hero">
          <div className="lp-legal-hero__glow" aria-hidden="true" />
          <div className="lp-legal-hero__inner">
            <p className="lp-legal-hero__eyebrow">Документы</p>
            <h1 className="lp-display lp-legal-hero__title">{title}</h1>
            <p className="lp-legal-hero__meta">Обновлено: {revised}</p>
          </div>
        </header>

        <div className="lp-section lp-legal">
          <div className="lp-legal__inner">
            <p className="lp-legal__back">
              <Link href="/">← На главную</Link>
            </p>
            {sections.map((section, sectionIdx) => (
              <section key={sectionIdx} className="lp-legal__section">
                <h2 className="lp-display">{section.title}</h2>
                {section.paragraphs.map((p, pIdx) => (
                  <p key={pIdx}>{linkify(p)}</p>
                ))}
              </section>
            ))}
            <nav className="lp-legal__docs" aria-label="Другие документы">
              <Link href="/terms">Условия</Link>
              <Link href="/privacy">Конфиденциальность</Link>
              <Link href="/refunds">Возврат</Link>
            </nav>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
