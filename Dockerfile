# Server-rendered web build (see README "Building › Website").
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
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
