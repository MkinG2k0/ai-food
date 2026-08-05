import Link from 'next/link';

import { landingConfig } from '@/lib/landing/config';

export function LandingNav() {
  return (
    <header className="lp-nav">
      <div className="lp-nav__inner">
        <Link className="lp-nav__brand" href="/">
          {landingConfig.productName}
        </Link>
        <nav className="lp-nav__links" aria-label="Разделы">
          {landingConfig.nav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <a
          className="lp-nav__cta lp-btn lp-btn--lime"
          href={landingConfig.webAppUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Открыть
        </a>
      </div>
    </header>
  );
}
