import { landingContent } from '@/lib/landing/content';

import { CtaButtons } from './CtaButtons';

export function LandingPricing() {
  const c = landingContent.pricing;

  return (
    <section className="lp-section lp-section--muted" id={c.id}>
      <div className="lp-section__inner">
        <p className="lp-eyebrow">{c.eyebrow}</p>
        <h2 className="lp-display">{c.title}</h2>
        <div className="lp-pricing">
          <article className="lp-pricing__card">
            <h3>{c.freeTitle}</h3>
            <p>{c.freeBody}</p>
          </article>
          <article className="lp-pricing__card lp-pricing__card--accent">
            <h3>{c.paidTitle}</h3>
            <p>{c.paidBody}</p>
          </article>
        </div>
        <p className="lp-pricing__note">{c.ctaNote}</p>
        <CtaButtons />
      </div>
    </section>
  );
}
