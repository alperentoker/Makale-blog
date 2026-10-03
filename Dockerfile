# ── Multi-Target Dockerfile for LENS CMS & Edge Research Platform ──

# Aşama 1: Temel Bağımlılıklar (better-sqlite3 derleme desteği ile)
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++ curl
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .

# Aşama 2: Frontend Derleme
FROM base AS builder
RUN npm run build

# Aşama 3: Backend Servisi (Node.js API + SQLite)
FROM node:22-alpine AS backend
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package*.json ./
COPY --from=base /app/server ./server
COPY --from=base /app/src ./src
COPY --from=base /app/tsconfig*.json ./

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/app/data
ENV SITE_URL=https://lens.alperentoker.com

RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

CMD ["npm", "run", "server"]

# Aşama 4: Frontend Servisi (Nginx Reverse Proxy & Static Host)
FROM nginx:alpine AS frontend
RUN apk add --no-cache curl && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
