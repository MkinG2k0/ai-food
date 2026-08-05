### Task 4: HowItWorks, Features, Compare

**Files:**
- Create: `apps/ai-web/src/components/landing/LandingHowItWorks.tsx`
- Create: `apps/ai-web/src/components/landing/LandingFeatures.tsx`
- Create: `apps/ai-web/src/components/landing/LandingCompare.tsx`
- Modify: `apps/ai-web/src/app/globals.css`

**Interfaces:**
- Consumes: `landingContent.howItWorks | features | compare`
- Produces: three section components

- [ ] **Step 1: LandingHowItWorks**

```tsx
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
```

- [ ] **Step 2: LandingFeatures**

```tsx
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
```

- [ ] **Step 3: LandingCompare**

```tsx
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
```

- [ ] **Step 4: Append CSS for steps / features / compare**

```css
.lp-section--muted {
  background: #eaf3ec;
}

.lp-steps {
  list-style: none;
  margin: 40px 0 0;
  padding: 0;
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.lp-steps__item h3 {
  margin: 8px 0;
  font-size: 20px;
}

.lp-steps__item p {
  margin: 0;
  color: var(--lp-muted);
  font-size: 15px;
}

.lp-steps__num {
  display: inline-block;
  color: var(--lp-sage);
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.08em;
}

@media (max-width: 800px) {
  .lp-steps {
    grid-template-columns: 1fr;
  }
}

.lp-features {
  display: grid;
  gap: 40px;
  grid-template-columns: 1.2fr 0.8fr;
  align-items: center;
}

.lp-feature-grid {
  list-style: none;
  margin: 32px 0 0;
  padding: 0;
  display: grid;
  gap: 20px;
  grid-template-columns: 1fr 1fr;
}

.lp-feature-grid h3 {
  margin: 0 0 6px;
  font-size: 17px;
}

.lp-feature-grid p {
  margin: 0;
  color: var(--lp-muted);
  font-size: 14px;
}

.lp-mock__card {
  background: #fff;
  border: 1px solid rgba(21, 38, 28, 0.1);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 18px 40px rgba(21, 38, 28, 0.08);
}

.lp-mock__photo {
  height: 140px;
  border-radius: 12px;
  background: linear-gradient(135deg, #d8e8de, #c5e063);
  margin-bottom: 14px;
}

.lp-mock__name {
  margin: 0 0 4px;
  font-size: 14px;
  color: var(--lp-muted);
}

.lp-mock__kcal {
  margin: 0 0 10px;
  font-family: var(--font-lp-display), Georgia, serif;
  font-size: 28px;
}

.lp-mock__macros {
  display: flex;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
}

.lp-mock__macros span {
  background: #eaf3ec;
  padding: 6px 10px;
  border-radius: 999px;
}

@media (max-width: 900px) {
  .lp-features {
    grid-template-columns: 1fr;
  }
  .lp-feature-grid {
    grid-template-columns: 1fr;
  }
}

.lp-compare {
  margin-top: 32px;
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr 1fr;
}

.lp-compare__col {
  padding: 24px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid rgba(21, 38, 28, 0.08);
}

.lp-compare__col--accent {
  background: var(--lp-ink);
  color: #f4f8f5;
  border-color: transparent;
}

.lp-compare__col h3 {
  margin: 0 0 12px;
  font-size: 18px;
}

.lp-compare__col ul {
  margin: 0;
  padding-left: 18px;
  color: inherit;
}

.lp-compare__col--accent ul {
  color: rgba(244, 248, 245, 0.88);
}

@media (max-width: 700px) {
  .lp-compare {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Type-check + commit**

Run: `pnpm --filter ai-web type-check`  
Expected: PASS

```bash
git add apps/ai-web/src/components/landing/LandingHowItWorks.tsx apps/ai-web/src/components/landing/LandingFeatures.tsx apps/ai-web/src/components/landing/LandingCompare.tsx apps/ai-web/src/app/globals.css
git commit -m "feat(ai-web): add how-it-works, features, and compare sections"
```

---

