import Link from 'next/link';

import { formatSellerBlock, legalConfig } from '@/lib/legal/legalConfig';
import { landingConfig } from '@/lib/landing/config';

export function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer__inner">
        <p className="lp-footer__brand">{landingConfig.productName}</p>
        <nav className="lp-footer__nav" aria-label="Документы">
          <Link href="/terms">Условия</Link>
          <Link href="/privacy">Конфиденциальность</Link>
          <Link href="/refunds">Возврат</Link>
          <a
            href={legalConfig.telegramSupport}
            target="_blank"
            rel="noopener noreferrer"
          >
            Поддержка {legalConfig.telegramLabel}
          </a>
        </nav>
        <p className="lp-footer__seller">{formatSellerBlock()}</p>
        <p className="lp-footer__copy">
          © {new Date().getFullYear()} {landingConfig.productName}
        </p>
      </div>
    </footer>
  );
}
