import type { CapacitorConfig } from '@capacitor/cli';

// Remote loading is a development preview, not the store release configuration.
const config: CapacitorConfig = {
  appId: 'life.seum.app',
  appName: '세움',
  webDir: 'mobile-web',
  server: {
    url: 'https://seum-nu.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: { presentationOptions: [] },
  },
};

export default config;
