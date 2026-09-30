import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { inject } from '@vercel/analytics';
import { startPwaInstallCapture } from '@/features/pwa-install';
import { startPwaUpdateRegistration } from '@/features/pwa-update';
import { App } from './app/index';
import './app/styles/global.css';

defineCustomElements(window);
startPwaInstallCapture();
// Service worker is for browser/PWA only. On Android WebView it can cache stale JS.
if (!Capacitor.isNativePlatform()) {
  startPwaUpdateRegistration();
}
inject();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
