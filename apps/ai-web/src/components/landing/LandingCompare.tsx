import { landingContent } from '@/lib/landing/content';

export function LandingCompare() {
  const c = landingContent.compare;

  return (
    <section className="lp-section">
      <div className="lp-section__inner">
        <p className="lp-eyebrow">{c.eyebrow}</p>
        <h2 className="lp-display">{c.title}</h2>
        <div className="lp-compare">
          <div className="lp-compare__col">
            <h3>{c.leftTitle}</h3>
            <ul>
              {c.leftItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="lp-compare__col lp-compare__col--accent">
            <h3>{c.rightTitle}</h3>
            <ul>
              {c.rightItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
