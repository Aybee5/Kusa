import type { CapacitorConfig } from '@capacitor/cli'

// The app ID is permanent once published to the stores. Change it before the
// first release if you want a different one (e.g. com.yourcompany.kusa).
const config: CapacitorConfig = {
  appId: 'ng.kusa.app',
  appName: 'Kusa',
  // Output of `npm run generate:app` (Nuxt static build with ssr: false).
  webDir: '.output/public',
  backgroundColor: '#FAF6EE',
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'never',
  },
}

export default config
