import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedIfEmpty } from './seed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// DB lives under backend/data so it can be mounted as a Docker volume.
const DB_PATH = process.env.VOX_DB_PATH || resolve(__dirname, '../data/vox-vault.db');
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS songs (
    id          INTEGER PRIMARY KEY,
    title       TEXT    NOT NULL,
    artist      TEXT    NOT NULL,
    genre       TEXT    NOT NULL,
    vocals      TEXT    NOT NULL DEFAULT '[]',   -- JSON array
    work        TEXT    NOT NULL DEFAULT '',
    tags        TEXT    NOT NULL DEFAULT '[]',   -- JSON array
    date        TEXT    NOT NULL DEFAULT '',     -- YouTube publish date YYYY-MM-DD
    dur         TEXT    NOT NULL DEFAULT '',
    views       INTEGER NOT NULL DEFAULT 0,
    plays       INTEGER NOT NULL DEFAULT 0,
    url         TEXT    NOT NULL DEFAULT '',
    last_played INTEGER,
    created     INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sings (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    date    TEXT    NOT NULL                       -- YYYY-MM-DD
  );
  CREATE INDEX IF NOT EXISTS idx_sings_song ON sings(song_id);
  CREATE INDEX IF NOT EXISTS idx_sings_date ON sings(date);

  CREATE TABLE IF NOT EXISTS favorites (
    song_id INTEGER PRIMARY KEY REFERENCES songs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id      INTEGER PRIMARY KEY,
    name    TEXT NOT NULL,
    en      TEXT NOT NULL DEFAULT '',
    colors  TEXT NOT NULL DEFAULT '[]',           -- JSON array
    created INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS playlist_songs (
    playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    song_id     INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    position    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (playlist_id, song_id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

seedIfEmpty(db);

// ── serializers ────────────────────────────────────────────────────────────
const singsStmt = db.prepare('SELECT id, date FROM sings WHERE song_id = ? ORDER BY date');
const favSet = () =>
  new Set(db.prepare('SELECT song_id FROM favorites').all().map((r) => r.song_id));

export function serializeSong(row, favs) {
  const isFav = favs ? favs.has(row.id) : !!db.prepare('SELECT 1 FROM favorites WHERE song_id = ?').get(row.id);
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    genre: row.genre,
    vocals: JSON.parse(row.vocals || '[]'),
    work: row.work || '',
    tags: JSON.parse(row.tags || '[]'),
    date: row.date,
    dur: row.dur,
    views: row.views,
    plays: row.plays,
    url: row.url || '',
    lastPlayed: row.last_played || null,
    sings: singsStmt.all(row.id).map((r) => ({ id: r.id, date: r.date })),
    favorite: isFav,
  };
}

export function getSong(id) {
  const row = db.prepare('SELECT * FROM songs WHERE id = ?').get(id);
  return row ? serializeSong(row) : null;
}

export function allSongs() {
  const favs = favSet();
  return db
    .prepare('SELECT * FROM songs ORDER BY created DESC, id DESC')
    .all()
    .map((r) => serializeSong(r, favs));
}

export function serializePlaylist(row) {
  const songIds = db
    .prepare('SELECT song_id FROM playlist_songs WHERE playlist_id = ? ORDER BY position, rowid')
    .all(row.id)
    .map((r) => r.song_id);
  return {
    id: row.id,
    name: row.name,
    en: row.en,
    colors: JSON.parse(row.colors || '[]'),
    songIds,
  };
}

export function allPlaylists() {
  return db
    .prepare('SELECT * FROM playlists ORDER BY created, id')
    .all()
    .map(serializePlaylist);
}

export function getPlaylist(id) {
  const row = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
  return row ? serializePlaylist(row) : null;
}

export function favsMap() {
  const m = {};
  for (const id of favSet()) m[id] = true;
  return m;
}

export function getSetting(key, fallback) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value);
}
