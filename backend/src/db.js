import pg from 'pg';
import { seedIfEmpty } from './seed.js';

export const pool = new pg.Pool({
  connectionString: process.env.PG_CONNECTION_STRING || 'postgresql://voxvault:voxvault@localhost:5432/voxvault',
  max: 10,
});

// ── transaction helper ────────────────────────────────────────────────────────
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ── schema ────────────────────────────────────────────────────────────────────
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS songs (
    id          BIGINT PRIMARY KEY,
    title       TEXT    NOT NULL,
    artist      TEXT    NOT NULL,
    genre       TEXT    NOT NULL,
    vocals      JSONB   NOT NULL DEFAULT '[]',
    work        TEXT    NOT NULL DEFAULT '',
    tags        JSONB   NOT NULL DEFAULT '[]',
    date        TEXT    NOT NULL DEFAULT '',
    dur         TEXT    NOT NULL DEFAULT '',
    views       BIGINT  NOT NULL DEFAULT 0,
    plays       INTEGER NOT NULL DEFAULT 0,
    url         TEXT    NOT NULL DEFAULT '',
    artists     JSONB   NOT NULL DEFAULT '[]',
    rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
    last_played BIGINT,
    created     BIGINT  NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sings (
    id      BIGSERIAL PRIMARY KEY,
    song_id BIGINT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    date    TEXT   NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sings_song  ON sings(song_id);
  CREATE INDEX IF NOT EXISTS idx_sings_date  ON sings(date);

  CREATE TABLE IF NOT EXISTS favorites (
    song_id BIGINT PRIMARY KEY REFERENCES songs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id      BIGINT PRIMARY KEY,
    name    TEXT   NOT NULL,
    en      TEXT   NOT NULL DEFAULT '',
    colors  JSONB  NOT NULL DEFAULT '[]',
    created BIGINT NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS playlist_songs (
    playlist_id BIGINT  NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    song_id     BIGINT  NOT NULL REFERENCES songs(id)     ON DELETE CASCADE,
    position    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (playlist_id, song_id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

// ── init (called once at server startup) ─────────────────────────────────────
export async function initDb() {
  for (let i = 0; i < 12; i++) {
    try {
      await pool.query('SELECT 1');
      break;
    } catch {
      if (i === 11) throw new Error('PostgreSQL did not become ready in time');
      console.log(`[db] waiting for PostgreSQL… (${i + 1}/12)`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  await pool.query(SCHEMA);
  await seedIfEmpty(pool);
}

// ── serializers ───────────────────────────────────────────────────────────────
function serializeSong(row, favSet, sings = []) {
  const artists =
    Array.isArray(row.artists) && row.artists.length
      ? row.artists
      : row.artist
      ? [row.artist]
      : [];
  return {
    id:         Number(row.id),
    title:      row.title,
    artist:     row.artist,
    genre:      row.genre,
    vocals:     Array.isArray(row.vocals) ? row.vocals : [],
    work:       row.work || '',
    tags:       Array.isArray(row.tags)   ? row.tags   : [],
    date:       row.date,
    dur:        row.dur,
    views:      Number(row.views),
    plays:      Number(row.plays),
    url:        row.url || '',
    artists,
    rating:     row.rating ?? null,
    lastPlayed: row.last_played ? Number(row.last_played) : null,
    sings:      sings.map((s) => ({ id: Number(s.id), date: s.date })),
    favorite:   favSet ? favSet.has(Number(row.id)) : false,
  };
}

function serializePlaylist(row, songIds) {
  return {
    id:      Number(row.id),
    name:    row.name,
    en:      row.en,
    colors:  Array.isArray(row.colors) ? row.colors : [],
    songIds: songIds.map(Number),
  };
}

// ── public query API ──────────────────────────────────────────────────────────
export async function getSong(id) {
  const { rows } = await pool.query('SELECT * FROM songs WHERE id = $1', [id]);
  if (!rows.length) return null;
  const [singsRes, favRes] = await Promise.all([
    pool.query('SELECT id, date FROM sings WHERE song_id = $1 ORDER BY date', [id]),
    pool.query('SELECT 1 FROM favorites WHERE song_id = $1', [id]),
  ]);
  const favSet = new Set(favRes.rows.length ? [Number(id)] : []);
  return serializeSong(rows[0], favSet, singsRes.rows);
}

export async function allSongs() {
  const [songsRes, singsRes, favsRes] = await Promise.all([
    pool.query('SELECT * FROM songs ORDER BY created DESC, id DESC'),
    pool.query('SELECT song_id, id, date FROM sings ORDER BY date'),
    pool.query('SELECT song_id FROM favorites'),
  ]);
  const singsMap = new Map();
  for (const s of singsRes.rows) {
    const key = Number(s.song_id);
    if (!singsMap.has(key)) singsMap.set(key, []);
    singsMap.get(key).push({ id: Number(s.id), date: s.date });
  }
  const favSet = new Set(favsRes.rows.map((r) => Number(r.song_id)));
  return songsRes.rows.map((row) =>
    serializeSong(row, favSet, singsMap.get(Number(row.id)) || []),
  );
}

export async function getPlaylist(id) {
  const { rows } = await pool.query('SELECT * FROM playlists WHERE id = $1', [id]);
  if (!rows.length) return null;
  const { rows: sr } = await pool.query(
    'SELECT song_id FROM playlist_songs WHERE playlist_id = $1 ORDER BY position',
    [id],
  );
  return serializePlaylist(rows[0], sr.map((r) => r.song_id));
}

export async function allPlaylists() {
  const [plRes, psRes] = await Promise.all([
    pool.query('SELECT * FROM playlists ORDER BY created, id'),
    pool.query('SELECT playlist_id, song_id FROM playlist_songs ORDER BY playlist_id, position'),
  ]);
  const map = new Map();
  for (const r of psRes.rows) {
    const key = Number(r.playlist_id);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r.song_id);
  }
  return plRes.rows.map((row) => serializePlaylist(row, map.get(Number(row.id)) || []));
}

export async function favsMap() {
  const { rows } = await pool.query('SELECT song_id FROM favorites');
  const m = {};
  for (const r of rows) m[Number(r.song_id)] = true;
  return m;
}

export async function getSetting(key, fallback) {
  const { rows } = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
  return rows.length ? rows[0].value : fallback;
}

export async function setSetting(key, value) {
  await pool.query(
    'INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value',
    [key, value],
  );
}
