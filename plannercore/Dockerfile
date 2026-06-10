# Stage 1: Frontend bauen
FROM node:22-alpine AS webbuild
WORKDIR /web
COPY web/package*.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

# Stage 2: Server + Frontend + Branding
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

RUN apk --no-cache add wget tzdata

COPY server/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY server/ ./
COPY --from=webbuild /web/dist ./public

# Theme CSS als statisches Asset bereitstellen
COPY web/src/theme-tsunami.css ./public/assets/theme-tsunami.css

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN mkdir -p /var/lib/branding/logos && chown -R appuser:appgroup /app /var/lib/branding

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

CMD ["node", "src/index.js"]
