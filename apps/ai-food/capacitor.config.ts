import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aifood.app',
  appName: 'AI Food',
  webDir: 'dist',
  server: {
    // Point native shell to local Vite dev server during development.
    // Comment this out (or remove) before a production native build.
    // url: 'http://localhost:5173',
    cleartext: true, // allow http on Android debug builds
  },
  android: {
    allowMixedContent: true, // needed when server.url is http
  },
  plugins: {
    StatusBar: {
      // Capacitor: LIGHT = dark icons for light backgrounds (not Style.Dark)
      style: 'LIGHT',
      backgroundColor: '#ffffffff',
    },
  },
};

export default config;
