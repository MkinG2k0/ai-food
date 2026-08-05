import { landingContent } from '@/lib/landing/content';

export function LandingHowItWorks() {
  const c = landingContent.howItWorks;
  const [t1, t2] = c.title.split('\n');

  return (
    <section className="lp-section" id={c.id}>
      <div className="lp-section__inner">
        <p className="lp-eyebrow">{c.eyebrow}</p>
        <h2 className="lp-display">
          {t1}
          <br />
          {t2}
        </h2>
        <ol className="lp-steps">
          {c.steps.map((step, i) => (
            <li key={step.title} className="lp-steps__item">
              <span className="lp-steps__num" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
