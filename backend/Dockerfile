# Vox Vault — single container: Node API + built React/Vite frontend
# Build context is the repo root (see docker-compose.yml).

# ── Stage 1: build the React + TypeScript + Vite frontend ───────────────────
FROM node:22-slim AS frontend
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ── Stage 2: backend runtime + built static assets ─────────────────────────
FROM node:22-slim

ENV NODE_ENV=production
WORKDIR /app

# Install backend deps first for better layer caching.
# better-sqlite3 ships prebuilt binaries for linux/x64 and linux/arm64, so no
# compiler is needed; if a prebuild is unavailable for your platform, add
# `python3 make g++` via apt before npm install.
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev

# App source + the frontend bundle produced by stage 1.
COPY backend/src ./src
COPY --from=frontend /fe/dist ./frontend

# DB lives here; mount a volume to persist it across container restarts.
RUN mkdir -p /app/data
ENV VOX_DB_PATH=/app/data/vox-vault.db
ENV VOX_FRONTEND_DIR=/app/frontend
ENV PORT=3000

EXPOSE 3000
CMD ["node", "src/server.js"]
