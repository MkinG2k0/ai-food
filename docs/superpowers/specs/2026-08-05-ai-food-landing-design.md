# AI Food marketing landing (`ai-web` `/`)

**Date:** 2026-08-05  
**App:** `apps/ai-web`  
**Status:** Approved for planning  
**Approach:** CalZen-like section map, original Herb Lab visual language (not a layout clone)

## Goal

Replace the `/` stub («AI Food / Скоро») with a sellable Russian marketing landing that converts visitors to open the web app or install from RuStore — structure inspired by [CalZen](https://calzen.ai/ru/), identity owned by AI Food.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Primary CTA | Open web app: `https://ai-food-mobile.vercel.app` |
| Secondary CTA | RuStore: `https://www.rustore.ru/catalog/app/com.aifood.app` |
| Social proof | Early-stage tone; **no** fake ratings, user counts, or testimonials |
| Scope | Full page: hero → how it works → product → vs manual → pricing (no ₽) → FAQ → final CTA → footer |
| Visual | **Herb Lab** + **full-bleed hero** |
| Pricing copy | Free start + yearly license; **no ruble amounts** on the page; details in-app |
| UI kit on `/` | Custom CSS sections — **not** Ant Design admin chrome |

## Out of scope

- App Store / Google Play buttons (no links yet)
- Fake testimonials / star ratings / “N million users”
- Fetching live price from gateway for the landing
- Redesign of `/terms` `/privacy` `/refunds` or `/admin/*`
- New backend APIs

## Page map

1. **Nav** — brand “AI Food”, in-page anchors (Как работает / Возможности / Тариф / FAQ), compact “Открыть”
2. **Hero (full-bleed)** — brand as hero-level signal; one headline; one supporting sentence; CTA pair (web + RuStore); atmospheric herb gradient (no floating badges/chips on media)
3. **Как работает** — 3 steps: photograph → AI computes КБЖУ → diary & goal stick
4. **Возможности** — photo analysis, diary, weight/progress, barcode, manual entry, Telegram account; CSS product mocks (signature), not fake review carousels
5. **Vs ручной учёт** — short comparison: scales/DB search vs one photo
6. **Тариф** — guest free generations (50) + login bonus (to 150) vs yearly unlimited license; **no ₽**; CTA into app
7. **FAQ** — 6–8 items (accuracy, what it recognizes, free vs paid, privacy, web vs RuStore, Telegram)
8. **Final CTA** — repeat web + RuStore
9. **Footer** — `/terms` `/privacy` `/refunds`, Telegram support from `legalConfig`, short seller line

## Visual system (Herb Lab)

| Token | Hex / value |
|-------|-------------|
| Page background | `#F4F8F5` |
| Hero surface | gradient `#1A2F23` → `#2D4A38` → `#5B8A72` |
| Ink | `#15261C` |
| Sage | `#5B8A72` |
| Lime accent | `#C5E063` |
| Display type | Characterful serif (e.g. Fraunces via `next/font`) |
| Body type | Complementary sans (e.g. DM Sans) |
| Signature | Lime section markers + CSS diary/КБЖУ mock in product section |
| Motion | Hero entrance, section reveal on scroll, CTA hover; respect `prefers-reduced-motion` |

Avoid: purple SaaS gradients, cream+terracotta default, broadsheet newspaper look, glow stacks, emoji decoration, cards in the hero.

## Copy direction (RU)

- Honest early-stage: focus on product job (“фото → КБЖУ → дневник”), not social proof theater
- Headline candidate: «Сфотографировал. Уже знаешь КБЖУ.»
- Supporting: анализ тарелки за секунды — без весов и поиска в базах
- Pricing: describe free quota and yearly unlimited in words; point to in-app subscribe for payment

Quota facts for copy (must match product): guest **50** free generations; after Telegram login **+100** (150 total); active yearly license → unlimited. Do not invent other numbers.

## Architecture

```
Browser → ai-web `/` (static marketing page)
       → CTA → ai-food-mobile.vercel.app | RuStore
       → Footer → /terms | /privacy | /refunds
```

### Files (planned)

| Path | Role |
|------|------|
| `apps/ai-web/src/app/page.tsx` | Compose landing sections |
| `apps/ai-web/src/app/layout.tsx` | Fonts + metadata for public site |
| `apps/ai-web/src/app/globals.css` | `.lp-*` landing styles; keep `.legal-doc*` / `.admin-*` intact; stop forcing `main` centered stub layout for landing |
| `apps/ai-web/src/lib/landing/config.ts` | `webAppUrl`, `ruStoreUrl`, nav anchors |
| `apps/ai-web/src/components/landing/*` | Nav, Hero, HowItWorks, Features, Compare, Pricing, Faq, FinalCta, Footer |
| Optional later | Real screenshots under `public/` |

### Constraints

- Landing is Server Components + CSS by default; client only if needed for FAQ accordion / reduced-motion-safe reveals
- Do not leak admin secrets or Ant Design theme onto `/`
- CTA URLs live in `landing/config.ts` (single source)
- Reuse `legalConfig` for support Telegram + seller footer line

## Error / edge

- Broken external CTAs: still render buttons; URLs are static known-good production links
- No JS: page remains readable; FAQ can be native `<details>` if accordion is used

## Testing / verification

- `pnpm --filter ai-web type-check`
- `pnpm --filter ai-web build`
- Manual: `/` renders full landing; CTAs open correct targets; `/terms` etc. still work; `/admin` unchanged
- Mobile + desktop check of hero first viewport

## Success criteria

1. `/` is a complete marketing page (not «Скоро»)
2. Web + RuStore CTAs present in hero and final CTA
3. No fabricated social proof
4. No ruble prices on landing
5. Visual matches Herb Lab + full-bleed hero
6. Legal footer links work; admin/legal pages not regressed
