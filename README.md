# Kusa

Find small businesses near you: small chops, snacks, cakes, jewellery, fashion, beauty and more. Vendors register, get verified by hand and list their products. Shoppers search by location, category and rating, then reach the vendor on WhatsApp or by phone. Admins verify vendors, moderate reviews and manage shoppers.

One Vue codebase ships as:

- **A website**: server-rendered with Nuxt, so vendor and product pages show up on Google and make proper link previews on WhatsApp. It works on phones and laptops.
- **iOS and Android apps**: the same app bundled with [Capacitor](https://capacitorjs.com). The `android/` and `ios/` projects are already set up with permissions, icons and splash screens.

> The app currently runs on **demo data** (`app/services/mock`). Every business, person and number in it is made up. Point `NUXT_PUBLIC_API_BASE` at the real backend when it's ready (see [Backend](#backend)).

## Quick start

Needs Node 22+.

```bash
npm install
npm run dev          # http://localhost:3000
```

Demo sign-in uses code **123456**:

| Who | Phone |
| --- | --- |
| Shopper (Aisha) | 0813 000 0954 |
| Vendor (Mama Hadiza Small Chops) | 0803 000 4417 |
| Any other number | creates a new shopper |

The admin console is at `/admin` (no sign-in in the demo).

Demo data lives in memory, so it resets when you reload the page.

## What's in it

**Shoppers** (`/`, `/search`, `/v/:slug`, `/p/:id`)
- Discover page with categories, businesses close to you and new listings
- Search with a map: distance, rating (3.5+, 4+, 4.5+), category, open now, delivery and pickup filters; sort by nearest or top rated. Filters live in the URL, so results can be shared.
- "Near me" from the device location (Capacitor Geolocation in the apps, the browser API on the web), falling back to central Kano
- Vendor profile with products, reviews (average, star breakdown, written reviews, report) and opening hours
- Product page with options (e.g. pack sizes) and "Order on WhatsApp" with a pre-filled message
- Rate a vendor (signed-in shoppers, once per business, editable), saved businesses, phone sign-in

**Vendors** (`/vendor/signup`, `/vendor`, `/vendor/listings`)
- Three-step sign-up: phone, business details with location pin, then verification (government ID, selfie, optional proof of business) using the camera
- Dashboard: profile views and unique visitors for 7 or 30 days with change on the previous period, a daily chart, WhatsApp taps, calls, direction requests, how shoppers found them, rating and most viewed products
- Listings: add products with a photo, mark items sold out

**Admin** (`/admin`)
- Vendors: verification queue, search and filters, suspend with a reason, reinstate
- Vendor review: documents, reviewer checklist (Approve unlocks when every check is ticked), approve, request changes, reject, suspend
- Reviews: flagged reviews with the reason and reviewer history; keep, hide or restore
- Shoppers: search, clear flags, suspend with a reason (their ratings stop counting), reinstate

Pages work from 360px phones to wide laptops: bottom tabs on phones, a top header (shoppers) or sidebar (vendors, admin) on larger screens.

## Project layout

```
app/
  pages/            routes (shopper, vendor/, admin/)
  layouts/          default (shopper), bare (focused flows), vendor, admin
  components/       UI pieces; admin/ ones are prefixed Admin*
  composables/      useApi, useSession, useLocation, useSaved, useContact, useTrackView…
  services/
    api.ts          the backend contract (KusaApi)
    mock/           demo implementation and seed data
    http.ts         the same contract over REST
  utils/            formatting, distance and opening hours, storage, photos
  types/            shared types
android/  ios/      native projects (Capacitor)
assets/             source images for app icons and splash screens
```

Styling is Tailwind CSS v4; the colours and fonts are in `app/assets/css/main.css`. Fonts (Bricolage Grotesque and DM Sans) are bundled, so the apps work offline.

## Building

### Website

```bash
npm run build                 # server-rendered build in .output/
node .output/server/index.mjs # or deploy to Vercel, Netlify, Cloudflare, a VPS…
```

Signed-in areas (`/vendor`, `/admin`, `/account`, rating) render in the browser only; public pages are server-rendered.

### Staging (kusa.yasr.app)

Staging runs on the OCI server (`ssh oci`) as the Docker container `kusa-staging` on `127.0.0.1:3100`. Caddy (`/etc/caddy/Caddyfile`) serves `kusa.yasr.app` in front of it with a Let's Encrypt certificate and a `noindex` header. Cloudflare proxies the domain to the server (SSL mode Full). To redeploy:

```bash
rsync -az --delete --exclude node_modules --exclude .nuxt --exclude .output --exclude .git --exclude android --exclude ios ./ oci:~/kusa/
ssh oci 'cd ~/kusa && docker build -t kusa:staging --build-arg NUXT_PUBLIC_SITE_URL=https://kusa.yasr.app . \
  && docker rm -f kusa-staging \
  && docker run -d --name kusa-staging --restart unless-stopped -p 127.0.0.1:3100:3000 kusa:staging'
```

### iOS and Android apps

```bash
npm run cap:sync      # static build (KUSA_TARGET=app) + copy into android/ and ios/
npm run cap:android   # sync, then open Android Studio
npm run cap:ios       # sync, then open Xcode (macOS)
```

Run `npm run cap:sync` after every change to the web code before building the apps.

**Before the first store release:**

1. **App ID.** The `appId` in `capacitor.config.ts` is `ng.kusa.app`. It can't change once published, so set the final one in `capacitor.config.ts`, then update `applicationId` in `android/app/build.gradle` and the bundle identifier in Xcode.
2. **Android.** In Android Studio: *Build → Generate Signed App Bundle*, create or use your upload key, and upload the `.aab` to Google Play Console. Bump `versionCode` / `versionName` in `android/app/build.gradle` for each release.
3. **iOS.** In Xcode: choose your team under *Signing & Capabilities*, set the version and build number, then *Product → Archive* and upload to App Store Connect. iOS uses Swift Package Manager, so CocoaPods isn't needed.
4. **Icons and splash.** Generated from `assets/`. To change them, replace the PNGs and run `npx @capacitor/assets generate --android --ios`.
5. **Permissions** are already declared: location (finding nearby businesses) and camera / photos (vendor verification and product photos), with the explanations iOS shows people in `ios/App/App/Info.plist`.

## Backend

`app/services/api.ts` defines everything the app needs (`KusaApi`). `app/services/http.ts` implements it over REST with proposed endpoints:

| Area | Endpoints |
| --- | --- |
| Shoppers | `GET /vendors?lat&lng&q&category&minRating&openNow&delivery&pickup&radiusKm&sort`, `GET /vendors/:slug`, `GET /vendors/:id/products`, `GET /products/:id`, `GET /products/latest`, `GET/POST /vendors/:id/reviews`, `POST /reviews/:id/report`, `POST /vendors/:id/events` |
| Auth | `POST /auth/code`, `POST /auth/verify` (phone + SMS code, returns the user) |
| Vendors | `POST /me/vendor`, `POST /me/vendor/:id/verification`, `GET /me/vendor/:id/stats`, `GET/POST /me/products`, `PATCH /me/products/:id` |
| Admin | `GET /admin/vendors`, `GET/PATCH /admin/vendors/:id`, `GET /admin/reviews`, `PATCH /admin/reviews/:id`, `GET /admin/shoppers`, `PATCH /admin/shoppers/:id` |

Set `NUXT_PUBLIC_API_BASE` (see `.env.example`) and the app switches from demo data to the API. Things the backend should own:

- **Location search.** Postgres with PostGIS makes "within N km, sorted by distance or rating" one query (`ST_DWithin` / `ST_Distance`).
- **Ratings.** Store every rating; compute average and breakdown server-side; exclude hidden reviews and suspended shoppers; one rating per shopper per vendor.
- **Views and visitors.** `POST /vendors/:id/events` receives `view` (with `firstVisitToday`), `whatsapp`, `call` and `directions`. Aggregate per day for the vendor dashboard and record the traffic source.
- **Sign-in.** Phone number + SMS code (e.g. Termii or Africa's Talking); issue tokens that work in the apps as well as the browser.
- **Uploads.** ID and selfie photos go to private storage only admins can read; product photos to public storage behind an image CDN that resizes for slow connections.
- **Roles.** Check shopper, vendor and admin roles on every request. The app's own role checks are only for the interface.

## Before launch

- Switch map tiles from OpenStreetMap's public servers (fine for development) to a provider with a production plan, e.g. MapTiler, Stadia or Mapbox, in `app/components/NearbyMap.vue`.
- Replace the review time placeholder "[X] working days" in the vendor verification step.
- Add real Help, Terms and Privacy pages (linked in the footer).
