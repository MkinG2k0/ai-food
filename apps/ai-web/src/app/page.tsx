import {
  LandingCompare,
  LandingFaq,
  LandingFeatures,
  LandingFinalCta,
  LandingFooter,
  LandingHero,
  LandingHowItWorks,
  LandingNav,
  LandingPricing,
} from '@/components/landing';

export default function HomePage() {
  return (
    <div className="lp-page">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingCompare />
        <LandingPricing />
        <LandingFaq />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
