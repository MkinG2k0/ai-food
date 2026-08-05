import { landingContent } from '@/lib/landing/content';

export function LandingFaq() {
  const c = landingContent.faq;

  return (
    <section className="lp-section" id={c.id}>
      <div className="lp-section__inner">
        <p className="lp-eyebrow">{c.eyebrow}</p>
        <h2 className="lp-display">{c.title}</h2>
        <div className="lp-faq">
          {c.items.map((item, i) => (
            <details key={item.q} className="lp-faq__item">
              <summary>
                <span className="lp-faq__idx">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {item.q}
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
