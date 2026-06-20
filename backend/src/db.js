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
// Songs are a shared catalogue. Favorites, sing history and playlists are scoped
// per user (added via ALTER for existing installs; see MIGRATIONS below).
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

  CREATE TABLE IF NOT EXISTS users (
    id         BIGSERIAL PRIMARY KEY,
    google_sub TEXT    UNIQUE NOT NULL,
    email      TEXT    NOT NULL DEFAULT '',
    name       TEXT    NOT NULL DEFAULT '',
    picture    TEXT    NOT NULL DEFAULT '',
    theme      TEXT    NOT NULL DEFAULT 'holo',
    is_admin   BOOLEAN NOT NULL DEFAULT FALSE,
    created    BIGINT  NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sings (
    id      BIGSERIAL PRIMARY KEY,
    song_id BIGINT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    date    TEXT   NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sings_song  ON sings(song_id);
  CREATE INDEX IF NOT EXISTS idx_sings_date  ON sings(date);

  CREATE TABLE IF NOT EXISTS favorites (
    song_id BIGINT NOT NULL REFERENCES songs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ratings (
    user_id BIGINT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    song_id BIGINT  NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    rating  INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    PRIMARY KEY (user_id, song_id)
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

// Idempotent migrations to add per-user scoping to pre-existing tables.
const MIGRATIONS = `
  ALTER TABLE favorites ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
  ALTER TABLE sings     ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
  ALTER TABLE playlists ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
  ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_pkey;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_fav_user_song ON favorites(user_id, song_id);
  CREATE INDEX IF NOT EXISTS idx_sings_user ON sings(user_id);
  CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists(user_id);
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
  await pool.query(MIGRATIONS);
  await seedIfEmpty(pool);
  // One-time: move legacy shared song ratings into the per-user ratings table
  // for the admin. Guarded so it only runs while ratings is still empty.
  await pool.query(`
    INSERT INTO ratings (user_id, song_id, rating)
    SELECT u.id, s.id, s.rating FROM songs s
    CROSS JOIN users u
    WHERE s.rating IS NOT NULL AND u.is_admin = TRUE
      AND NOT EXISTS (SELECT 1 FROM ratings)
    ON CONFLICT DO NOTHING
  `);
}

// ── users / auth ────────────────────────────────────────────────────────────
function serializeUser(row) {
  return {
    id:      Number(row.id),
    email:   row.email,
    name:    row.name,
    picture: row.picture,
    theme:   row.theme || 'holo',
    isAdmin: !!row.is_admin,
  };
}

// Find-or-create a user from a verified Google profile. The very first user to
// sign in becomes admin and inherits any pre-existing (orphan) favorites, sing
// history and playlists from the single-user era.
export async function upsertUser({ sub, email, name, picture }) {
  return withTransaction(async (client) => {
    const existing = await client.query('SELECT * FROM users WHERE google_sub = $1', [sub]);
    if (existing.rows.length) {
      const r = await client.query(
        'UPDATE users SET email=$2, name=$3, picture=$4 WHERE google_sub=$1 RETURNING *',
        [sub, email || '', name || '', picture || ''],
      );
      return serializeUser(r.rows[0]);
    }
    const { rows: cnt } = await client.query('SELECT COUNT(*)::int AS n FROM users');
    const isFirst = cnt[0].n === 0;
    const ins = await client.query(
      'INSERT INTO users (google_sub,email,name,picture,is_admin,created) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [sub, email || '', name || '', picture || '', isFirst, Date.now()],
    );
    const user = ins.rows[0];
    if (isFirst) {
      // claim legacy single-user data
      await client.query('UPDATE favorites SET user_id=$1 WHERE user_id IS NULL', [user.id]);
      await client.query('UPDATE sings     SET user_id=$1 WHERE user_id IS NULL', [user.id]);
      await client.query('UPDATE playlists SET user_id=$1 WHERE user_id IS NULL', [user.id]);
      await client.query('INSERT INTO ratings (user_id, song_id, rating) SELECT $1, id, rating FROM songs WHERE rating IS NOT NULL ON CONFLICT DO NOTHING', [user.id]);
    }
    return serializeUser(user);
  });
}

export async function getUser(userId) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  return rows.length ? serializeUser(rows[0]) : null;
}

// All registered users with their playlist counts (admin view).
export async function listUsers() {
  const { rows } = await pool.query(`
    SELECT u.*, (SELECT COUNT(*) FROM playlists p WHERE p.user_id = u.id)::int AS playlist_count
    FROM users u ORDER BY u.created
  `);
  return rows.map((r) => ({ ...serializeUser(r), playlistCount: r.playlist_count }));
}

export async function getUserTheme(userId) {
  const { rows } = await pool.query('SELECT theme FROM users WHERE id = $1', [userId]);
  return rows.length ? rows[0].theme : 'holo';
}

export async function setUserTheme(userId, theme) {
  await pool.query('UPDATE users SET theme = $1 WHERE id = $2', [theme, userId]);
}

// ── serializers ───────────────────────────────────────────────────────────────
// plays / lastPlayed are derived from the current user's sing history (sings are
// per-user). The legacy songs.plays / songs.last_played columns are ignored.
function serializeSong(row, favSet, sings = [], rating = null) {
  const artists =
    Array.isArray(row.artists) && row.artists.length
      ? row.artists
      : row.artist
      ? [row.artist]
      : [];
  const lastDate = sings.length ? sings[sings.length - 1].date : null;
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
    plays:      sings.length,
    url:        row.url || '',
    artists,
    rating:     rating ?? null,
    lastPlayed: lastDate ? Date.parse(lastDate) || null : null,
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

// ── public query API (all scoped to a userId) ───────────────────────────────
export async function getSong(id, userId) {
  const { rows } = await pool.query('SELECT * FROM songs WHERE id = $1', [id]);
  if (!rows.length) return null;
  const [singsRes, favRes, ratRes] = await Promise.all([
    pool.query('SELECT id, date FROM sings WHERE song_id = $1 AND user_id = $2 ORDER BY date', [id, userId]),
    pool.query('SELECT 1 FROM favorites WHERE song_id = $1 AND user_id = $2', [id, userId]),
    pool.query('SELECT rating FROM ratings WHERE song_id = $1 AND user_id = $2', [id, userId]),
  ]);
  const favSet = new Set(favRes.rows.length ? [Number(id)] : []);
  const rating = ratRes.rows.length ? ratRes.rows[0].rating : null;
  return serializeSong(rows[0], favSet, singsRes.rows, rating);
}

export async function allSongs(userId) {
  const [songsRes, singsRes, favsRes, ratsRes] = await Promise.all([
    pool.query('SELECT * FROM songs ORDER BY created DESC, id DESC'),
    pool.query('SELECT song_id, id, date FROM sings WHERE user_id = $1 ORDER BY date', [userId]),
    pool.query('SELECT song_id FROM favorites WHERE user_id = $1', [userId]),
    pool.query('SELECT song_id, rating FROM ratings WHERE user_id = $1', [userId]),
  ]);
  const singsMap = new Map();
  for (const s of singsRes.rows) {
    const key = Number(s.song_id);
    if (!singsMap.has(key)) singsMap.set(key, []);
    singsMap.get(key).push({ id: Number(s.id), date: s.date });
  }
  const favSet = new Set(favsRes.rows.map((r) => Number(r.song_id)));
  const ratMap = new Map(ratsRes.rows.map((r) => [Number(r.song_id), r.rating]));
  return songsRes.rows.map((row) =>
    serializeSong(row, favSet, singsMap.get(Number(row.id)) || [], ratMap.get(Number(row.id)) ?? null),
  );
}

export async function getPlaylist(id, userId) {
  const { rows } = await pool.query('SELECT * FROM playlists WHERE id = $1 AND user_id = $2', [id, userId]);
  if (!rows.length) return null;
  const { rows: sr } = await pool.query(
    'SELECT song_id FROM playlist_songs WHERE playlist_id = $1 ORDER BY position',
    [id],
  );
  return serializePlaylist(rows[0], sr.map((r) => r.song_id));
}

export async function allPlaylists(userId) {
  const [plRes, psRes] = await Promise.all([
    pool.query('SELECT * FROM playlists WHERE user_id = $1 ORDER BY created, id', [userId]),
    pool.query('SELECT ps.playlist_id, ps.song_id FROM playlist_songs ps JOIN playlists p ON p.id = ps.playlist_id WHERE p.user_id = $1 ORDER BY ps.playlist_id, ps.position', [userId]),
  ]);
  const map = new Map();
  for (const r of psRes.rows) {
    const key = Number(r.playlist_id);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r.song_id);
  }
  return plRes.rows.map((row) => serializePlaylist(row, map.get(Number(row.id)) || []));
}

export async function favsMap(userId) {
  const { rows } = await pool.query('SELECT song_id FROM favorites WHERE user_id = $1', [userId]);
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
