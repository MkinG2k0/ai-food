import type { Metadata } from 'next';

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
import { JsonLd } from '@/components/JsonLd';
import { absoluteUrl, siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
  openGraph: {
    url: '/',
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
};

const softwareApplicationLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: siteConfig.name,
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Web, Android',
  description: siteConfig.description,
  url: absoluteUrl('/'),
  image: absoluteUrl('/icon-512.png'),
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'RUB',
    description: 'Бесплатный старт с лимитом AI-генераций',
  },
  inLanguage: 'ru',
};

const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteConfig.name,
  url: absoluteUrl('/'),
  description: siteConfig.description,
  inLanguage: 'ru',
  potentialAction: {
    '@type': 'ViewAction',
    target: siteConfig.webAppUrl,
    name: 'Открыть приложение',
  },
};

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Насколько точен анализ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Для большинства обычных блюд оценка близка к реальности. Супы, смузи и сложные смеси лучше уточнить текстом или поправить состав вручную.',
      },
    },
    {
      '@type': 'Question',
      name: 'Как это работает?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Вы фотографируете еду. ИИ распознаёт продукты, оценивает порции и считает калории и БЖУ. Результат можно сохранить в дневник.',
      },
    },
    {
      '@type': 'Question',
      name: 'Это бесплатно?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Да, есть бесплатный старт с лимитом AI-генераций. Годовая лицензия даёт безлимит — детали и цена в приложении.',
      },
    },
  ],
};

export default function HomePage() {
  return (
    <div className="lp-page">
      <JsonLd data={softwareApplicationLd} />
      <JsonLd data={websiteLd} />
      <JsonLd data={faqLd} />
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
