import tailwindcss from '@tailwindcss/vite'

// Two build targets share one codebase:
//  - web (default): server-rendered, so vendor and product pages get proper
//    titles and link previews on Google and WhatsApp.
//  - app (KUSA_TARGET=app): a static single-page build that Capacitor bundles
//    into the iOS and Android apps. Run `npm run cap:sync`.
const isApp = process.env.KUSA_TARGET === 'app'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  ssr: !isApp,

  css: [
    '@fontsource-variable/dm-sans/index.css',
    '@fontsource-variable/bricolage-grotesque/index.css',
    'leaflet/dist/leaflet.css',
    '~/assets/css/main.css',
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Kusa · Find small businesses near you',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#FAF6EE' },
        {
          name: 'description',
          content: 'Find verified small chops, snacks, cakes, jewellery and other small businesses near you, then reach them on WhatsApp.',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'apple-touch-icon', href: '/icon.svg' },
      ],
    },
  },

  // Signed-in areas render in the browser only: they depend on the session
  // kept on the device, and search engines shouldn't index them.
  routeRules: {
    '/vendor/**': { ssr: false },
    '/admin/**': { ssr: false },
    '/account': { ssr: false },
    '/signin': { ssr: false },
    '/saved': { ssr: false },
    '/v/*/rate': { ssr: false },
  },

  runtimeConfig: {
    public: {
      // Where the app finds the API. '/api' on the website (same server). The
      // native apps need the full address, e.g. https://kusa.ng/api, set when
      // running `npm run cap:sync`.
      apiBase: process.env.NUXT_PUBLIC_API_BASE || (isApp ? 'https://kusa.ng/api' : '/api'),
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://kusa.ng',
      buildTarget: isApp ? 'app' : 'web',
      showDemoAccounts: process.env.NUXT_PUBLIC_SHOW_DEMO_ACCOUNTS === 'true',
    },
  },

  nitro: {
    // SQL migrations ship inside the server build and run on start-up.
    serverAssets: [{ baseName: 'migrations', dir: './database/migrations' }],
    // The app bundle is a single page; Capacitor serves index.html for every route.
    ...(isApp ? { prerender: { crawlLinks: false, routes: ['/'] } } : {}),
  },

  typescript: {
    strict: true,
  },
})
