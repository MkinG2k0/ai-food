import { landingContent } from '@/lib/landing/content';

import { CtaButtons } from './CtaButtons';

export function LandingFinalCta() {
  const c = landingContent.finalCta;

  return (
    <section className="lp-final">
      <div className="lp-final__inner">
        <h2 className="lp-display">{c.title}</h2>
        <p>{c.body}</p>
        <CtaButtons variant="light" />
      </div>
    </section>
  );
}
