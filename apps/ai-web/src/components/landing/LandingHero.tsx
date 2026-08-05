import { landingContent } from '@/lib/landing/content';

import { CtaButtons } from './CtaButtons';

export function LandingHero() {
  const { brand, headline, support } = landingContent.hero;
  const [line1, line2] = headline.split('\n');

  return (
    <section className="lp-hero" id="top" aria-labelledby="lp-hero-title">
      <div className="lp-hero__glow" aria-hidden="true" />
      <div className="lp-hero__inner">
        <p className="lp-hero__brand">{brand}</p>
        <h1 id="lp-hero-title" className="lp-display lp-hero__title">
          {line1}
          <br />
          {line2}
        </h1>
        <p className="lp-hero__support">{support}</p>
        <CtaButtons variant="light" />
      </div>
    </section>
  );
}
