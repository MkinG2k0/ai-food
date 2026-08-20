import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { parseAppDeepLink } from '@/shared/lib';

const DEDUPE_MS = 1500;

/**
 * Handles Android widget / custom-scheme launches
 * (`aifood://add/<action>`, `aifood://stats`, `aifood://streak`,
 * `aifood://subscribe/success|fail`).
 * Cold start: App.getLaunchUrl(); warm: appUrlOpen.
 */
export function DeepLinkHandler() {
  const navigate = useNavigate();
  const lastHandledRef = useRef<{ url: string; at: number } | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let removed = false;
    let handle: { remove: () => Promise<void> } | undefined;

    const handleUrl = (url: string | undefined | null) => {
      if (!url) return;

      const now = Date.now();
      const last = lastHandledRef.current;
      if (last && last.url === url && now - last.at < DEDUPE_MS) {
        return;
      }

      const parsed = parseAppDeepLink(url);
      if (!parsed) return;

      lastHandledRef.current = { url, at: now };

      // Close payment Custom Tab / SFSafariViewController (iOS; no-op on Android).
      if (parsed.kind === 'route' && parsed.path.startsWith('/subscribe/')) {
        void Browser.close().catch(() => {
          /* browser may already be dismissed */
        });
      }

      if (parsed.kind === 'route') {
        navigate(parsed.path);
        return;
      }

      navigate({ pathname: '/', search: `?add=${parsed.add}` });
    };

    void App.getLaunchUrl()
      .then((result) => {
        if (removed) return;
        handleUrl(result?.url);
      })
      .catch(() => {
        /* no launch URL */
      });

    void App.addListener('appUrlOpen', ({ url }) => {
      handleUrl(url);
    }).then((listener) => {
      if (removed) {
        void listener.remove();
        return;
      }
      handle = listener;
    });

    return () => {
      removed = true;
      void handle?.remove();
    };
  }, [navigate]);

  return null;
}
