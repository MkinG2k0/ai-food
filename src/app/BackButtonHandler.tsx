import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const ROOT_PATHS = new Set(['/', '/onboarding']);

/**
 * Android system back / edge-swipe: navigate in-app history instead of
 * leaving the Activity when the WebView stack looks empty.
 */
export function BackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);
  locationRef.current = location;

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') {
      return;
    }

    let removed = false;
    let handle: { remove: () => Promise<void> } | undefined;

    void App.addListener('backButton', ({ canGoBack }) => {
      const { pathname } = locationRef.current;

      if (ROOT_PATHS.has(pathname)) {
        void App.minimizeApp();
        return;
      }

      if (canGoBack) {
        navigate(-1);
        return;
      }

      navigate('/');
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
