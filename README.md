# Kusa

Find small businesses near you: small chops, snacks, cakes, jewellery, fashion, beauty and more. Vendors register, get verified by hand and list their products. Shoppers search by location, category and rating, then reach the vendor on WhatsApp or by phone. Admins verify vendors, moderate reviews and manage shoppers.

One codebase, three things:

- **Website + API**: Nuxt 4. Public pages are server-rendered (so vendor and product pages show up on Google and make proper WhatsApp link previews); the API lives in `server/api` and talks to Postgres through Drizzle.
- **iOS and Android apps**: the same Vue app bundled with [Capacitor](https://capacitorjs.com). `android/` and `ios/` are ready, with permissions, icons and splash screens; they call the API over HTTPS.
- **Admin console** at `/admin`.

## Quick start

Needs Node 22+ and Postgres 14+ (Docker is easiest).

```bash
cp .env.example .env
docker compose up -d db      # Postgres + PostGIS on localhost:5432 matching .env
npm install
npm run dev                  # http://localhost:3000
```

On start-up the server applies database migrations and, in development, loads demo data into an empty database. Every business, person and number in the demo data is made up.

In development no email or SMS is sent: the sign-in code is shown on screen (it's `123456`). Sign-in is by email unless you change `SIGNIN_METHODS`. Demo accounts:

| Who | Email | Phone |
| --- | --- | --- |
| Shopper (Aisha) | aisha@demo.kusa.ng | 0813 000 0954 |
| Vendor (Mama Hadiza Small Chops) | mama-hadiza-small-chops@demo.kusa.ng | 0803 000 4417 |
| Admin | admin@demo.kusa.ng | 0800 000 0001 |
| Anyone else | creates a new shopper | creates a new shopper |

The sign-in page has buttons that fill these in.

Useful scripts:

| Command | What it does |
| --- | --- |
| `npm run db:reset` | Drop everything, migrate, load demo data |
| `npm run db:migrate` | Apply new migrations |
| `npm run db:seed` | Load demo data into an empty database |
| `npm run db:generate` | Create a migration after editing `server/database/schema.ts` |
| `npm run db:studio` | Browse the database (Drizzle Studio) |
| `npm run typecheck` | Type-check app and server |
| `npm run test:api` | API checks (run against `npm run dev` on a freshly reset database) |

## What's in it

**Shoppers** (`/`, `/search`, `/v/:slug`, `/p/:id`)
- Discover page with categories, businesses close to you and new listings
- Search with a map: distance, rating (3.5+, 4+, 4.5+), category, open now, delivery and pickup; sort by nearest or top rated. Filters live in the URL so results can be shared.
- "Near me" from the device location (Capacitor Geolocation in the apps, the browser API on the web), falling back to central Kano
- Vendor profile with cover photo and logo, products, reviews (average, star breakdown, written reviews, report) and opening hours
- Contact buttons the vendor chooses: WhatsApp, Instagram and/or Call, with their main one first and highlighted, plus directions
- Product page with photo and size options; "Order on WhatsApp" opens a pre-filled message, "Order on Instagram" opens a DM and copies the order message to paste
- Phone sign-in, one rating per business (editable), saved businesses
- Sponsored placements, always labelled: a Featured row and banners on the home page, sponsored businesses, a product and a banner in search results

**Vendors** (`/vendor/signup`, `/vendor`, `/vendor/listings`)
- Sign-up: email (or phone, depending on `SIGNIN_METHODS`), business details with a business phone number, contact buttons and a location pin, then verification (government ID, selfie, optional proof of business) using the camera; photos upload privately
- Dashboard: profile views and unique visitors for 7 or 30 days with change on the previous period, a daily chart, WhatsApp taps, calls, direction requests, how shoppers found them, rating and most viewed products
- My shop (`/vendor/shop`): edit everything after sign-up: cover photo and logo, name, category, about, business phone, contact buttons and main button (with a live preview), opening hours and closed days, area, map pin, landmark, pickup and delivery
- Listings: add, edit and delete products (photo, price or size options with their own prices, description), mark items sold out
- Promote (`/vendor/promote`): request a featured spot, a banner ad (own image or a text banner, with live preview) or a promoted product for 7, 14 or 30 days, choose the city and where it shows, see the price and how to pay, add a transfer reference; then track impressions, taps and days left

**Admin** (`/admin`, admins only)
- Vendors: verification queue, search and filters, suspend with a reason, reinstate
- Vendor review: the uploaded ID and selfie (short-lived private links), reviewer checklist, approve, request changes or reject with a note, suspend
- Reviews: flagged reviews with the reason and reviewer history; keep, hide or restore
- Shoppers: search, clear flags, suspend with a reason (signs them out and stops their ratings counting), reinstate
- Promotions: requests with the amount and payment reference; approve once paid, or reject with a reason; end any promotion early; create promotions directly (deals agreed outside the app, free trials, or Kusa's own banners with a link)

Pages work from 360px phones to wide laptops.

## How the backend works

```
server/
  api/                 REST routes (file-based, see below)
  database/
    schema.ts          tables (Drizzle)
    migrations/        SQL generated by drizzle-kit, applied on start-up
    seed.ts, demo-data.ts
  utils/               auth, search, ratings, files, SMS, config
  plugins/             migrations + seed on start-up, upload storage
  middleware/api.ts    CORS for the native apps
shared/                types and helpers used by both app and server
```

**Endpoints** (all under `/api`; inputs validated with zod)

| Area | Endpoints |
| --- | --- |
| Public | `GET /vendors?lat&lng&q&category&minRating&openNow&delivery&pickup&radiusKm&sort` (leave out `lat`/`lng` to browse anywhere), `GET /areas`, `GET /health`, `GET /vendors/:slug`, `GET /vendors/:id/products`, `GET /vendors/:id/reviews`, `GET /products/latest`, `GET /products/:id`, `POST /vendors/:id/events`, `GET /files/:key`, `GET /promoted?placement=home\|search&…same filters`, `POST /promotions/:id/events`, `GET /promotions/plans` |
| Auth | `GET /auth/options`, `POST /auth/code` (`{ email }` or `{ phone }`), `POST /auth/verify`, `GET /auth/me`, `POST /auth/logout` |
| Signed in | `POST /vendors/:id/reviews`, `GET /vendors/:id/reviews/mine`, `POST /reviews/:id/report`, `POST /uploads` |
| Vendor | `GET/POST/PATCH /me/vendor`, `POST /me/vendor/verification`, `GET /me/vendor/stats`, `GET/POST /me/products`, `PATCH/DELETE /me/products/:id`, `GET/POST /me/promotions`, `PATCH /me/promotions/:id` |
| Admin | `GET /admin/vendors`, `GET/PATCH /admin/vendors/:id`, `GET /admin/vendors/:id/products`, `GET /admin/reviews`, `PATCH /admin/reviews/:id`, `GET /admin/shoppers`, `PATCH /admin/shoppers/:id`, `GET/POST /admin/promotions`, `PATCH /admin/promotions/:id` |

**Sign-in.** A 6-digit code by email or SMS (10-minute expiry, 5 tries, one code per minute), no passwords. `SIGNIN_METHODS` decides which: `email` (the default, cheapest), `phone`, or both, where the first is offered first and the other appears as "Use … instead". To move to SMS when there's budget, set `SIGNIN_METHODS=phone,email`: new sign-ins start with a phone number, and people who joined by email still sign in by email. An account is identified by the email or phone it signed in with; each is only ever saved from a confirmed code. Email goes through `EMAIL_PROVIDER`: `console` (development), `resend` (Resend API) or `smtp` (any SMTP service, e.g. Zoho, Brevo, Mailgun). SMS goes through Termii. Codes and session tokens are stored only as hashes. The app sends `Authorization: Bearer <token>`, which works the same on the website and in the native apps. Sessions last 60 days (`SESSION_DAYS`). Addresses in `ADMIN_EMAILS` and numbers in `ADMIN_PHONES` become admins when they sign in.

**Contact buttons.** Every business has a business phone number (required; it's how Kusa reaches them). Shoppers see the buttons the vendor turns on: WhatsApp (their business number or another one), Instagram (username), and Call. At least one must be on, and the vendor picks the main one. Taps on each are counted for the vendor's dashboard.

**Location.** Shoppers choose how results are measured, and none of the options require sharing their location:
- **Use my current location:** closest first. The point is sent with each search to sort results; it isn't stored on the server.
- **Choose an area:** neighbourhoods and cities that have verified businesses (`GET /api/areas`), with a search box, plus "All of <city>".
- **Search this area:** pan the map and search around its centre, to look anywhere.
- **Browse anywhere:** no location at all; no distances, best rated first, from every city.

Until they choose, results are sorted from a default area (central Kano), labelled as the default. The choice is remembered on the device. Vendors mark their shop by tapping the map or dragging a pin; sharing their phone's location is optional. Registration also asks for the area and city, which feed the area list.

**Search.** Every filter (distance, category, rating, open now, delivery, pickup, text) and both sorts run in the database, so the 100 results returned are always the right 100.

**Near-me search engine (`GEO_SEARCH`).** Two interchangeable modes, chosen with an environment variable:
- `basic` (default): latitude/longitude columns, an indexed bounding box and a flat-earth distance, all in SQL. Runs on any Postgres.
- `postgis`: a generated `geography` column with a GiST index; the database filters by radius (`ST_DWithin`) and returns nearest first using the index (KNN). Use it once you have tens of thousands of businesses.

With `GEO_SEARCH=postgis`, start-up enables the extension and adds the column and index if missing. If the database can't (no PostGIS, or no permission to create extensions), the server logs why and stays on `basic`, so nothing breaks. Switching back needs no database changes. `GET /api/health` shows which mode is active. The code is in `server/utils/geo.ts`.

**Ratings.** One rating per shopper per business. Averages count only published reviews from accounts that aren't suspended. Each business stores its average, count and star breakdown (`rating_avg`, `rating_count`, `rating_breakdown`), and database triggers recount them whenever a review is added, edited, reported, hidden or deleted, or a reviewer is suspended or reinstated. So "Top rated" and the minimum-rating filter run in the database and stay correct however many businesses match. The triggers live in migration `0001_vendor_ratings.sql`. A new account posting several ratings within an hour is flagged automatically, and vendors or shoppers can report a review for admins to check.

**Promotions.** Three kinds: a featured business, a banner ad, a promoted product. A verified vendor picks one, a duration and a start date; the price is fixed from the plan at that moment and the request waits. An admin approves it once the payment arrives, and it runs from the requested start (or from approval, if that's later) for exactly its number of days. Nothing needs to run when it expires: whether a promotion is waiting, scheduled, running or ended is worked out from its status and dates on every request.
- *Targeting.* City: the shopper's city is the nearest city centre within 60 km of where they're searching from. Shoppers browsing anywhere see every city; shoppers far from any city see only "all cities" promotions. Category: an untargeted promotion shows on the home page and in every search; a category one only when that category is being browsed.
- *Relevance.* Sponsored businesses in search must still match the shopper's filters (category, rating, open now, delivery, text). Only the distance limit is relaxed, and the card shows how far away they are. A sponsored business isn't repeated in the results below it.
- *Fairness.* When more promotions qualify than there are slots, a fresh random pick is made on each request, one per vendor.
- *Stats.* Impressions (at least half on screen) and taps are counted per day, only while a promotion is running. Visits from sponsored slots also show in the vendor's "How shoppers found you" as "Your promotions on Kusa".
- *Prices and payment.* Defaults: featured ₦5,000 / ₦9,000 / ₦16,000, banner ₦10,000 / ₦18,000 / ₦32,000, product ₦3,000 / ₦5,500 / ₦10,000 for 7 / 14 / 30 days. Change them with `PROMOTION_PRICES` (the apps read prices from the server, so no app release is needed). Set `PAYMENT_BANK_NAME`, `PAYMENT_ACCOUNT_NAME` and `PAYMENT_ACCOUNT_NUMBER` to show your account on the request form; without them, vendors are told Kusa will contact them on WhatsApp.

**Views and visitors.** Vendor and product pages send `POST /vendors/:id/events`: a view (a unique visitor the first time a device opens that vendor on a Lagos day), WhatsApp, call or directions taps, and where the shopper came from (search, map, shared link, other site). Counts are kept per day.

**Photos.** Uploads are checked to be real JPEG, PNG or WebP files (max 6 MB; the app shrinks them first). Product photos are public; ID and selfie photos are private and only reachable through signed links that expire after 15 minutes. Storage is a folder on disk by default, or any S3-compatible bucket (Cloudflare R2, AWS S3…) with the `S3_*` settings.

## Deploying

The server is a standard Node app (`.output/server/index.mjs`) that needs a Postgres database.

1. Create a database (Neon, Supabase, Railway, RDS, or your own) and set `DATABASE_URL` (add `?sslmode=require` for hosted ones).
2. Set `AUTH_SECRET` (long random string), `ADMIN_EMAILS` (and/or `ADMIN_PHONES`), `GEO_SEARCH` (`basic` or `postgis`), sign-in: `SIGNIN_METHODS`, `EMAIL_PROVIDER` with `RESEND_API_KEY` or `SMTP_URL` and `EMAIL_FROM` (and `SMS_PROVIDER=termii` with `TERMII_API_KEY` and `TERMII_SENDER_ID` once SMS is on), the `S3_*` settings for photos, and the `PAYMENT_*` settings (plus `PROMOTION_PRICES` if you want different prices).
3. Build and run: `npm run build && node .output/server/index.mjs`, or use the `Dockerfile` (`docker compose --profile full up --build` runs it locally with a database).

Migrations run automatically when the server starts. Leave `SEED_DEMO_DATA` unset in production.

### Staging (kusa.yasr.app)

Staging runs on the OCI server (`ssh oci`). Caddy (`/etc/caddy/Caddyfile`) serves `kusa.yasr.app` with a Let's Encrypt certificate and a `noindex` header and proxies to `127.0.0.1:3100`; Cloudflare proxies the domain to the server (SSL mode Full). The app now needs its database, so staging runs both with `docker-compose.staging.yml` (Postgres + PostGIS, then the web/API server on `127.0.0.1:3100`, loading the demo data and demo photos into an empty database). Settings go in `~/kusa/.env.staging` on the server (from `.env.example`; at least `AUTH_SECRET`). To redeploy:

```bash
rsync -az --delete --exclude node_modules --exclude .nuxt --exclude .output --exclude .git --exclude android --exclude ios --exclude .env.staging ./ oci:~/kusa/
ssh oci 'cd ~/kusa && docker rm -f kusa-staging 2>/dev/null; docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build'
```

The first time, `docker rm -f kusa-staging` removes the old single container that served the earlier version, so the new stack can take port 3100.

Demo photos are in `public/images` (credits in the `CREDITS.md` files there).

## The iOS and Android apps

```bash
NUXT_PUBLIC_API_BASE=https://your-domain/api npm run cap:sync   # static build, copied into android/ and ios/
npm run cap:android   # opens Android Studio
npm run cap:ios       # opens Xcode (macOS)
```

The app build has no server of its own; it calls the API at `NUXT_PUBLIC_API_BASE`, so deploy the server first. The API already allows requests from the apps (`CORS_ORIGINS`).

**Before the first store release:**

1. **App ID.** The `appId` in `capacitor.config.ts` is `ng.kusa.app`. It can't change once published, so set the final one there, then update `applicationId` in `android/app/build.gradle` and the bundle identifier in Xcode.
2. **Android.** In Android Studio: *Build → Generate Signed App Bundle*, then upload the `.aab` to Google Play Console. Bump `versionCode` / `versionName` in `android/app/build.gradle` for each release.
3. **iOS.** In Xcode: choose your team under *Signing & Capabilities*, set the version and build number, then *Product → Archive* and upload to App Store Connect. iOS uses Swift Package Manager, so CocoaPods isn't needed.
4. **Icons and splash.** Generated from `assets/`. Replace the PNGs and run `npx @capacitor/assets generate --android --ios` to change them.
5. **Permissions** are declared: location (nearby businesses) and camera / photos (verification and product photos), with the explanations iOS shows people in `ios/App/App/Info.plist`.

## Before launch

- Switch map tiles from OpenStreetMap's public servers (fine for development) to a provider with a production plan, e.g. MapTiler, Stadia or Mapbox, in `app/components/NearbyMap.vue`.
- Set up email sending: verify your domain with the email provider (SPF and DKIM records) so sign-in codes don't land in spam, and set `EMAIL_FROM` to an address on that domain.
- Notify vendors (by email now, SMS later) when they're approved, asked for changes or suspended (hook point marked in `server/api/admin/vendors/[id]/index.patch.ts`).
- Replace the review time placeholder "[X] working days" in the vendor verification step.
- Add real Help, Terms and Privacy pages (linked in the footer), including how ID photos are stored and for how long.
- Confirm promotion prices and set your payment account (`PROMOTION_PRICES`, `PAYMENT_*`). Add online payment (Paystack) later if manual confirmation becomes slow.
- Text vendors when a promotion is approved or rejected, and tell admins about new requests (hook points in `server/api/admin/promotions/[id].patch.ts` and `server/api/me/promotions/index.post.ts`).
- Publish advertising rules (what banners may say or show, refunds) and link them from the Promote page.
- Put the API behind a rate limiter (Cloudflare, your host, or a reverse proxy) for `/api/auth/*` and `/api/uploads`.
