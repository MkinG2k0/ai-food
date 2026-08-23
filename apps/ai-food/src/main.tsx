import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { registerSW } from 'virtual:pwa-register';
import { inject } from '@vercel/analytics';
import { startPwaInstallCapture } from '@/features/pwa-install';
import { App } from './app/index';
import './app/styles/global.css';

defineCustomElements(window);
startPwaInstallCapture();
// Service worker is for browser/PWA only. On Android WebView it can cache stale JS.
if (!Capacitor.isNativePlatform()) {
  registerSW({ immediate: true });
}
inject();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
