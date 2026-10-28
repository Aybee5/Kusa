# Web app + API server. Needs DATABASE_URL and AUTH_SECRET at runtime (see .env.example).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
ARG NUXT_PUBLIC_SITE_URL=https://kusa.ng
ARG NUXT_PUBLIC_API_BASE=
ENV NUXT_PUBLIC_SITE_URL=$NUXT_PUBLIC_SITE_URL NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE
RUN npx nuxt prepare && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 UPLOADS_DIR=/data/uploads
COPY --from=build /app/.output ./.output
# Photos are stored here unless S3 is configured; mount a volume on it.
RUN mkdir -p /data/uploads && chown node:node /data/uploads
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
