import Link from 'next/link';

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
      emailIdx >= 0 ? { idx: emailIdx, len: email.length, node: (
        <a key={key++} href={`mailto:${email}`}>{email}</a>
      ) } : null,
      tgIdx >= 0 ? { idx: tgIdx, len: telegramLabel.length, node: (
        <a key={key++} href={telegramSupport} target="_blank" rel="noopener noreferrer">{telegramLabel}</a>
      ) } : null,
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
    <main className="legal-doc">
      <header className="legal-doc__header">
        <Link href="/" className="legal-doc__back">
          ← На главную
        </Link>
        <p className="legal-doc__brand">{legalConfig.productName}</p>
      </header>
      <h1 className="legal-doc__title">{title}</h1>
      <p className="legal-doc__meta">Обновлено: {revised}</p>
      {sections.map((section, sectionIdx) => (
        <section key={sectionIdx} className="legal-doc__section">
          <h2>{section.title}</h2>
          {section.paragraphs.map((p, pIdx) => (
            <p key={pIdx}>{linkify(p)}</p>
          ))}
        </section>
      ))}
      <footer className="legal-doc__footer">
        <nav className="legal-doc__nav">
          <Link href="/terms">Условия использования</Link>
          <Link href="/privacy">Политика конфиденциальности</Link>
          <Link href="/refunds">Политика возврата</Link>
        </nav>
        <p className="legal-doc__copy">
          © {new Date().getFullYear()} {legalConfig.productName}. Все права защищены.
        </p>
        <p className="legal-doc__seller">{formatSellerInline()}</p>
      </footer>
    </main>
  );
}

function formatSellerInline(): string {
  const c = legalConfig;
  return `ИП ${c.sellerName} · ИНН ${c.inn}`;
}
