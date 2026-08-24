import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aifood.app',
  appName: 'AI Food',
  webDir: 'dist',
  // Dev live-reload (HTTP LAN): uncomment url — but getUserMedia won't work (not secure).
  // For camera live-preview use packaged webDir (no server.url) or HTTPS.
  // server: {
  //   url: 'http://192.168.0.199:5173',
  //   cleartext: true,
  // },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#09AF86',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      // Capacitor: LIGHT = dark icons for light backgrounds (not Style.Dark)
      style: 'LIGHT',
      backgroundColor: '#ffffffff',
    },
    LocalNotifications: {
      iconColor: '#09AF86',
      smallIcon: 'ic_stat_notification',
    },
  },
};

export default config;
