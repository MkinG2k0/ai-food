import { landingConfig } from '@/lib/landing/config';

export function LandingNav() {
  return (
    <header className="lp-nav">
      <div className="lp-nav__inner">
        <a className="lp-nav__brand" href="#top">
          {landingConfig.productName}
        </a>
        <nav className="lp-nav__links" aria-label="Разделы">
          {landingConfig.nav.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
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
