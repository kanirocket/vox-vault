import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  pool,
  initDb,
  withTransaction,
  getSong,
  allSongs,
  allPlaylists,
  getPlaylist,
  favsMap,
  getUser,
  getUserTheme,
  setUserTheme,
} from './db.js';
import { searchYouTube, suggestYouTube } from './youtube.js';
import { authConfigured, googleClientId, loginWithGoogle, authMiddleware } from './auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

const api = express.Router();
const today = () => new Date().toISOString().slice(0, 10);
const GENRE_COLORS = { vocaloid: '#38e8ff', anime: '#ff5db1', artist: '#b18cff', game: '#ffd24a', bgm: '#1abc9c' };
const VALID_GENRES = Object.keys(GENRE_COLORS);

// ── auth (public) ───────────────────────────────────────────────────────────
api.get('/auth/config', (_req, res) => res.json({ configured: authConfigured(), clientId: googleClientId() }));

api.post('/auth/google', async (req, res) => {
  try {
    const idToken = req.body?.credential || req.body?.idToken;
    if (!idToken) return res.status(400).json({ error: 'credential is required' });
    res.json(await loginWithGoogle(idToken));
  } catch (e) {
    res.status(401).json({ error: 'google sign-in failed', detail: e.message });
  }
});

// ── everything below requires a valid session ────────────────────────────────
api.use(authMiddleware);

api.get('/auth/me', async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(401).json({ error: 'user no longer exists' });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── full state ────────────────────────────────────────────────────────────────
api.get('/state', async (req, res) => {
  try {
    res.json({
      songs:    await allSongs(req.userId),
      lists:    await allPlaylists(req.userId),
      favs:     await favsMap(req.userId),
      settings: { theme: await getUserTheme(req.userId) },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── songs ─────────────────────────────────────────────────────────────────────
api.get('/songs', async (req, res) => {
  try { res.json(await allSongs(req.userId)); } catch (e) { res.status(500).json({ error: e.message }); }
});

api.post('/songs', async (req, res) => {
  try {
    const b = req.body || {};
    const artists = Array.isArray(b.artists) && b.artists.length
      ? b.artists.map(String).filter(Boolean)
      : b.artist ? [String(b.artist)] : [];
    const artistStr = artists.join(' / ');
    if (!b.title || !artistStr) return res.status(400).json({ error: 'title and artist are required' });

    if (b.url) {
      const { rows } = await pool.query('SELECT id, title FROM songs WHERE url = $1', [String(b.url)]);
      if (rows.length) return res.status(409).json({ error: 'duplicate', id: rows[0].id, title: rows[0].title });
    }

    const genre  = VALID_GENRES.includes(b.genre) ? b.genre : 'artist';
    const id     = Date.now();
    const rating = Number.isInteger(b.rating) && b.rating >= 1 && b.rating <= 5 ? b.rating : null;

    await pool.query(`
      INSERT INTO songs (id,title,artist,artists,genre,vocals,work,tags,date,dur,views,plays,url,rating,created)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,0,$12,$13,$14)`,
      [
        id, String(b.title), artistStr,
        JSON.stringify(artists), genre,
        JSON.stringify(Array.isArray(b.vocals) ? b.vocals : []),
        b.work ? String(b.work) : '',
        JSON.stringify(Array.isArray(b.tags) ? b.tags : []),
        b.date ? String(b.date).replace(/\./g, '-') : '',
        b.dur  ? String(b.dur)  : '',
        Number.isFinite(+b.views) ? Math.round(+b.views) : 0,
        b.url  ? String(b.url)  : '',
        rating, id,
      ],
    );
    res.status(201).json(await getSong(id, req.userId));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

api.delete('/songs/:id', async (req, res) => {
  try {
    const id = +req.params.id;
    const { rowCount } = await pool.query('DELETE FROM songs WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true, id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

api.post('/songs/:id/play', async (req, res) => {
  try {
    const id = +req.params.id;
    if (!await getSong(id, req.userId)) return res.status(404).json({ error: 'not found' });
    await pool.query('INSERT INTO sings (song_id, date, user_id) VALUES ($1,$2,$3)', [id, today(), req.userId]);
    res.json(await getSong(id, req.userId));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

api.delete('/songs/:id/sings/:singId', async (req, res) => {
  try {
    const id     = +req.params.id;
    const singId = +req.params.singId;
    const { rows } = await pool.query('SELECT id FROM sings WHERE id = $1 AND song_id = $2 AND user_id = $3', [singId, id, req.userId]);
    if (!rows.length) return res.status(404).json({ error: 'sing not found' });
    await pool.query('DELETE FROM sings WHERE id = $1', [singId]);
    res.json(await getSong(id, req.userId));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

api.put('/songs/:id/rating', async (req, res) => {
  try {
    const id = +req.params.id;
    if (!await getSong(id, req.userId)) return res.status(404).json({ error: 'not found' });
    const r      = req.body?.rating;
    const rating = Number.isInteger(r) && r >= 1 && r <= 5 ? r : null;
    await pool.query('UPDATE songs SET rating = $1 WHERE id = $2', [rating, id]);
    res.json(await getSong(id, req.userId));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── favorites ─────────────────────────────────────────────────────────────────
api.put('/songs/:id/favorite', async (req, res) => {
  try {
    const id = +req.params.id;
    if (!await getSong(id, req.userId)) return res.status(404).json({ error: 'not found' });
    const { rows } = await pool.query('SELECT 1 FROM favorites WHERE song_id = $1 AND user_id = $2', [id, req.userId]);
    if (rows.length) await pool.query('DELETE FROM favorites WHERE song_id = $1 AND user_id = $2', [id, req.userId]);
    else             await pool.query('INSERT INTO favorites (song_id, user_id) VALUES ($1,$2)', [id, req.userId]);
    res.json({ id, favorite: !rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── playlists ─────────────────────────────────────────────────────────────────
api.get('/playlists', async (req, res) => {
  try { res.json(await allPlaylists(req.userId)); } catch (e) { res.status(500).json({ error: e.message }); }
});

api.post('/playlists', async (req, res) => {
  try {
    const name = (req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'name is required' });
    const id = Date.now();
    await pool.query(
      'INSERT INTO playlists (id,name,en,colors,created,user_id) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, name, name.slice(0, 14).toUpperCase(),
       JSON.stringify(Object.values(GENRE_COLORS).slice(0, 4)), id, req.userId],
    );
    res.status(201).json(await getPlaylist(id, req.userId));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

api.delete('/playlists/:id', async (req, res) => {
  try {
    const id = +req.params.id;
    const { rowCount } = await pool.query('DELETE FROM playlists WHERE id = $1 AND user_id = $2', [id, req.userId]);
    if (!rowCount) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true, id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

api.post('/playlists/:id/songs', async (req, res) => {
  try {
    const pid    = +req.params.id;
    const songId = +req.body?.songId;
    if (!await getPlaylist(pid, req.userId)) return res.status(404).json({ error: 'playlist not found' });
    if (!await getSong(songId, req.userId))  return res.status(404).json({ error: 'song not found' });
    const { rows } = await pool.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS p FROM playlist_songs WHERE playlist_id = $1', [pid],
    );
    await pool.query(
      'INSERT INTO playlist_songs (playlist_id,song_id,position) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [pid, songId, rows[0].p],
    );
    res.json(await getPlaylist(pid, req.userId));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

api.delete('/playlists/:id/songs/:songId', async (req, res) => {
  try {
    const pid    = +req.params.id;
    const songId = +req.params.songId;
    if (!await getPlaylist(pid, req.userId)) return res.status(404).json({ error: 'playlist not found' });
    await pool.query('DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2', [pid, songId]);
    res.json(await getPlaylist(pid, req.userId));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── settings ──────────────────────────────────────────────────────────────────
api.put('/settings', async (req, res) => {
  try {
    const theme = req.body?.theme;
    if (theme && ['holo', 'neon', 'acid'].includes(theme)) await setUserTheme(req.userId, theme);
    res.json({ theme: await getUserTheme(req.userId) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── youtube search ────────────────────────────────────────────────────────────
api.get('/youtube/search', async (req, res) => {
  try {
    res.json(await searchYouTube(req.query.q || ''));
  } catch (e) {
    res.status(502).json({ error: 'youtube search failed', detail: e.message });
  }
});

api.get('/youtube/suggest', async (req, res) => {
  try {
    res.json({ suggestions: await suggestYouTube(req.query.q || '') });
  } catch (e) {
    res.status(502).json({ error: 'youtube suggest failed', detail: e.message });
  }
});

app.use('/api', api);

// ── static frontend ───────────────────────────────────────────────────────────
const FRONTEND_DIR = process.env.VOX_FRONTEND_DIR || resolve(__dirname, '../../frontend');
app.use(express.static(FRONTEND_DIR));
app.get('*', (_req, res) => res.sendFile(resolve(FRONTEND_DIR, 'index.html')));

// ── startup ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
await initDb();
app.listen(PORT, () => {
  console.log(`Vox Vault running on http://localhost:${PORT}`);
  console.log(`DB: PostgreSQL (${process.env.PG_CONNECTION_STRING || 'localhost:5432/voxvault'})`);
  console.log(`YouTube: ${process.env.YOUTUBE_API_KEY ? 'live API' : 'scrape / mock'}`);
  console.log(`Auth: Google Sign-In ${authConfigured() ? 'enabled' : 'NOT configured (set GOOGLE_CLIENT_ID)'}`);
});
