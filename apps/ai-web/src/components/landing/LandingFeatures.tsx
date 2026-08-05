import { landingContent } from '@/lib/landing/content';

export function LandingFeatures() {
  const c = landingContent.features;

  return (
    <section className="lp-section lp-section--muted" id={c.id}>
      <div className="lp-section__inner lp-features">
        <div className="lp-features__copy">
          <p className="lp-eyebrow">{c.eyebrow}</p>
          <h2 className="lp-display">{c.title}</h2>
          <ul className="lp-feature-grid">
            {c.items.map((item) => (
              <li key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="lp-mock" aria-hidden="true">
          <div className="lp-mock__card">
            <div className="lp-mock__photo" />
            <p className="lp-mock__name">Обед · курица и овощи</p>
            <p className="lp-mock__kcal">520 ккал</p>
            <div className="lp-mock__macros">
              <span>Б 42</span>
              <span>Ж 18</span>
              <span>У 48</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
