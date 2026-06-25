import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kyvra.app',
  appName: 'Kyvra',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: ['*']
  }
};

export default config;
