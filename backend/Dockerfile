# Vox Vault — app container: Node API + built React/Vite frontend
# PostgreSQL runs as a separate service (see docker-compose.yml).
# Build context is the repo root.

# ── Stage 1: build the React + TypeScript + Vite frontend ───────────────────
FROM node:22-slim AS frontend
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ── Stage 2: backend runtime + built static assets ──────────────────────────
FROM node:22-slim

ENV NODE_ENV=production
WORKDIR /app

# pg is pure JavaScript — no native compile toolchain needed.
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev

# App source (includes migration-data.json if present) + frontend bundle.
COPY backend/src ./src
COPY --from=frontend /fe/dist ./frontend

ENV VOX_FRONTEND_DIR=/app/frontend
ENV PORT=3000

EXPOSE 3000
CMD ["node", "src/server.js"]
