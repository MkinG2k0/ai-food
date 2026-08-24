import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { readFileSync } from 'node:fs';

const appVersion = (
  JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf-8')) as {
    version: string;
  }
).version;

export default defineConfig(({ mode }) => {
  const isMobile = mode === 'mobile';

  return {
    // Capacitor WebView resolves lazy chunks relative to index.html, not /assets/.
    base: isMobile ? './' : '/',
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'screenshot-home.png',
          'screenshot-meal.png',
          'screenshot-stats.png',
          'screenshot-budget.png',
          'screenshot-settings.png',
          'screenshot-streak.png',
        ],
        manifest: {
          name: 'AI Food',
          short_name: 'AI Food',
          description: 'Дневник питания',
          lang: 'ru',
          display: 'standalone',
          start_url: '/',
          theme_color: '#09AF86',
          background_color: '#09AF86',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
          screenshots: [
            {
              src: 'screenshot-home.png',
              sizes: '520x1120',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Главный экран — дневник и КБЖУ',
            },
            {
              src: 'screenshot-meal.png',
              sizes: '520x1120',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Детали приёма пищи',
            },
            {
              src: 'screenshot-stats.png',
              sizes: '520x1120',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Отчёт о питании за неделю',
            },
            {
              src: 'screenshot-budget.png',
              sizes: '520x1120',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Бюджет дня по приёмам',
            },
            {
              src: 'screenshot-streak.png',
              sizes: '520x1120',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Серия дней подряд',
            },
            {
              src: 'screenshot-settings.png',
              sizes: '520x1120',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Настройки и аккаунт',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@ai-food/shared-types': path.resolve(__dirname, './src/shared/types/index.ts'),
      },
    },
    server: {
      port: 5173,
    },
    build: {
      // Main bundle includes all routes; html2pdf is lazy-loaded on PDF export.
      chunkSizeWarningLimit: 1600,
    },
  };
});
