import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  db,
  getSong,
  allSongs,
  allPlaylists,
  getPlaylist,
  favsMap,
  getSetting,
  setSetting,
} from './db.js';
import { searchYouTube } from './youtube.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

const api = express.Router();
const today = () => new Date().toISOString().slice(0, 10);
const GENRE_COLORS = { vocaloid: '#38e8ff', anime: '#ff5db1', artist: '#b18cff', game: '#ffd24a' };
const VALID_GENRES = Object.keys(GENRE_COLORS);

// ── full state (one call to hydrate the SPA) ────────────────────────────────
api.get('/state', (_req, res) => {
  res.json({
    songs: allSongs(),
    lists: allPlaylists(),
    favs: favsMap(),
    settings: { theme: getSetting('theme', 'holo') },
  });
});

// ── songs ───────────────────────────────────────────────────────────────────
api.get('/songs', (_req, res) => res.json(allSongs()));

api.post('/songs', (req, res) => {
  const b = req.body || {};
  const artists = Array.isArray(b.artists) && b.artists.length
    ? b.artists.map(String).filter(Boolean)
    : (b.artist ? [String(b.artist)] : []);
  const artistStr = artists.join(' / ');
  if (!b.title || !artistStr) return res.status(400).json({ error: 'title and artist are required' });
  if (b.url) {
    const dup = db.prepare('SELECT id, title FROM songs WHERE url = ?').get(String(b.url));
    if (dup) return res.status(409).json({ error: 'duplicate', id: dup.id, title: dup.title });
  }
  const genre = VALID_GENRES.includes(b.genre) ? b.genre : 'artist';
  const id = Date.now();
  db.prepare(`
    INSERT INTO songs (id, title, artist, artists, genre, vocals, work, tags, date, dur, views, plays, url, created)
    VALUES (@id, @title, @artist, @artists, @genre, @vocals, @work, @tags, @date, @dur, @views, 0, @url, @created)
  `).run({
    id,
    title: String(b.title),
    artist: artistStr,
    artists: JSON.stringify(artists),
    genre,
    vocals: JSON.stringify(Array.isArray(b.vocals) ? b.vocals : []),
    work: b.work ? String(b.work) : '',
    tags: JSON.stringify(Array.isArray(b.tags) ? b.tags : []),
    date: b.date ? String(b.date).replace(/\./g, '-') : '',
    dur: b.dur ? String(b.dur) : '',
    views: Number.isFinite(+b.views) ? Math.round(+b.views) : 0,
    url: b.url ? String(b.url) : '',
    created: id,
  });
  res.status(201).json(getSong(id));
});

api.delete('/songs/:id', (req, res) => {
  const id = +req.params.id;
  const info = db.prepare('DELETE FROM songs WHERE id = ?').run(id);
  if (!info.changes) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true, id });
});

// record a sing (歌唱 +1) with today's date
api.post('/songs/:id/play', (req, res) => {
  const id = +req.params.id;
  const song = getSong(id);
  if (!song) return res.status(404).json({ error: 'not found' });
  const tx = db.transaction(() => {
    db.prepare('INSERT INTO sings (song_id, date) VALUES (?, ?)').run(id, today());
    db.prepare('UPDATE songs SET plays = plays + 1, last_played = ? WHERE id = ?').run(Date.now(), id);
  });
  tx();
  res.json(getSong(id));
});

// delete one specific sing row by its id (歌唱取り消し — 1件だけ)
api.delete('/songs/:id/sings/:singId', (req, res) => {
  const id = +req.params.id;
  const singId = +req.params.singId;
  const existing = db.prepare('SELECT id FROM sings WHERE id = ? AND song_id = ?').get(singId, id);
  if (!existing) return res.status(404).json({ error: 'sing not found' });
  db.prepare('DELETE FROM sings WHERE id = ?').run(singId);
  db.prepare('UPDATE songs SET plays = MAX(0, plays - 1) WHERE id = ?').run(id);
  res.json(getSong(id));
});

// ── favorites ────────────────────────────────────────────────────────────────
api.put('/songs/:id/favorite', (req, res) => {
  const id = +req.params.id;
  if (!getSong(id)) return res.status(404).json({ error: 'not found' });
  const exists = db.prepare('SELECT 1 FROM favorites WHERE song_id = ?').get(id);
  if (exists) db.prepare('DELETE FROM favorites WHERE song_id = ?').run(id);
  else db.prepare('INSERT INTO favorites (song_id) VALUES (?)').run(id);
  res.json({ id, favorite: !exists });
});

// ── playlists ────────────────────────────────────────────────────────────────
api.get('/playlists', (_req, res) => res.json(allPlaylists()));

api.post('/playlists', (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name is required' });
  const id = Date.now();
  db.prepare('INSERT INTO playlists (id, name, en, colors, created) VALUES (?, ?, ?, ?, ?)').run(
    id,
    name,
    name.slice(0, 14).toUpperCase(),
    JSON.stringify([GENRE_COLORS.vocaloid, GENRE_COLORS.anime, GENRE_COLORS.artist, GENRE_COLORS.game]),
    id
  );
  res.status(201).json(getPlaylist(id));
});

api.delete('/playlists/:id', (req, res) => {
  const id = +req.params.id;
  const info = db.prepare('DELETE FROM playlists WHERE id = ?').run(id);
  if (!info.changes) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true, id });
});

// add a song to a playlist (idempotent)
api.post('/playlists/:id/songs', (req, res) => {
  const pid = +req.params.id;
  const songId = +req.body?.songId;
  if (!getPlaylist(pid)) return res.status(404).json({ error: 'playlist not found' });
  if (!getSong(songId)) return res.status(404).json({ error: 'song not found' });
  const pos = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM playlist_songs WHERE playlist_id = ?').get(pid).p;
  db.prepare('INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)').run(pid, songId, pos);
  res.json(getPlaylist(pid));
});

api.delete('/playlists/:id/songs/:songId', (req, res) => {
  const pid = +req.params.id;
  const songId = +req.params.songId;
  if (!getPlaylist(pid)) return res.status(404).json({ error: 'playlist not found' });
  db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?').run(pid, songId);
  res.json(getPlaylist(pid));
});

// ── settings ─────────────────────────────────────────────────────────────────
api.put('/settings', (req, res) => {
  const theme = req.body?.theme;
  if (theme && ['holo', 'neon', 'acid'].includes(theme)) setSetting('theme', theme);
  res.json({ theme: getSetting('theme', 'holo') });
});

// ── youtube search ───────────────────────────────────────────────────────────
api.get('/youtube/search', async (req, res) => {
  try {
    const result = await searchYouTube(req.query.q || '');
    res.json(result);
  } catch (e) {
    res.status(502).json({ error: 'youtube search failed', detail: e.message });
  }
});

app.use('/api', api);

// ── static frontend ───────────────────────────────────────────────────────────
const FRONTEND_DIR = process.env.VOX_FRONTEND_DIR || resolve(__dirname, '../../frontend');
app.use(express.static(FRONTEND_DIR));
app.get('*', (_req, res) => res.sendFile(resolve(FRONTEND_DIR, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Vox Vault running on http://localhost:${PORT}`);
  console.log(`YouTube: ${process.env.YOUTUBE_API_KEY ? 'live API' : 'mock candidates (set YOUTUBE_API_KEY to go live)'}`);
});
