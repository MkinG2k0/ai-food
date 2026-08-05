import { landingConfig } from '@/lib/landing/config';
import { landingContent } from '@/lib/landing/content';

type Props = {
  variant?: 'dark' | 'light';
  className?: string;
};

export function CtaButtons({ variant = 'dark', className }: Props) {
  const primaryClass =
    variant === 'light' ? 'lp-btn lp-btn--lime' : 'lp-btn lp-btn--primary';
  const secondaryClass =
    variant === 'light' ? 'lp-btn lp-btn--ghost-light' : 'lp-btn lp-btn--ghost';

  return (
    <div className={`lp-cta-row${className ? ` ${className}` : ''}`}>
      <a
        className={primaryClass}
        href={landingConfig.webAppUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {landingContent.hero.primaryCta}
      </a>
      <a
        className={secondaryClass}
        href={landingConfig.ruStoreUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {landingContent.hero.secondaryCta}
      </a>
    </div>
  );
}
