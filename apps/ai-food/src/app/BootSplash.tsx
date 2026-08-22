import { useEffect, useState, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthHydrated } from '@/features/auth';
import { useProfileHydrated } from '@/features/onboarding';
import splashLogoUrl from '@/shared/assets/splash-logo.png';

const EXIT_MS = 320;
const BRAND = '#09AF86';

interface BootSplashProps {
  children: ReactNode;
}

export function BootSplash({ children }: BootSplashProps) {
  const authHydrated = useAuthHydrated();
  const profileHydrated = useProfileHydrated();
  const storesReady = authHydrated && profileHydrated;
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function handoffFromNative() {
      if (!Capacitor.isNativePlatform()) return;
      try {
        await StatusBar.setBackgroundColor({ color: BRAND });
        await StatusBar.setStyle({ style: Style.Dark });
      } catch {
        /* web / unsupported */
      }
      try {
        await SplashScreen.hide({ fadeOutDuration: 180 });
      } catch {
        /* plugin missing in some builds */
      }
      if (cancelled) return;
    }

    void handoffFromNative();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!storesReady || !showOverlay) return;

    const timer = window.setTimeout(() => {
      setShowOverlay(false);
    }, 80);

    return () => window.clearTimeout(timer);
  }, [storesReady, showOverlay]);

  useEffect(() => {
    if (showOverlay || !Capacitor.isNativePlatform()) return;

    let cancelled = false;
    async function restoreChrome() {
      try {
        await StatusBar.setBackgroundColor({ color: '#ffffff' });
        await StatusBar.setStyle({ style: Style.Light });
      } catch {
        /* ignore */
      }
      if (cancelled) return;
    }

    const timer = window.setTimeout(() => {
      void restoreChrome();
    }, EXIT_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [showOverlay]);

  return (
    <>
      {children}
      <AnimatePresence>
        {showOverlay ? (
          <motion.div
            key="boot-splash"
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
            style={{
              background:
                'radial-gradient(ellipse 70% 55% at 50% 46%, #2bc49a 0%, #09AF86 42%, #078a6a 100%)',
            }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: EXIT_MS / 1000, ease: 'easeOut' }}
            aria-hidden={!showOverlay}
          >
            <motion.div
              className="flex flex-col items-center gap-5"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <img
                src={splashLogoUrl}
                alt=""
                width={112}
                height={112}
                className="h-28 w-28 rounded-[1.75rem] object-cover drop-shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
                draggable={false}
              />
              <p className="text-[1.65rem] font-semibold tracking-tight text-white">
                AI Food
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
