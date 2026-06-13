// Headless verification: run the real frontend render logic against the live
// API, with a minimal DOM stub, and assert the produced markup is correct.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3211;

// ── start the server ─────────────────────────────────────────────────────────
const srv = spawn('node', [resolve(__dirname, '../src/server.js')], {
  env: { ...process.env, PORT: String(PORT), VOX_DB_PATH: resolve(__dirname, '../data/test.db') },
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 1500));

const results = [];
const ok = (name, cond) => { results.push([cond, name]); };

try {
  // ── DOM / browser stubs ──────────────────────────────────────────────────
  let rootHTML = '';
  let rootStyleAttr = '';
  const fakeRoot = {
    setAttribute: (_k, v) => { rootStyleAttr = v; },
    set innerHTML(v) { rootHTML = v; },
    get innerHTML() { return rootHTML; },
    querySelector: () => null,
  };
  globalThis.document = {
    getElementById: () => fakeRoot,
    addEventListener: () => {},
    activeElement: null,
  };
  globalThis.window = { open: () => {} };
  globalThis.setTimeout = setTimeout;
  globalThis.clearTimeout = clearTimeout;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (path, opts) => realFetch(`http://localhost:${PORT}${path}`, opts);

  // ── load app.js and capture internals ──────────────────────────────────────
  let src = readFileSync(resolve(__dirname, '../../frontend/app.js'), 'utf8');
  src += '\n;globalThis.__vv = { state, render, libraryHTML, statsHTML, registerHTML, listsHTML, favoritesHTML, setState };';
  // boot() runs at end (async); eval kicks it off.
  (0, eval)(src);

  await new Promise((r) => setTimeout(r, 800)); // let boot() hydrate + render
  const vv = globalThis.__vv;

  ok('state hydrated from API (17 seed songs)', vv.state.songs.length === 17);
  ok('playlists hydrated (>=4)', vv.state.lists.length >= 4);
  ok('favorites hydrated', Object.keys(vv.state.favs).length >= 1);
  ok('theme hydrated', ['holo', 'neon', 'acid'].includes(vv.state.theme));

  // library list view
  const lib = vv.libraryHTML();
  ok('library renders a song title', lib.includes('グリッチ・ハート'));
  ok('library shows GENRE column on すべて', lib.includes('>GENRE<'));
  ok('library has sortable headers', lib.includes('data-act="sort"'));
  ok('library has play/fav/delete actions', lib.includes('data-act="play"') && lib.includes('data-act="fav"') && lib.includes('data-act="startDel"'));
  ok('vocaloid VOCAL detail shown', lib.includes('VOCAL') && lib.includes('初音ミク'));
  ok('tag chips rendered', lib.includes('サビ高音'));

  // grid view hides genre column logic via filter
  vv.setState({ filter: 'vocaloid' });
  const libFiltered = vv.libraryHTML();
  ok('GENRE column hidden when filtered', !libFiltered.includes('>GENRE<'));
  ok('filter limits to vocaloid only', !libFiltered.includes('紅蓮の境界線'));
  vv.setState({ filter: 'all', view: 'grid' });
  ok('grid view renders cards', vv.libraryHTML().includes('grid-template-columns:repeat(auto-fill'));
  vv.setState({ view: 'list' });

  // register flow
  vv.setState({ screen: 'register', regStep: 1 });
  ok('register step1 search panel', vv.registerHTML().includes('楽曲を検索して登録'));
  vv.setState({ regStep: 3, regGenre: 'vocaloid', regSelected: { title: 'X', artist: 'Y', genre: 'vocaloid', date: '2024-01-01', dur: '3:00', views: '12万' } });
  const r3 = vv.registerHTML();
  ok('register step3 shows vocaloid input', r3.includes('歌唱ボカロ（複数可）'));
  vv.setState({ regGenre: 'anime' });
  ok('register step3 shows work input for anime', vv.registerHTML().includes('作品名'));

  // playlists
  vv.setState({ screen: 'lists', activeList: null });
  ok('lists grid shows create card', vv.listsHTML().includes('CREATE PLAYLIST'));
  ok('lists grid shows a seeded list', vv.listsHTML().includes('深夜の十八番'));
  vv.setState({ activeList: 101 });
  ok('list detail renders', vv.listsHTML().includes('MIDNIGHT PICKS'));

  // favorites
  vv.setState({ screen: 'favorites' });
  ok('favorites grid renders', vv.favoritesHTML().includes('grid-template-columns:repeat(auto-fill'));

  // stats charts
  vv.setState({ screen: 'stats' });
  const stats = vv.statsHTML();
  ok('stats donut svg', stats.includes('GENRE BREAKDOWN') && stats.includes('stroke-dasharray'));
  ok('stats monthly bars', stats.includes('MONTHLY REGISTRATIONS'));
  ok('stats cumulative area path', stats.includes('CUMULATIVE GROWTH') && stats.includes('<path d="M'));
  ok('stats top artists', stats.includes('TOP ARTISTS'));
  ok('stats fav gauge', stats.includes('FAV RATIO'));
  ok('stats sing heatmap (70 cells)', stats.includes('SING CALENDAR') && (stats.match(/title="\d\d\/\d\d/g) || []).length === 70);
  ok('stats top songs', stats.includes('TOP SONGS'));
  ok('stats daily line', stats.includes('DAILY SINGS'));

  // theme vars applied to root style
  ok('root style has theme var', rootStyleAttr.includes('--accent'));
} catch (e) {
  console.error('THREW:', e);
  results.push([false, 'no runtime exceptions: ' + e.message]);
} finally {
  srv.kill();
}

let pass = 0;
for (const [cond, name] of results) {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (cond) pass++;
}
console.log(`\n${pass}/${results.length} checks passed`);
process.exit(pass === results.length ? 0 : 1);
