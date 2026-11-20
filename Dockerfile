# ─── STAGE 1: Build Frontend Client ───
FROM node:20-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ─── STAGE 2: Production Server Runner ───
FROM node:20-alpine AS runner
WORKDIR /app

# Native build toolchain for better-sqlite3
RUN apk add --no-cache python3 make g++

ENV NODE_ENV=production
ENV PORT=5001
ENV DB_PATH=/data/vertex.db

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/ ./
COPY --from=client-builder /app/client/dist /app/client/dist

# Persistent SQLite storage directory
VOLUME ["/data"]

EXPOSE 5001

CMD ["node", "index.js"]
