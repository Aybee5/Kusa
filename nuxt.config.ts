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
      // Leave empty to use the built-in demo data (app/services/mock).
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://kusa.ng',
      buildTarget: isApp ? 'app' : 'web',
    },
  },

  // The app bundle is a single page; Capacitor serves index.html for every route.
  nitro: isApp ? { prerender: { crawlLinks: false, routes: ['/'] } } : {},

  typescript: {
    strict: true,
  },
})
