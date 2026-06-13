# VOX//VAULT — カラオケアーカイブ

A cyberpunk (holographic glassmorphism) **karaoke library manager** for desktop web,
built from the Claude Design handoff (`Vox Vault.dc.html`). Register songs from
YouTube, organize them into playlists, favorite tracks, log every time you sing a
song, and explore a rich analytics dashboard.

This repo implements the design as a real app: a **Node + Express + SQLite** backend
that persists everything (replacing the prototype's `localStorage`), serving a faithful
**vanilla-JS** recreation of the UI. Ships in a single Docker container.

## Quick start (Docker)

```bash
docker compose up --build
```

Then open **http://localhost:4030**. The database is seeded with the sample
library on first launch and persisted in the `vox-data` Docker volume.
(The container still listens on port 3000 internally; `docker-compose.yml`
maps it to host port **4030**.)

To enable real YouTube search in the register flow, provide a
[YouTube Data API v3](https://developers.google.com/youtube/v3) key:

```bash
YOUTUBE_API_KEY=your_key_here docker compose up --build
```

Without a key the register flow returns mock candidates — the full UI/flow still works.

### Data persistence

By default, the database is stored in a Docker volume (`vox-data`) that survives
container rebuilds and restarts. To mount the data to a host folder instead,
edit `docker-compose.yml`:

```yaml
volumes:
  - ./vox-data:/app/data  # mount host folder instead of named volume
```

Then create the folder and run:

```bash
mkdir -p vox-data
docker compose up --build
```

The SQLite database file (`vox-vault.db`) will now live in `./vox-data/` on your
machine, readable and portable.

## Run locally without Docker

```bash
cd backend
npm install
npm start          # http://localhost:3000  (serves ../frontend too)
```

Requires Node 20+ (developed on Node 22).

## Features

- **ライブラリ (Library)** — high-density list **and** grid views; filter by genre
  (ボカロ / アニソン / アーティスト / ゲーム), free-text search, sortable columns
  (title / publish date / views / sings). The GENRE column only shows on “すべて”.
- **楽曲を登録 (Register)** — 3-step flow: search → pick a YouTube candidate → confirm
  metadata (auto-filled title/artist/date) and set genre, 歌唱ボカロ (vocaloid only),
  作品名 (anime only), and freeform tags → saved to the vault.
- **マイリスト (Playlists)** — create/delete lists, add/remove songs, 4-tile genre-color
  collage covers.
- **お気に入り (Favorites)** — star toggle, grid view.
- **統計 (Analytics)** — genre donut, monthly bars, cumulative area, top-artists bars,
  favorite-rate gauge, a 70-day sing **heatmap**, top songs, and a 30-day daily-sings line.
- **Themes** — HOLO / NEON / ACID, switched from the sidebar, persisted server-side.
- **Sing logging** — the ▶ button records a sing with today's date; all charts derive
  from this history.

## Architecture

```
vox-vault/
├── docker-compose.yml        # one service, persistent volume
├── backend/
│   ├── Dockerfile            # node:22-slim, serves API + static frontend
│   └── src/
│       ├── server.js         # Express REST API + static host
│       ├── db.js             # SQLite schema + serializers (better-sqlite3)
│       ├── seed.js           # sample data ported from the prototype
│       └── youtube.js        # mock search; real YouTube Data API v3 when keyed
└── frontend/
    ├── index.html            # fonts, keyframes, base styles
    └── app.js                # full SPA (render + state + API client)
```

The backend is the source of truth; the frontend hydrates from `GET /api/state` on
load and persists every mutation through the API. Analytics are computed client-side
from the fetched song/sing data, exactly matching the design.

## REST API

| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/api/state` | Full hydration payload: songs, playlists, favorites, settings |
| GET    | `/api/songs` | All songs |
| POST   | `/api/songs` | Register a song `{title, artist, genre, vocals[], work, tags[], date, dur, views, url}` |
| DELETE | `/api/songs/:id` | Delete a song |
| POST   | `/api/songs/:id/play` | Record a sing (歌唱 +1) with today's date |
| PUT    | `/api/songs/:id/favorite` | Toggle favorite |
| GET    | `/api/playlists` | All playlists |
| POST   | `/api/playlists` | Create `{name}` |
| DELETE | `/api/playlists/:id` | Delete a playlist |
| POST   | `/api/playlists/:id/songs` | Add a song `{songId}` |
| DELETE | `/api/playlists/:id/songs/:songId` | Remove a song |
| PUT    | `/api/settings` | Save `{theme}` |
| GET    | `/api/youtube/search?q=` | YouTube candidates (mock or live) |

## Data model

- **songs** — `id, title, artist, genre, vocals[] (JSON), work, tags[] (JSON), date, dur, views, plays, url, last_played, created`
- **sings** — one row per sing event (`song_id, date`) → powers the heatmap / daily / top-songs charts
- **favorites** — `song_id`
- **playlists** — `id, name, en, colors[] (JSON)` + **playlist_songs** join (`playlist_id, song_id, position`)
- **settings** — key/value (currently `theme`)

## Mobile note

The design is desktop-first but structured for later mobile work (sidebar + main,
responsive `auto-fill` grids). Responsive breakpoints are the natural next step.

## Connecting real YouTube data

`backend/src/youtube.js` already implements the live path: with `YOUTUBE_API_KEY`
set it calls `search.list` + `videos.list`, maps results to the candidate shape
(title, channel, views, publish date, duration, thumbnail, video URL), and the
register flow stores the real video URL so 曲名クリック opens the actual video.
```
