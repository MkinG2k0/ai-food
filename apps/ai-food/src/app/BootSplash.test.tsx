import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BootSplash } from './BootSplash';

const hide = vi.fn().mockResolvedValue(undefined);
const setBackgroundColor = vi.fn().mockResolvedValue(undefined);
const setStyle = vi.fn().mockResolvedValue(undefined);

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
  registerPlugin: vi.fn(() => ({})),
}));

vi.mock('@capacitor/splash-screen', () => ({
  SplashScreen: { hide: (...args: unknown[]) => hide(...args) },
}));

vi.mock('@capacitor/status-bar', () => ({
  StatusBar: {
    setBackgroundColor: (...args: unknown[]) => setBackgroundColor(...args),
    setStyle: (...args: unknown[]) => setStyle(...args),
  },
  Style: { Dark: 'DARK', Light: 'LIGHT' },
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      className,
      style,
    }: {
      children?: React.ReactNode;
      className?: string;
      style?: React.CSSProperties;
    }) => (
      <div className={className} style={style}>
        {children}
      </div>
    ),
  },
}));

vi.mock('@/shared/assets/splash-logo.png', () => ({
  default: '/splash-logo.png',
}));

let authHydrated = false;
let profileHydrated = false;

vi.mock('@/features/auth', () => ({
  useAuthHydrated: () => authHydrated,
}));

vi.mock('@/features/onboarding', () => ({
  useProfileHydrated: () => profileHydrated,
}));

describe('BootSplash', () => {
  beforeEach(() => {
    authHydrated = false;
    profileHydrated = false;
    hide.mockClear();
    setBackgroundColor.mockClear();
    setStyle.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows brand overlay until stores hydrate', () => {
    render(
      <BootSplash>
        <div>app</div>
      </BootSplash>
    );

    expect(screen.getByText('AI Food')).toBeInTheDocument();
    expect(screen.getByText('app')).toBeInTheDocument();
  });

  it('dismisses overlay after auth and profile hydrate', async () => {
    vi.useFakeTimers();
    authHydrated = true;
    profileHydrated = true;

    render(
      <BootSplash>
        <div>app</div>
      </BootSplash>
    );

    expect(screen.getByText('AI Food')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.queryByText('AI Food')).not.toBeInTheDocument();
  });
});
