/* Vox Vault — frontend SPA.
 * Faithful recreation of the design prototype (Vox Vault.dc.html), with the
 * prototype's localStorage swapped for the REST backend. Rendering is a single
 * full-innerHTML pass per state change (like the prototype's reactive engine),
 * with caret/focus restoration so controlled text inputs stay usable.
 */

// ── constants (ported verbatim) ─────────────────────────────────────────────
const GENRES = {
  vocaloid: { label: 'ボカロ',       en: 'VOCALOID', color: '#38e8ff' },
  anime:    { label: 'アニソン',     en: 'ANIME',    color: '#ff5db1' },
  artist:   { label: 'アーティスト', en: 'ARTIST',   color: '#b18cff' },
  game:     { label: 'ゲーム',       en: 'GAME',     color: '#ffd24a' },
};
const PRESET_VOCALS = ['初音ミク', '鏡音リン', '鏡音レン', '巡音ルカ', 'KAITO', 'MEIKO', 'IA', '可不', 'flower', '重音テト', 'GUMI', '結月ゆかり', '東北きりたん', 'Synthesizer V'];

const THEMES = {
  holo: { '--accent': '#22d3ee', '--accent3': '#a78bfa', '--glow': 'rgba(34,211,238,.28)', '--glow2': 'rgba(232,121,249,.22)', '--bg': '#05060f' },
  neon: { '--accent': '#ff2d95', '--accent3': '#7b5bff', '--glow': 'rgba(255,45,149,.30)', '--glow2': 'rgba(0,229,255,.20)',  '--bg': '#0a0410' },
  acid: { '--accent': '#9dff3c', '--accent3': '#00ffc8', '--glow': 'rgba(157,255,60,.26)', '--glow2': 'rgba(0,255,200,.18)', '--bg': '#04100a' },
};

// ── tiny helpers ─────────────────────────────────────────────────────────────
const css = (obj) =>
  Object.entries(obj)
    .map(([k, v]) => `${k.startsWith('--') ? k : k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}:${v}`)
    .join(';');
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = (path, opts) =>
  fetch('/api' + path, { headers: { 'Content-Type': 'application/json' }, ...opts }).then(async (r) => {
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
    return r.status === 204 ? null : r.json();
  });

// ── client state ─────────────────────────────────────────────────────────────
const state = {
  screen: 'library', theme: 'holo',
  songs: [], lists: [], favs: {},
  filter: 'all', sortKey: 'added', sortDir: 'desc', query: '', view: 'list',
  deletePending: null, addToListSong: null, activeList: null,
  creatingList: false, newListName: '', toast: null,
  regStep: 1, regQuery: '', regSelected: null,
  regTitle: '', regArtists: [],
  regGenre: 'vocaloid', regVocals: [], regTags: [], regWork: '', regArtistQ: '',
  regCandidates: [], regLoading: false, regSource: null,
  unsingPending: null,
};
function setState(patch) {
  Object.assign(state, typeof patch === 'function' ? patch(state) : patch);
  render();
}

// ── toast ────────────────────────────────────────────────────────────────────
let _tt = null;
function showToast(msg, type) {
  if (_tt) clearTimeout(_tt);
  setState({ toast: { msg, type: type || 'success', ts: Date.now() } });
  _tt = setTimeout(() => setState({ toast: null }), 2600);
}

// ── data mutations (persisted via API) ───────────────────────────────────────
async function toggleFav(id) {
  try {
    const r = await api(`/songs/${id}/favorite`, { method: 'PUT' });
    setState((s) => {
      const favs = { ...s.favs };
      if (r.favorite) favs[id] = true; else delete favs[id];
      return { favs };
    });
  } catch (e) { showToast('お気に入りの更新に失敗しました', 'error'); }
}
async function incPlays(id) {
  try {
    const song = await api(`/songs/${id}/play`, { method: 'POST' });
    setState((s) => ({ songs: s.songs.map((x) => (x.id === id ? song : x)) }));
    showToast('歌唱カウント +1', 'info');
  } catch (e) { showToast('歌唱の記録に失敗しました', 'error'); }
}
async function undoSing(songId, singId) {
  try {
    const song = await api(`/songs/${songId}/sings/${singId}`, { method: 'DELETE' });
    setState((s) => ({ songs: s.songs.map((x) => (x.id === songId ? song : x)), unsingPending: null }));
    showToast('歌唱を取り消しました', 'info');
  } catch (e) { showToast('取り消しに失敗しました', 'error'); }
}
function showUnsingModal(id) {
  setState({ unsingPending: id });
}
let _dt = null;
function startDel(id) {
  if (_dt) clearTimeout(_dt);
  setState({ deletePending: id });
  _dt = setTimeout(() => setState({ deletePending: null }), 3000);
}
async function confirmDel(id) {
  if (_dt) clearTimeout(_dt);
  const title = (state.songs.find((s) => s.id === id) || {}).title || '楽曲';
  try {
    await api(`/songs/${id}`, { method: 'DELETE' });
    setState((s) => {
      const favs = { ...s.favs }; delete favs[id];
      return {
        songs: s.songs.filter((x) => x.id !== id), favs, deletePending: null,
        lists: s.lists.map((l) => ({ ...l, songIds: l.songIds.filter((i) => i !== id) })),
      };
    });
    showToast(`「${title}」を削除しました`, 'info');
  } catch (e) { showToast('削除に失敗しました', 'error'); }
}
async function toggleSongInList(songId, listId) {
  const list = state.lists.find((l) => l.id === listId);
  const already = list && list.songIds.includes(songId);
  try {
    const updated = already
      ? await api(`/playlists/${listId}/songs/${songId}`, { method: 'DELETE' })
      : await api(`/playlists/${listId}/songs`, { method: 'POST', body: JSON.stringify({ songId }) });
    setState((s) => ({ lists: s.lists.map((l) => (l.id === listId ? updated : l)) }));
    showToast(already ? `「${list.name}」から削除しました` : `「${list?.name || 'リスト'}」に追加しました`, already ? 'info' : 'success');
  } catch (e) { showToast('リストの更新に失敗しました', 'error'); }
}
async function removeFromList(songId, listId) {
  const list = state.lists.find((l) => l.id === listId);
  try {
    const updated = await api(`/playlists/${listId}/songs/${songId}`, { method: 'DELETE' });
    setState((s) => ({ lists: s.lists.map((l) => (l.id === listId ? updated : l)) }));
    showToast(`「${list?.name || 'リスト'}」から削除しました`, 'info');
  } catch (e) { showToast('リストの更新に失敗しました', 'error'); }
}
async function deleteList(id) {
  const list = state.lists.find((l) => l.id === id);
  try {
    await api(`/playlists/${id}`, { method: 'DELETE' });
    setState((s) => ({ lists: s.lists.filter((l) => l.id !== id), activeList: s.activeList === id ? null : s.activeList }));
    showToast(`「${list?.name || 'リスト'}」を削除しました`, 'info');
  } catch (e) { showToast('リストの削除に失敗しました', 'error'); }
}
async function submitNewList() {
  const name = state.newListName.trim();
  if (!name) return;
  try {
    const list = await api('/playlists', { method: 'POST', body: JSON.stringify({ name }) });
    setState((s) => ({ lists: [...s.lists, list], creatingList: false, newListName: '' }));
    showToast(`「${name}」を作成しました`);
  } catch (e) { showToast('リストの作成に失敗しました', 'error'); }
}
async function saveSong() {
  const sel = state.regSelected;
  if (!sel) return;
  const pv = (str) => { const m = String(str || '0').match(/(\d+\.?\d*)(万)?/); return m ? Math.round(parseFloat(m[1]) * (m[2] ? 10000 : 1)) : 0; };
  const payload = {
    title: state.regTitle.trim() || sel.title,
    artists: [...state.regArtists],
    genre: state.regGenre,
    vocals: [...state.regVocals], work: state.regWork, tags: [...state.regTags],
    date: String(sel.date || '').replace(/\./g, '-'), dur: sel.dur, views: pv(sel.views), url: sel.url || '',
  };
  try {
    const r = await fetch('/api/songs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (r.status === 409) {
      const err = await r.json().catch(() => ({}));
      showToast(`すでに登録済みです：「${err.title || payload.title}」`, 'error');
      return;
    }
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
    const song = await r.json();
    setState((s) => ({ songs: [song, ...s.songs], regStep: 4 }));
    showToast(`「${song.title}」を VAULT に登録しました`);
  } catch (e) { showToast('登録に失敗しました', 'error'); }
}
async function setTheme(t) {
  setState({ theme: t });
  api('/settings', { method: 'PUT', body: JSON.stringify({ theme: t }) }).catch(() => {});
}
async function startSearch() {
  setState({ regStep: 2, regLoading: true, regCandidates: [], regSource: null });
  try {
    const r = await api(`/youtube/search?q=${encodeURIComponent(state.regQuery)}`);
    setState({ regCandidates: r.candidates || [], regLoading: false, regSource: r.source || 'mock' });
  } catch (e) {
    setState({ regLoading: false });
    showToast('YouTube検索に失敗しました', 'error');
  }
}

// ── formatting / decorate (ported) ───────────────────────────────────────────
const fmtV = (v) => (v >= 10000 ? Math.round(v / 10000) + '万' : String(v));

function decorate(s) {
  const g = GENRES[s.genre] || GENRES.artist;
  const fav = !!state.favs[s.id];
  const vocals = s.vocals || [];
  const tags = s.tags || [];
  const detailLabel = s.genre === 'vocaloid' ? 'VOCAL' : (s.genre === 'anime' ? '作品' : '');
  const detailText = s.genre === 'vocaloid' ? vocals.join('・') : (s.genre === 'anime' ? (s.work || '') : '');
  const tagStyle = {
    display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '6px',
    fontSize: '10.5px', fontFamily: "'Share Tech Mono',monospace", color: 'rgba(255,255,255,.6)',
    background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', whiteSpace: 'nowrap',
  };
  const vidMatch = (s.url || '').match(/[?&]v=([a-zA-Z0-9_-]{8,13})/);
  const thumbImg = vidMatch ? `https://i.ytimg.com/vi/${vidMatch[1]}/mqdefault.jpg` : null;
  return {
    id: s.id, title: s.title, artist: s.artist, dur: s.dur,
    genreLabel: g.label, color: g.color,
    dateF: (s.date || '').replace(/-/g, '.'), viewsF: fmtV(s.views), playsF: String(Array.isArray(s.sings) ? s.sings.length : s.plays),
    fav, detailLabel, detailText, hasDetail: !!detailText, hasTags: tags.length > 0,
    tagChips: tags.map((t) => ({ label: t, style: tagStyle })),
    thumbImg,
    thumbStyle: { position: 'absolute', inset: 0, background: `radial-gradient(130% 150% at 16% -10%,${g.color}77,transparent 56%),linear-gradient(135deg,#0b1126,#06070f)` },
    badgeStyle: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 9px', borderRadius: '7px', fontSize: '11px', fontWeight: 700, color: g.color, border: '1px solid ' + g.color + '55', background: g.color + '14', whiteSpace: 'nowrap' },
    dotStyle: { width: '6px', height: '6px', borderRadius: '50%', background: g.color, boxShadow: '0 0 7px ' + g.color, flexShrink: 0 },
    starFill: fav ? g.color : 'none',
    starStroke: fav ? g.color : 'rgba(255,255,255,.35)',
    starStyle: { filter: fav ? `drop-shadow(0 0 6px ${g.color})` : 'none', transition: 'all .15s' },
    artists: Array.isArray(s.artists) && s.artists.length ? s.artists : (s.artist ? [s.artist] : []),
    isPending: state.deletePending === s.id,
    url: s.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(s.title + ' ' + s.artist)}`,
  };
}

// ── SVG snippets ──────────────────────────────────────────────────────────────
const ICON = {
  play: (w) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="rgba(255,255,255,.85)"><polygon points="8 5 19 12 8 19"/></svg>`,
  plus: (w) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  trash: (w) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>`,
  star: (w, s) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="${s.starFill}" stroke="${s.starStroke}" stroke-width="1.6" style="${css(s.starStyle)}"><polygon points="12 2.5 15.1 9 22 9.7 16.8 14.4 18.3 21 12 17.4 5.7 21 7.2 14.4 2 9.7 8.9 9"/></svg>`,
  search: (w, stroke) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>`,
};

// ════════════════════════════════════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════════════════════════════════════
function render() {
  const root = document.getElementById('app');
  const active = document.activeElement;
  const focusField = active && active.dataset ? active.dataset.field : null;
  const selStart = active && 'selectionStart' in active ? active.selectionStart : null;
  const selEnd = active && 'selectionEnd' in active ? active.selectionEnd : null;

  root.setAttribute('style', css(rootStyle()));
  root.innerHTML = sidebarHTML() + mainHTML() + modalsHTML() + toastHTML();

  if (focusField) {
    const next = root.querySelector(`[data-field="${focusField}"]`);
    if (next) {
      next.focus();
      if (selStart != null && 'setSelectionRange' in next) {
        try { next.setSelectionRange(selStart, selEnd); } catch (e) {}
      }
    }
  }
}

function rootStyle() {
  return Object.assign(
    { position: 'relative', width: '100%', height: '100vh', display: 'flex', overflow: 'hidden',
      fontFamily: "'Noto Sans JP',sans-serif", color: '#fff', background: 'var(--bg)' },
    THEMES[state.theme]
  );
}

// ── background layers + sidebar ───────────────────────────────────────────────
function bgHTML() {
  return `
  <div style="position:absolute;inset:0;z-index:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:64px 64px;animation:vvGrid 8s linear infinite;-webkit-mask-image:radial-gradient(120% 90% at 50% 0%,#000 30%,transparent 100%);mask-image:radial-gradient(120% 90% at 50% 0%,#000 30%,transparent 100%);"></div>
  <div style="position:absolute;top:-200px;left:-160px;width:620px;height:620px;z-index:0;pointer-events:none;border-radius:50%;background:radial-gradient(circle,var(--glow),transparent 70%);filter:blur(40px);animation:vvFloat 18s ease-in-out infinite;"></div>
  <div style="position:absolute;bottom:-260px;right:-120px;width:560px;height:560px;z-index:0;pointer-events:none;border-radius:50%;background:radial-gradient(circle,var(--glow2),transparent 70%);filter:blur(50px);animation:vvFloat2 22s ease-in-out infinite;"></div>
  <div style="position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,transparent,rgba(255,255,255,.04),transparent);height:40%;animation:vvScan 9s linear infinite;opacity:.5;"></div>
  <div style="position:absolute;inset:0;z-index:1;pointer-events:none;background:radial-gradient(120% 80% at 50% 50%,transparent 50%,rgba(2,3,8,.7) 100%);"></div>`;
}

function navBtnStyle(on) {
  return css({
    display: 'flex', alignItems: 'center', gap: '13px', width: '100%',
    padding: '11px 14px 11px 16px', borderRadius: '0 11px 11px 0', cursor: 'pointer',
    fontFamily: 'inherit', textAlign: 'left', marginBottom: '2px', transition: 'all .15s',
    background: on ? 'rgba(255,255,255,.06)' : 'transparent', border: 'none',
    borderLeft: on ? '2px solid var(--accent)' : '2px solid transparent',
    color: on ? '#fff' : 'rgba(255,255,255,.5)',
    boxShadow: on ? 'inset 0 0 36px var(--glow)' : 'none',
  });
}

function sidebarHTML() {
  const st = state;
  const total = st.songs.length;
  const favCount = Object.values(st.favs).filter(Boolean).length;
  const totalPlays = st.songs.reduce((a, s) => a + s.plays, 0);
  const archiveBar = css({ height: '100%', width: Math.min(total / 30, 1) * 100 + '%', borderRadius: '4px', background: 'linear-gradient(90deg,var(--accent3),var(--accent))', boxShadow: '0 0 10px var(--glow)' });
  const navItem = (key, jp, en, icon) =>
    `<button data-act="go" data-screen="${key}" style="${navBtnStyle(st.screen === key)}">${icon}<div><div style="font-size:13px;font-weight:700;">${jp}</div><div style="font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:1.5px;opacity:.55;">${en}</div></div></button>`;
  const tdefs = { holo: { c: '#22d3ee', l: 'HOLO' }, neon: { c: '#ff2d95', l: 'NEON' }, acid: { c: '#9dff3c', l: 'ACID' } };
  const themeBtns = Object.keys(tdefs).map((k) => {
    const on = st.theme === k;
    return `<button data-act="theme" data-theme="${k}" style="${css({ flex: 1, padding: '9px 0', borderRadius: '9px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: '11px', letterSpacing: '1px', textAlign: 'center', border: on ? '1px solid ' + tdefs[k].c : '1px solid rgba(255,255,255,.1)', background: on ? tdefs[k].c + '1f' : 'transparent', color: on ? '#fff' : 'rgba(255,255,255,.45)', boxShadow: on ? '0 0 16px ' + tdefs[k].c + '55' : 'none' })}">${tdefs[k].l}</button>`;
  }).join('');

  return `
  <aside style="position:relative;z-index:5;width:248px;flex-shrink:0;height:100vh;display:flex;flex-direction:column;padding:26px 16px 18px;background:rgba(10,12,24,.55);backdrop-filter:blur(22px);border-right:1px solid rgba(255,255,255,.07);">
    <div style="display:flex;align-items:center;gap:11px;padding:0 6px 26px;">
      <div style="width:38px;height:38px;border-radius:10px;flex-shrink:0;display:grid;place-items:center;background:linear-gradient(135deg,var(--accent),var(--accent3));box-shadow:0 0 22px var(--glow);">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06070f" stroke-width="2.4" stroke-linecap="round"><path d="M12 3v12"/><circle cx="9" cy="17" r="3"/><path d="M12 3l7 2v4"/></svg>
      </div>
      <div>
        <div style="font-family:'Orbitron',sans-serif;font-weight:900;font-size:16px;letter-spacing:1px;line-height:1;">VOX<span style="color:var(--accent);">//</span>VAULT</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:2.5px;color:rgba(255,255,255,.4);margin-top:4px;">KARAOKE ARCHIVE</div>
      </div>
    </div>
    <div style="font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:2px;color:rgba(255,255,255,.3);padding:0 12px 8px;">// NAVIGATION</div>
    <nav style="display:flex;flex-direction:column;gap:2px;">
      ${navItem('library', 'ライブラリ', 'LIBRARY', `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`)}
      ${navItem('register', '楽曲を登録', 'REGISTER', `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`)}
      ${navItem('lists', 'マイリスト', 'PLAYLISTS', `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 6h13M3 12h13M3 18h9"/><path d="M19 9v9l4-2.2"/></svg>`)}
      ${navItem('favorites', 'お気に入り', 'FAVORITES', `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polygon points="12 2.5 15.1 9 22 9.7 16.8 14.4 18.3 21 12 17.4 5.7 21 7.2 14.4 2 9.7 8.9 9"/></svg>`)}
      ${navItem('stats', '統計', 'ANALYTICS', `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="13" y="7" width="3" height="10"/></svg>`)}
    </nav>
    <div style="margin-top:auto;display:flex;flex-direction:column;gap:14px;">
      <div style="padding:14px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);">
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <span style="font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:1.5px;color:rgba(255,255,255,.4);">ARCHIVE</span>
          <span style="font-family:'Orbitron',sans-serif;font-weight:700;font-size:18px;color:var(--accent);">${total}</span>
        </div>
        <div style="height:5px;border-radius:4px;background:rgba(255,255,255,.07);margin-top:8px;overflow:hidden;"><div style="${archiveBar}"></div></div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:rgba(255,255,255,.35);margin-top:7px;">${favCount} FAV · ${totalPlays} SINGS</div>
      </div>
      <div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:2px;color:rgba(255,255,255,.3);padding:0 4px 7px;">// THEME</div>
        <div style="display:flex;gap:6px;">${themeBtns}</div>
      </div>
    </div>
  </aside>`;
}

// ── header ─────────────────────────────────────────────────────────────────────
function headerHTML() {
  const st = state;
  const total = st.songs.length;
  const favCount = Object.values(st.favs).filter(Boolean).length;
  const activeListObj = st.lists.find((l) => l.id === st.activeList) || null;
  const hs = {
    library:   { en: '// LIBRARY',   title: 'ライブラリ',          desc: total + ' TRACKS ARCHIVED' },
    register:  { en: '// REGISTER',  title: '楽曲を登録',          desc: 'YOUTUBE → VAULT' },
    lists:     { en: '// PLAYLISTS', title: activeListObj ? activeListObj.name : 'マイリスト', desc: activeListObj ? activeListObj.songIds.length + ' TRACKS' : st.lists.length + ' LISTS' },
    favorites: { en: '// FAVORITES', title: 'お気に入り',          desc: favCount + ' FAVORITED' },
    stats:     { en: '// ANALYTICS', title: '統計ダッシュボード',  desc: 'VAULT INSIGHTS' },
  };
  const h = hs[st.screen];
  return `
    <header style="flex-shrink:0;display:flex;align-items:flex-end;justify-content:space-between;padding:26px 34px 20px;border-bottom:1px solid rgba(255,255,255,.06);">
      <div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:3px;color:var(--accent);margin-bottom:6px;">${esc(h.en)}</div>
        <h1 style="margin:0;font-size:27px;font-weight:900;letter-spacing:.5px;">${esc(h.title)}</h1>
      </div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:rgba(255,255,255,.4);text-align:right;line-height:1.7;">
        <div><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 8px var(--accent);margin-right:6px;animation:vvBlink 1.6s ease-in-out infinite;"></span>SYNCED · LOCAL VAULT</div>
        <div style="opacity:.6;">${esc(h.desc)}</div>
      </div>
    </header>`;
}

function mainHTML() {
  let body = '';
  if (state.screen === 'library') body = libraryHTML();
  else if (state.screen === 'register') body = registerHTML();
  else if (state.screen === 'favorites') body = favoritesHTML();
  else if (state.screen === 'lists') body = listsHTML();
  else if (state.screen === 'stats') body = statsHTML();
  return `
  ${bgHTML()}
  <main style="position:relative;z-index:4;flex:1;height:100vh;display:flex;flex-direction:column;overflow:hidden;">
    ${headerHTML()}
    <div data-act="clearPending" style="flex:1;overflow-y:auto;padding:24px 34px 40px;">${body}</div>
  </main>`;
}

// ── derived library list (filter/search/sort) ────────────────────────────────
function libDerived() {
  const st = state;
  let lib = st.songs.slice();
  if (st.filter !== 'all') lib = lib.filter((s) => s.genre === st.filter);
  if (st.query.trim()) {
    const q = st.query.trim().toLowerCase();
    lib = lib.filter((s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
  }
  const dir = st.sortDir === 'asc' ? 1 : -1;
  lib.sort((a, b) => {
    const k = st.sortKey;
    if (k === 'title') return a.title.localeCompare(b.title, 'ja') * dir;
    if (k === 'date') return (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) * dir;
    if (k === 'views') return (a.views - b.views) * dir;
    if (k === 'plays') return (a.plays - b.plays) * dir;
    return (a.id - b.id) * dir;
  });
  return lib;
}

// reusable song-card (grid) used by library / favorites / list detail
function tagChipsHTML(s, mt) {
  if (!s.hasTags) return '';
  return `<div style="display:flex;gap:5px;margin-top:${mt}px;flex-wrap:wrap;">${s.tagChips.map((tc) => `<span style="${css(tc.style)}">${esc(tc.label)}</span>`).join('')}</div>`;
}

function libraryHTML() {
  const st = state;
  const lib = libDerived().map(decorate);
  const showGenre = st.filter === 'all';
  const G = GENRES;
  const chipDefs = [{ key: 'all', label: 'すべて', color: '#fff' }].concat(Object.keys(G).map((k) => ({ key: k, label: G[k].label, color: G[k].color })));
  const chips = chipDefs.map((c) => {
    const on = st.filter === c.key;
    return `<button data-act="filter" data-filter="${c.key}" style="${css({ padding: '8px 15px', borderRadius: '9px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: 700, transition: 'all .15s', whiteSpace: 'nowrap', border: on ? '1px solid ' + c.color : '1px solid rgba(255,255,255,.1)', background: on ? (c.key === 'all' ? 'rgba(255,255,255,.12)' : c.color + '1f') : 'rgba(255,255,255,.03)', color: on ? (c.key === 'all' ? '#fff' : c.color) : 'rgba(255,255,255,.55)', boxShadow: on && c.key !== 'all' ? '0 0 16px ' + c.color + '44' : 'none' })}">${esc(c.label)}</button>`;
  }).join('');
  const ar = (k) => (st.sortKey === k ? (st.sortDir === 'asc' ? '▲' : '▼') : '');
  const isListView = st.view === 'list';
  const vb = (on) => css({ padding: '7px 9px', borderRadius: '7px', border: 'none', cursor: 'pointer', transition: 'background .15s', background: on ? 'rgba(255,255,255,.14)' : 'transparent', color: on ? '#fff' : 'rgba(255,255,255,.4)', display: 'grid', placeItems: 'center' });
  const gc = showGenre ? '96px 1fr 130px 104px 84px 76px 106px' : '96px 1fr 104px 84px 76px 106px';

  const toolbar = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:18px;flex-wrap:wrap;">
      <div style="display:flex;gap:8px;flex-wrap:wrap;">${chips}</div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="display:flex;align-items:center;gap:9px;padding:9px 14px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);width:220px;">
          ${ICON.search(14, 'rgba(255,255,255,.45)')}
          <input data-field="query" data-act="query" value="${esc(st.query)}" placeholder="タイトル・アーティスト検索" style="flex:1;background:none;border:none;color:#fff;font-size:13px;width:100%;"/>
        </div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:12px;color:rgba(255,255,255,.45);white-space:nowrap;">${lib.length} 件</div>
        <div style="display:flex;gap:2px;padding:3px;border-radius:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);">
          <button data-act="view" data-view="list" style="${vb(isListView)}" title="リスト"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></button>
          <button data-act="view" data-view="grid" style="${vb(!isListView)}" title="グリッド"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>
        </div>
      </div>
    </div>`;

  let listing;
  if (isListView) {
    const headerRow = css({ display: 'grid', gridTemplateColumns: gc, alignItems: 'center', gap: '16px', padding: '13px 20px', borderBottom: '1px solid rgba(255,255,255,.07)', fontFamily: "'Share Tech Mono',monospace", fontSize: '10px', letterSpacing: '1.5px', color: 'rgba(255,255,255,.4)' });
    const rowStyle = css({ display: 'grid', gridTemplateColumns: gc, alignItems: 'center', gap: '16px', padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,.04)', transition: 'background .15s' });
    const rows = lib.map((s) => `
      <div data-hover="row" style="${rowStyle}">
        <div style="position:relative;width:96px;height:54px;border-radius:7px;overflow:hidden;border:1px solid rgba(255,255,255,.1);">
          <div style="${css(s.thumbStyle)}"></div>
          ${s.thumbImg ? `<img src="${s.thumbImg}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" loading="lazy" onerror="this.style.display='none'">` : ''}
          <button data-act="play" data-id="${s.id}" style="position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.3);border:none;cursor:pointer;opacity:0;transition:opacity .15s;" title="歌唱 +1" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0">${ICON.play(18)}</button>
          <span style="position:absolute;right:4px;bottom:3px;font-family:'Share Tech Mono',monospace;font-size:9px;padding:1px 4px;border-radius:3px;background:rgba(0,0,0,.7);color:#fff;">${esc(s.dur)}</span>
        </div>
        <div style="min-width:0;">
          <button data-act="open" data-id="${s.id}" data-hover="title" style="font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:none;border:none;cursor:pointer;color:#fff;padding:0;text-align:left;max-width:100%;transition:color .15s;" title="YouTubeで開く">${esc(s.title)}</button>
          <div style="display:flex;align-items:center;gap:7px;margin-top:2px;min-width:0;">
            ${s.artists.length > 1 ? `<div style="display:flex;flex-wrap:wrap;gap:4px;min-width:0;">${s.artists.map((a) => `<span style="font-size:11px;color:rgba(255,255,255,.65);padding:1px 6px;border-radius:4px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.04);white-space:nowrap;">${esc(a)}</span>`).join('')}</div>` : `<span style="font-size:12px;color:rgba(255,255,255,.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(s.artist)}</span>`}
            ${s.hasDetail ? `<span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent);padding:1px 5px;border-radius:4px;border:1px solid var(--accent);flex-shrink:0;opacity:.8;">${esc(s.detailLabel)}</span><span style="font-size:12px;color:rgba(255,255,255,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(s.detailText)}</span>` : ''}
          </div>
          ${tagChipsHTML(s, 5)}
        </div>
        ${showGenre ? `<div><span style="${css(s.badgeStyle)}"><span style="${css(s.dotStyle)}"></span>${esc(s.genreLabel)}</span></div>` : ''}
        <div style="font-family:'Share Tech Mono',monospace;font-size:12px;color:rgba(255,255,255,.6);">${esc(s.dateF)}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:12px;color:rgba(255,255,255,.55);">${esc(s.viewsF)}</div>
        <button data-act="showUnsing" data-id="${s.id}" title="クリックで取り消し" style="font-family:'Share Tech Mono',monospace;font-size:13px;color:var(--accent);background:none;border:none;cursor:pointer;padding:0;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:2px;">${esc(s.playsF)}</button>
        <div style="display:flex;align-items:center;gap:3px;justify-content:flex-end;">
          ${s.isPending
            ? `<span style="font-size:10px;color:rgba(255,100,100,.9);margin-right:2px;white-space:nowrap;">削除?</span>
               <button data-act="confirmDel" data-id="${s.id}" title="確認" style="background:rgba(255,80,80,.2);border:1px solid rgba(255,100,100,.5);color:#fff;border-radius:6px;cursor:pointer;padding:4px 7px;font-size:11px;font-weight:700;">✓</button>
               <button data-act="cancelDel" title="キャンセル" style="background:none;border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.6);border-radius:6px;cursor:pointer;padding:4px 7px;font-size:12px;">✕</button>`
            : `<button data-act="fav" data-id="${s.id}" data-hover="iconbtn" style="background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;" title="お気に入り">${ICON.star(17, s)}</button>
               <button data-act="addToList" data-id="${s.id}" data-hover="iconbtn" style="background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:rgba(255,255,255,.35);" title="リストに追加">${ICON.plus(15)}</button>
               <button data-act="startDel" data-id="${s.id}" data-hover="iconbtn" style="background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:rgba(255,255,255,.3);" title="削除">${ICON.trash(14)}</button>`}
        </div>
      </div>`).join('');
    listing = `
      <div style="border-radius:16px;background:rgba(255,255,255,.025);backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.07);overflow:hidden;">
        <div style="${headerRow}">
          <span></span>
          <button data-act="sort" data-sort="title" style="background:none;border:none;color:inherit;font:inherit;cursor:pointer;text-align:left;letter-spacing:1.5px;">TITLE ${ar('title')}</button>
          ${showGenre ? '<span>GENRE</span>' : ''}
          <button data-act="sort" data-sort="date" style="background:none;border:none;color:inherit;font:inherit;cursor:pointer;text-align:left;letter-spacing:1.5px;">投稿日 ${ar('date')}</button>
          <button data-act="sort" data-sort="views" style="background:none;border:none;color:inherit;font:inherit;cursor:pointer;text-align:left;letter-spacing:1.5px;">視聴 ${ar('views')}</button>
          <button data-act="sort" data-sort="plays" style="background:none;border:none;color:inherit;font:inherit;cursor:pointer;text-align:left;letter-spacing:1.5px;">歌唱 ${ar('plays')}</button>
          <span></span>
        </div>
        ${rows}
        ${lib.length === 0 ? `<div style="padding:40px;text-align:center;color:rgba(255,255,255,.35);font-size:14px;">見つかりません</div>` : ''}
      </div>`;
  } else {
    listing = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(226px,1fr));gap:16px;">${lib.map((s) => gridCardHTML(s, { showGenre, withDelete: false, withPlays: true })).join('')}</div>`;
  }
  return `<div style="animation:vvFade 200ms ease;">${toolbar}${listing}</div>`;
}

// generic grid card (library grid / favorites)
function gridCardHTML(s, opt) {
  const showGenre = opt.showGenre;
  return `
    <div data-hover="card" style="border-radius:16px;overflow:hidden;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);transition:all .15s;">
      <div style="position:relative;width:100%;height:${opt.h || 128}px;">
        <div style="${css(s.thumbStyle)}"></div>
        ${s.thumbImg ? `<img src="${s.thumbImg}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" loading="lazy" onerror="this.style.display='none'">` : ''}
        <button data-act="play" data-id="${s.id}" style="position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.25);border:none;cursor:pointer;opacity:0;transition:opacity .15s;" title="歌唱 +1" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0">${ICON.play(opt.playSize || 24)}</button>
        <span style="position:absolute;right:6px;bottom:5px;font-family:'Share Tech Mono',monospace;font-size:10px;padding:2px 5px;border-radius:3px;background:rgba(0,0,0,.75);">${esc(s.dur)}</span>
        ${showGenre ? `<div style="position:absolute;left:8px;top:8px;"><span style="${css(s.badgeStyle)}"><span style="${css(s.dotStyle)}"></span>${esc(s.genreLabel)}</span></div>` : ''}
      </div>
      <div style="padding:12px 14px 14px;">
        <button data-act="open" data-id="${s.id}" data-hover="title" style="font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:none;border:none;cursor:pointer;color:#fff;padding:0;text-align:left;width:100%;transition:color .15s;" title="YouTubeで開く">${esc(s.title)}</button>
        ${s.artists.length > 1 ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:2px;">${s.artists.map((a) => `<span style="font-size:11px;color:rgba(255,255,255,.65);padding:1px 6px;border-radius:4px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.04);white-space:nowrap;">${esc(a)}</span>`).join('')}</div>` : `<div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(s.artist)}</div>`}
        ${s.hasDetail ? `<div style="display:flex;align-items:center;gap:6px;margin-top:5px;min-width:0;"><span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent);padding:1px 5px;border-radius:4px;border:1px solid var(--accent);opacity:.8;flex-shrink:0;">${esc(s.detailLabel)}</span><span style="font-size:11px;color:rgba(255,255,255,.6);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(s.detailText)}</span></div>` : ''}
        ${tagChipsHTML(s, 7)}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
          <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:rgba(255,255,255,.4);">${esc(s.dateF)}</span>
          <div style="display:flex;gap:3px;align-items:center;">
            <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--accent);margin-right:4px;">${esc(s.playsF)}</span>
            <button data-act="addToList" data-id="${s.id}" data-hover="iconbtn" style="background:none;border:none;cursor:pointer;padding:3px;border-radius:5px;color:rgba(255,255,255,.35);" title="リスト追加">${ICON.plus(14)}</button>
            <button data-act="fav" data-id="${s.id}" style="background:none;border:none;cursor:pointer;padding:3px;" title="お気に入り">${ICON.star(16, s)}</button>
          </div>
        </div>
      </div>
    </div>`;
}

function favoritesHTML() {
  const fav = state.songs.filter((s) => state.favs[s.id]).map(decorate);
  if (fav.length === 0) {
    return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px;animation:vvFade 200ms ease;"><div style="grid-column:1/-1;padding:48px;text-align:center;color:rgba(255,255,255,.35);font-size:14px;">お気に入りがまだありません。★ をタップして登録しましょう。</div></div>`;
  }
  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px;animation:vvFade 200ms ease;">${fav.map((s) => gridCardHTML(s, { showGenre: true, h: 130, playSize: 26 })).join('')}</div>`;
}

// ── register flow ───────────────────────────────────────────────────────────
function registerHTML() {
  const st = state;
  const G = GENRES;
  const cur = Math.min(st.regStep, 3);
  const steps = [{ n: 1, label: '検索', en: 'SEARCH' }, { n: 2, label: '候補を選択', en: 'SELECT' }, { n: 3, label: '確認・登録', en: 'CONFIRM' }].map((s) => {
    const done = s.n < cur, activeS = s.n === cur;
    const dot = css({ width: '34px', height: '34px', borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: '14px', color: (done || activeS) ? '#06070f' : 'rgba(255,255,255,.5)', background: (done || activeS) ? 'linear-gradient(135deg,var(--accent),var(--accent3))' : 'rgba(255,255,255,.06)', border: (done || activeS) ? 'none' : '1px solid rgba(255,255,255,.12)', boxShadow: activeS ? '0 0 18px var(--glow)' : 'none' });
    const labelStyle = css({ fontSize: '13px', fontWeight: 700, color: (done || activeS) ? '#fff' : 'rgba(255,255,255,.5)' });
    const lineStyle = css({ flex: 1, height: '2px', margin: '0 14px', borderRadius: '2px', background: done ? 'linear-gradient(90deg,var(--accent),var(--accent3))' : 'rgba(255,255,255,.08)', display: s.n === 3 ? 'none' : 'block' });
    return `<div style="display:flex;align-items:center;flex:1;"><div style="${dot}">${done ? '✓' : s.n}</div><div style="margin-left:11px;line-height:1.2;"><div style="${labelStyle}">${s.label}</div><div style="font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:1px;color:rgba(255,255,255,.35);">${s.en}</div></div><div style="${lineStyle}"></div></div>`;
  }).join('');

  let panel = '';
  if (st.regStep === 1) {
    panel = `
      <div style="border-radius:18px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(18px);padding:42px 40px 46px;text-align:center;animation:vvFade 180ms ease;">
        <div style="width:58px;height:58px;border-radius:15px;margin:0 auto 20px;display:grid;place-items:center;background:linear-gradient(135deg,var(--accent),var(--accent3));box-shadow:0 0 30px var(--glow);">${ICON.search(28, '#06070f')}</div>
        <h2 style="margin:0 0 8px;font-size:21px;font-weight:900;">楽曲を検索して登録</h2>
        <p style="margin:0 0 26px;font-size:13px;color:rgba(255,255,255,.5);line-height:1.7;">曲名を入力すると YouTube から候補を取得します。<br/>サムネイル・アーティスト・投稿日は自動で取り込まれます。</p>
        <div style="display:flex;gap:10px;max-width:560px;margin:0 auto;">
          <div style="flex:1;display:flex;align-items:center;gap:11px;padding:14px 18px;border-radius:12px;background:rgba(0,0,0,.35);border:1px solid var(--accent);box-shadow:0 0 24px var(--glow);">
            ${ICON.search(18, 'var(--accent)')}
            <input data-field="regQuery" data-act="regQuery" value="${esc(st.regQuery)}" placeholder="例：グリッチ・ハート" style="flex:1;background:none;border:none;color:#fff;font-size:15px;"/>
          </div>
          <button data-act="startSearch" style="padding:0 28px;border-radius:12px;border:none;cursor:pointer;font-weight:700;font-size:14px;color:#06070f;background:linear-gradient(135deg,var(--accent),var(--accent3));box-shadow:0 0 22px var(--glow);">検索</button>
        </div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:rgba(255,255,255,.3);margin-top:18px;letter-spacing:1px;">YOUTUBE DATA API · v3</div>
      </div>`;
  } else if (st.regStep === 2) {
    const qShown = st.regQuery.trim() || 'グリッチ・ハート';
    const cands = st.regCandidates.map((c) => {
      const color = c.thumbColor || '#38e8ff';
      const thumb = c.thumb
        ? `position:absolute;inset:0;background-image:url('${esc(c.thumb)}');background-size:cover;background-position:center;`
        : `position:absolute;inset:0;background:radial-gradient(130% 150% at 16% -10%,${color}88,transparent 56%),linear-gradient(135deg,#0b1126,#06070f);`;
      return `
        <button data-act="selectCand" data-id="${esc(c.videoId || c.title)}" data-hover="cand" style="display:grid;grid-template-columns:148px 1fr auto;align-items:center;gap:16px;text-align:left;padding:11px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);cursor:pointer;transition:all .15s;">
          <div style="position:relative;width:148px;height:84px;border-radius:9px;overflow:hidden;border:1px solid rgba(255,255,255,.1);">
            <div style="${thumb}"></div>
            <div style="position:absolute;inset:0;display:grid;place-items:center;">${ICON.play(22)}</div>
            <span style="position:absolute;right:5px;bottom:4px;font-family:'Share Tech Mono',monospace;font-size:10px;padding:1px 5px;border-radius:3px;background:rgba(0,0,0,.75);">${esc(c.dur)}</span>
          </div>
          <div style="min-width:0;">
            <div style="font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(c.title)}</div>
            <div style="font-size:12px;color:rgba(255,255,255,.55);margin-top:3px;">${esc(c.channel)}</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:rgba(255,255,255,.4);margin-top:5px;">${esc(c.views)} 回視聴 · ${esc(c.published)}</div>
          </div>
          <div style="padding:0 8px;display:flex;align-items:center;gap:7px;color:var(--accent);font-family:'Share Tech Mono',monospace;font-size:11px;">選択<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 6 15 12 9 18"/></svg></div>
        </button>`;
    }).join('');
    const resultContent = st.regLoading
      ? `<div style="padding:40px;text-align:center;color:rgba(255,255,255,.4);font-family:'Share Tech Mono',monospace;font-size:12px;">SEARCHING…</div>`
      : cands.length > 0
        ? cands
        : `<div style="padding:40px;text-align:center;">
             <div style="color:rgba(255,255,255,.4);font-family:'Share Tech Mono',monospace;font-size:12px;margin-bottom:12px;">NO RESULTS</div>
             <div style="color:rgba(255,255,255,.3);font-size:12px;">「${esc(qShown)}」に該当する曲が見つかりませんでした。<br/>別の検索語をお試しください。</div>
           </div>`;
    const mockBanner = (!st.regLoading && st.regSource === 'mock') ? `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:10px;background:rgba(255,200,0,.07);border:1px solid rgba(255,200,0,.25);margin-bottom:14px;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffd24a" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:#ffd24a;letter-spacing:.5px;">DEMO MODE — YouTube API キー未設定。以下はサンプル候補です。実際のYouTube検索結果ではありません。</span>
      </div>` : '';
    panel = `
      <div style="animation:vvFade 180ms ease;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:rgba(255,255,255,.5);">${st.regSource === 'youtube' ? 'YOUTUBE RESULTS' : 'SEARCH RESULTS'} · 「${esc(qShown)}」</div>
          <button data-act="backStep1" style="background:none;border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.6);border-radius:8px;padding:7px 14px;font-size:12px;cursor:pointer;">← 検索に戻る</button>
        </div>
        ${mockBanner}
        <div style="display:flex;flex-direction:column;gap:10px;">${resultContent}</div>
      </div>`;
  } else if (st.regStep === 3) {
    const sel = st.regSelected || {};
    const selColor = sel.genre ? (GENRES[sel.genre] || GENRES.artist).color : '#38e8ff';
    const selThumb = sel.thumb
      ? `position:absolute;inset:0;background-image:url('${esc(sel.thumb)}');background-size:cover;background-position:center;`
      : `position:absolute;inset:0;background:radial-gradient(130% 150% at 16% -10%,${selColor}88,transparent 56%),linear-gradient(135deg,#0b1126,#06070f);`;
    // Autocomplete candidates from existing library
    const knownVocals   = [...new Set(state.songs.flatMap((x) => x.vocals || []).filter(Boolean))].sort();
    const knownWorks    = [...new Set(state.songs.filter((x) => x.genre === 'anime').map((x) => x.work).filter(Boolean))].sort();
    const knownTags     = [...new Set(state.songs.flatMap((x) => x.tags || []).filter(Boolean))].sort();
    const knownArtists  = [...new Set(state.songs.flatMap((x) => x.artists || (x.artist ? [x.artist] : [])).filter(Boolean))].sort();
    const suggChip = (v, act) => `<button data-act="${act}" data-val="${esc(v)}" style="padding:3px 9px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:11.5px;font-weight:600;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);color:rgba(255,255,255,.7);white-space:nowrap;">${esc(v)}</button>`;
    // Vocals: preset list merged with library history, show all as chips
    const allVocals   = [...new Set([...PRESET_VOCALS, ...knownVocals])];
    const quickVocals = allVocals.filter((v) => !st.regVocals.includes(v));
    const quickTags   = knownTags.filter((v) => !st.regTags.includes(v)).slice(0, 10);
    // Artists: typeahead — show matches while typing, show recent when empty
    const artistQ = (st.regArtistQ || '').trim().toLowerCase();
    const artistMatches = artistQ
      ? knownArtists.filter((v) => !st.regArtists.includes(v) && v.toLowerCase().includes(artistQ)).slice(0, 8)
      : knownArtists.filter((v) => !st.regArtists.includes(v)).slice(0, 6);
    // Works: typeahead — filter by what's typed, show recent when empty
    const workQ = (st.regWork || '').trim().toLowerCase();
    const workMatches = workQ
      ? knownWorks.filter((v) => v.toLowerCase().includes(workQ) && v !== st.regWork).slice(0, 6)
      : knownWorks.slice(0, 6);
    const vocalSuggHTML  = quickVocals.length > 0   ? `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;">${quickVocals.map((v) => suggChip(v, 'quickAddVocal')).join('')}</div>` : '';
    const tagSuggHTML    = quickTags.length > 0     ? `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;">${quickTags.map((v) => suggChip(v, 'quickAddTag')).join('')}</div>` : '';
    const artistSuggHTML = artistMatches.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;">${artistMatches.map((v) => suggChip(v, 'quickAddArtist')).join('')}</div>` : '';
    const workSuggHTML   = workMatches.length > 0   ? `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;">${workMatches.map((v) => { const active = st.regWork === v; return `<button data-act="quickSetWork" data-val="${esc(v)}" style="padding:3px 9px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:11.5px;font-weight:600;border:1px solid ${active ? 'var(--accent)' : 'rgba(255,255,255,.18)'};background:${active ? 'rgba(34,211,238,.1)' : 'rgba(255,255,255,.05)'};color:${active ? 'var(--accent)' : 'rgba(255,255,255,.7)'};white-space:nowrap;">${esc(v)}</button>`; }).join('')}</div>` : '';
    const genreOpts = Object.keys(G).map((k) => {
      const on = st.regGenre === k;
      return `<button data-act="regGenre" data-genre="${k}" style="${css({ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px 6px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700, border: on ? '1px solid ' + G[k].color : '1px solid rgba(255,255,255,.1)', background: on ? G[k].color + '1f' : 'rgba(0,0,0,.25)', color: on ? G[k].color : 'rgba(255,255,255,.5)', boxShadow: on ? '0 0 14px ' + G[k].color + '44' : 'none' })}"><span style="${css({ width: '7px', height: '7px', borderRadius: '50%', background: G[k].color, boxShadow: '0 0 7px ' + G[k].color })}"></span>${G[k].label}</button>`;
    }).join('');
    const artistChips = st.regArtists.map((v, i) => `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 7px 4px 10px;border-radius:7px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);font-size:12px;font-weight:700;">${esc(v)}<button data-act="rmArtist" data-idx="${i}" style="background:none;border:none;cursor:pointer;color:rgba(255,255,255,.6);font-size:15px;padding:0;line-height:1;">×</button></span>`).join('');
    const vocalChips = st.regVocals.map((v, i) => `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 7px 4px 10px;border-radius:7px;background:var(--accent);color:#06070f;font-size:12px;font-weight:700;">${esc(v)}<button data-act="rmVocal" data-idx="${i}" style="background:none;border:none;cursor:pointer;color:#06070f;font-size:15px;padding:0;line-height:1;">×</button></span>`).join('');
    const tagChips = st.regTags.map((t, i) => `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 7px 4px 9px;border-radius:7px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);font-size:12px;">${esc(t)}<button data-act="rmTag" data-idx="${i}" style="background:none;border:none;cursor:pointer;color:rgba(255,255,255,.55);font-size:15px;padding:0;line-height:1;">×</button></span>`).join('');
    panel = `
      <div style="border-radius:18px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(18px);padding:30px;animation:vvFade 180ms ease;">
        <div style="display:grid;grid-template-columns:240px 1fr;gap:28px;align-items:start;">
          <div>
            <div style="position:relative;width:100%;height:136px;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.12);">
              <div style="${selThumb}"></div>
              <div style="position:absolute;inset:0;display:grid;place-items:center;">${ICON.play(30)}</div>
            </div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:rgba(255,255,255,.4);margin-top:14px;line-height:2;">
              <div>SOURCE · YouTube</div>
              <div>投稿日 · <span style="color:var(--accent);">${esc(sel.date || '')}</span></div>
              <div>長さ · ${esc(sel.dur || '')}</div>
              <div>視聴 · ${esc(sel.views || '')}</div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:14px;">
            <div>
              <label style="font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:1.5px;color:rgba(255,255,255,.45);">楽曲名</label>
              <div style="margin-top:7px;padding:2px 14px;border-radius:10px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);">
                <input data-field="regTitle" data-act="regTitle" value="${esc(st.regTitle)}" style="width:100%;padding:10px 0;background:none;border:none;color:#fff;font-size:15px;font-weight:700;"/>
              </div>
            </div>
            <div>
              <label style="font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:1.5px;color:rgba(255,255,255,.45);">アーティスト（複数可）</label>
              <div style="margin-top:7px;display:flex;flex-wrap:wrap;gap:7px;align-items:center;min-height:44px;padding:8px 12px;border-radius:10px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);">
                ${artistChips}
                <input data-act="addArtist" data-field="addArtistQ" value="${esc(st.regArtistQ || '')}" placeholder="名前を入力しEnterで追加" style="flex:1;min-width:120px;background:none;border:none;color:#fff;font-size:13px;"/>
              </div>
              ${artistSuggHTML}
            </div>
            <div>
              <label style="font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:1.5px;color:rgba(255,255,255,.45);">ジャンル</label>
              <div style="display:flex;gap:8px;margin-top:8px;">${genreOpts}</div>
            </div>
            ${st.regGenre === 'vocaloid' ? `
            <div>
              <label style="font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:1.5px;color:rgba(255,255,255,.45);">歌唱ボカロ（複数可）</label>
              <div style="margin-top:7px;display:flex;flex-wrap:wrap;gap:7px;align-items:center;min-height:44px;padding:8px 12px;border-radius:10px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);">
                ${vocalChips}
                <input data-act="addVocal" placeholder="名前を入力しEnterで追加" style="flex:1;min-width:110px;background:none;border:none;color:#fff;font-size:12px;"/>
              </div>
              ${vocalSuggHTML}
            </div>` : ''}
            ${st.regGenre === 'anime' ? `
            <div>
              <label style="font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:1.5px;color:rgba(255,255,255,.45);">作品名</label>
              <div style="margin-top:7px;padding:2px 14px;border-radius:10px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);">
                <input data-field="regWork" data-act="regWork" value="${esc(st.regWork)}" placeholder="例：TVアニメ「…」" style="width:100%;padding:10px 0;background:none;border:none;color:#fff;font-size:13px;"/>
              </div>
              ${workSuggHTML}
            </div>` : ''}
            <div>
              <label style="font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:1.5px;color:rgba(255,255,255,.45);">タグ（複数可）<span style="opacity:.5;font-size:9px;margin-left:8px;">例：バラード 高音</span></label>
              <div style="margin-top:7px;display:flex;flex-wrap:wrap;gap:7px;align-items:center;min-height:44px;padding:8px 12px;border-radius:10px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);">
                ${tagChips}
                <input data-act="addTag" placeholder="タグを入力しEnterで追加" style="flex:1;min-width:110px;background:none;border:none;color:#fff;font-size:12px;"/>
              </div>
              ${tagSuggHTML}
            </div>
            <div style="display:flex;gap:10px;margin-top:4px;">
              <button data-act="backStep2" style="padding:13px 22px;border-radius:11px;background:none;border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);font-weight:700;font-size:13px;cursor:pointer;">← 候補に戻る</button>
              <button data-act="saveSong" style="flex:1;padding:13px;border-radius:11px;border:none;cursor:pointer;font-weight:700;font-size:14px;color:#06070f;background:linear-gradient(135deg,var(--accent),var(--accent3));box-shadow:0 0 22px var(--glow);">VAULT に登録</button>
            </div>
          </div>
        </div>
      </div>
`;
  } else if (st.regStep === 4) {
    const sel = st.regSelected || {};
    panel = `
      <div style="border-radius:18px;background:rgba(255,255,255,.03);border:1px solid var(--accent);backdrop-filter:blur(18px);padding:48px 40px;text-align:center;box-shadow:0 0 40px var(--glow);animation:vvPop 220ms ease;">
        <div style="width:64px;height:64px;border-radius:50%;margin:0 auto 22px;display:grid;place-items:center;background:linear-gradient(135deg,var(--accent),var(--accent3));box-shadow:0 0 34px var(--glow);"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#06070f" stroke-width="3" stroke-linecap="round"><polyline points="4 12 10 18 20 6"/></svg></div>
        <h2 style="margin:0 0 8px;font-size:21px;font-weight:900;">登録が完了しました</h2>
        <p style="margin:0 0 28px;font-size:14px;color:rgba(255,255,255,.6);">「${esc(sel.title || '')}」を VAULT に追加しました。</p>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button data-act="resetReg" style="padding:13px 26px;border-radius:11px;border:1px solid rgba(255,255,255,.18);background:none;color:#fff;font-weight:700;font-size:13px;cursor:pointer;">続けて登録</button>
          <button data-act="go" data-screen="library" style="padding:13px 26px;border-radius:11px;border:none;cursor:pointer;font-weight:700;font-size:13px;color:#06070f;background:linear-gradient(135deg,var(--accent),var(--accent3));box-shadow:0 0 22px var(--glow);">ライブラリで確認</button>
        </div>
      </div>`;
  }
  return `<div style="max-width:880px;margin:0 auto;animation:vvFade 200ms ease;"><div style="display:flex;align-items:center;margin:6px 0 30px;">${steps}</div>${panel}</div>`;
}

// ── my lists ──────────────────────────────────────────────────────────────────
function getCover(l) {
  const cs = l.songIds.slice(0, 4).map((id) => { const s = state.songs.find((x) => x.id === id); return s ? (GENRES[s.genre] || GENRES.artist).color : null; }).filter(Boolean);
  while (cs.length < 4) cs.push(l.colors[cs.length] || '#1a1a2e');
  return cs;
}
function listsHTML() {
  const st = state;
  const activeListObj = st.lists.find((l) => l.id === st.activeList) || null;
  if (activeListObj) {
    const songs = activeListObj.songIds.map((id) => st.songs.find((s) => s.id === id)).filter(Boolean).map(decorate);
    const cards = songs.map((s) => `
      <div data-hover="card" style="border-radius:16px;overflow:hidden;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);transition:all .15s;">
        <div style="position:relative;width:100%;height:120px;">
          <div style="${css(s.thumbStyle)}"></div>
          <button data-act="play" data-id="${s.id}" style="position:absolute;inset:0;display:grid;place-items:center;background:none;border:none;cursor:pointer;">${ICON.play(22)}</button>
          <div style="position:absolute;left:8px;top:8px;"><span style="${css(s.badgeStyle)}"><span style="${css(s.dotStyle)}"></span>${esc(s.genreLabel)}</span></div>
          <button data-act="removeFromList" data-id="${s.id}" data-list="${activeListObj.id}" style="position:absolute;right:6px;top:6px;background:rgba(0,0,0,.5);border:none;cursor:pointer;color:rgba(255,255,255,.7);border-radius:6px;padding:4px 7px;font-size:11px;" title="リストから削除">✕</button>
        </div>
        <div style="padding:10px 13px 12px;">
          <button data-act="open" data-id="${s.id}" data-hover="title" style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:none;border:none;cursor:pointer;color:#fff;padding:0;text-align:left;width:100%;transition:color .15s;" title="YouTubeで開く">${esc(s.title)}</button>
          <div style="font-size:11px;color:rgba(255,255,255,.5);margin-top:2px;">${esc(s.artist)}</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:rgba(255,255,255,.4);margin-top:6px;">${esc(s.playsF)} 歌唱</div>
        </div>
      </div>`).join('');
    return `
      <div style="animation:vvFade 200ms ease;"><div style="animation:vvFade 180ms ease;">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:22px;">
          <button data-act="closeList" data-hover="dashbtn" style="display:flex;align-items:center;gap:8px;background:none;border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);border-radius:9px;padding:8px 14px;cursor:pointer;font-size:13px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>リスト一覧</button>
          <div><div style="font-size:20px;font-weight:900;">${esc(activeListObj.name)}</div><div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--accent);letter-spacing:1px;">${esc(activeListObj.en)} · ${activeListObj.songIds.length}曲</div></div>
        </div>
        ${songs.length > 0
          ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px;">${cards}</div>`
          : `<div style="padding:48px;text-align:center;color:rgba(255,255,255,.35);font-size:14px;border-radius:16px;border:1.5px dashed rgba(255,255,255,.12);">まだ楽曲がありません。ライブラリから「＋」で追加しましょう。</div>`}
      </div></div>`;
  }
  // grid of lists
  const cards = st.lists.map((l) => {
    const cv = getCover(l);
    return `
      <div data-act="openList" data-id="${l.id}" data-hover="card" style="border-radius:16px;overflow:hidden;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);transition:all .15s;cursor:pointer;">
        <div style="position:relative;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;height:130px;gap:1px;">
          <div style="background:${cv[0]};"></div><div style="background:${cv[1]};"></div><div style="background:${cv[2]};"></div><div style="background:${cv[3]};"></div>
          <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(8,10,20,.85));"></div>
          <div style="position:absolute;left:13px;bottom:11px;"><div style="font-size:16px;font-weight:900;">${esc(l.name)}</div><div style="font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:1.5px;color:var(--accent);margin-top:2px;">${esc(l.en)}</div></div>
          <div style="position:absolute;right:11px;bottom:11px;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:var(--accent);box-shadow:0 0 18px var(--glow);"><svg width="16" height="16" viewBox="0 0 24 24" fill="#06070f"><polygon points="8 5 19 12 8 19"/></svg></div>
        </div>
        <div style="padding:12px 14px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:rgba(255,255,255,.55);">${l.songIds.length} TRACKS</span>
          <button data-act="deleteList" data-id="${l.id}" style="background:none;border:none;cursor:pointer;color:rgba(255,255,255,.3);padding:2px;" title="削除"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
        </div>
      </div>`;
  }).join('');
  const createCard = `
    <button data-act="openCreateList" data-hover="createcard" style="border-radius:16px;min-height:218px;border:1.5px dashed rgba(255,255,255,.18);background:rgba(255,255,255,.015);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:13px;cursor:pointer;color:rgba(255,255,255,.55);transition:all .15s;">
      <div style="width:50px;height:50px;border-radius:13px;display:grid;place-items:center;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);">${ICON.plus(24)}</div>
      <div style="font-weight:700;font-size:14px;">新しいマイリスト</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:1px;opacity:.6;">CREATE PLAYLIST</div>
    </button>`;
  return `<div style="animation:vvFade 200ms ease;"><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px;">${createCard}${cards}</div></div>`;
}

// ── stats / analytics ──────────────────────────────────────────────────────────
function statsHTML() {
  const st = state;
  const G = GENRES;
  const songs = st.songs;
  const total = songs.length;
  const favCount = Object.values(st.favs).filter(Boolean).length;

  // donut
  const counts = { vocaloid: 0, anime: 0, artist: 0, game: 0 };
  songs.forEach((s) => (counts[s.genre] = (counts[s.genre] || 0) + 1));
  const C = 2 * Math.PI * 70; let acc = 0;
  const donut = Object.keys(G).map((k) => {
    const pct = (counts[k] || 0) / Math.max(total, 1), seg = pct * C;
    const o = { genre: k, label: G[k].label, count: counts[k] || 0, pct: Math.round(pct * 100), dash: seg.toFixed(2) + ' ' + (C - seg).toFixed(2), offset: (-acc * C).toFixed(2), color: G[k].color };
    acc += pct; return o;
  });
  const donutCircles = donut.map((seg) => `<circle cx="90" cy="90" r="70" stroke-dasharray="${seg.dash}" stroke-dashoffset="${seg.offset}" style="fill:none;stroke:${seg.color};stroke-width:18;"></circle>`).join('');
  const donutLegend = donut.map((seg) => `<div style="display:flex;align-items:center;gap:10px;"><span style="${css({ width: '10px', height: '10px', borderRadius: '3px', background: seg.color, boxShadow: '0 0 9px ' + seg.color, flexShrink: 0 })}"></span><span style="flex:1;font-size:13px;">${seg.label}</span><span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:rgba(255,255,255,.5);">${seg.count}曲</span><span style="font-family:'Orbitron',sans-serif;font-weight:700;font-size:14px;width:42px;text-align:right;color:${seg.color};">${seg.pct}%</span></div>`).join('');

  // monthly bars
  const months = ['10', '11', '12', '01', '02', '03', '04', '05', '06'], mvals = [1, 2, 1, 3, 2, 2, 3, 1, 2], maxM = Math.max(...mvals);
  const bars = months.map((m, i) => `<div style="flex:1;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:8px;position:relative;"><span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--accent);">${mvals[i]}</span><div style="${css({ width: '100%', height: (mvals[i] / maxM * 100) + '%', minHeight: '6px', borderRadius: '6px 6px 0 0', background: 'linear-gradient(180deg,var(--accent),var(--accent3))', boxShadow: '0 0 14px var(--glow)' })}"></div><span style="position:absolute;bottom:-20px;font-family:'Share Tech Mono',monospace;font-size:9px;color:rgba(255,255,255,.4);">${m}</span></div>`).join('');

  // cumulative area
  let run = 0; const cum = mvals.map((v) => (run += v));
  const W = 520, H = 160, pad = 14, maxC = cum[cum.length - 1];
  const pts = cum.map((v, i) => [pad + i * ((W - 2 * pad) / (cum.length - 1)), H - pad - (v / maxC) * (H - 2 * pad - 6)]);
  const linePath = 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
  const areaPath = linePath + ' L' + (W - pad).toFixed(1) + ' ' + (H - pad) + ' L' + pad + ' ' + (H - pad) + ' Z';
  const areaDots = pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" style="fill:var(--bg);stroke:var(--accent);stroke-width:2;"></circle>`).join('');

  // top artists
  const acnt = {}; songs.forEach((s) => (acnt[s.artist] = (acnt[s.artist] || 0) + 1));
  const tops = Object.keys(acnt).map((n) => ({ name: n, count: acnt[n] })).sort((a, b) => b.count - a.count).slice(0, 5);
  const maxA = tops.length ? tops[0].count : 1;
  const topsHTML = tops.map((t) => `<div style="display:flex;align-items:center;gap:12px;margin-bottom:11px;"><span style="width:104px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0;">${esc(t.name)}</span><div style="flex:1;height:9px;border-radius:6px;background:rgba(255,255,255,.05);overflow:hidden;"><div style="${css({ height: '100%', width: (t.count / maxA * 100) + '%', borderRadius: '6px', background: 'linear-gradient(90deg,var(--accent3),var(--accent))', boxShadow: '0 0 12px var(--glow)' })}"></div></div><span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--accent);width:18px;text-align:right;">${t.count}</span></div>`).join('');

  // gauge
  const Cg = 2 * Math.PI * 56, favPct = Math.round(favCount / Math.max(total, 1) * 100);
  const gaugeDash = (favCount / Math.max(total, 1) * Cg).toFixed(2) + ' ' + Cg.toFixed(2);
  const totalSings = songs.reduce((a, s) => a + (Array.isArray(s.sings) ? s.sings.length : s.plays), 0);
  const statCards = [
    { en: 'TRACKS', label: '登録楽曲', value: String(total) },
    { en: 'FAVORITES', label: 'お気に入り', value: String(favCount) },
    { en: 'PLAYLISTS', label: 'マイリスト', value: String(st.lists.length) },
    { en: 'TOTAL SINGS', label: '総歌唱回数', value: String(totalSings) },
  ].map((k) => `<div style="border-radius:15px;padding:18px 20px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(16px);position:relative;overflow:hidden;"><div style="position:absolute;right:-14px;top:-14px;width:70px;height:70px;border-radius:50%;background:radial-gradient(circle,var(--glow),transparent 70%);"></div><div style="font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:1.5px;color:rgba(255,255,255,.4);">${k.en}</div><div style="font-family:'Orbitron',sans-serif;font-weight:900;font-size:34px;color:#fff;margin:8px 0 3px;line-height:1;">${k.value}</div><div style="font-size:12px;color:var(--accent);">${k.label}</div></div>`).join('');

  // sing-history charts
  const acRgb = { holo: '34,211,238', neon: '255,45,149', acid: '157,255,60' }[st.theme] || '34,211,238';
  const heatCounts = {};
  songs.forEach((s) => (s.sings || []).forEach((sing) => { const d = sing.date || sing; heatCounts[d] = (heatCounts[d] || 0) + 1; }));
  const heatVals = Object.values(heatCounts);
  const maxHeat = Math.max(1, ...(heatVals.length ? heatVals : [1]));
  const heatCells = [];
  for (let i = 69; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 86400000);
    const ds = dt.toISOString().slice(0, 10);
    const cnt = heatCounts[ds] || 0;
    const pct = cnt / maxHeat;
    const mm = String(dt.getMonth() + 1).padStart(2, '0'), dd = String(dt.getDate()).padStart(2, '0');
    heatCells.push(`<div title="${mm}/${dd}  ${cnt}回" style="${css({ height: '14px', borderRadius: '3px', cursor: 'default', background: cnt > 0 ? `rgba(${acRgb},${(0.15 + pct * 0.82).toFixed(2)})` : 'rgba(255,255,255,.06)', boxShadow: cnt > 0 ? `0 0 ${Math.round(pct * 8)}px rgba(${acRgb},.4)` : 'none' })}"></div>`);
  }
  const heatLegend = [0, .25, .5, .75, 1].map((p) => `<div style="${css({ width: '18px', height: '14px', borderRadius: '3px', display: 'inline-block', background: p > 0 ? `rgba(${acRgb},${(0.15 + p * 0.82).toFixed(2)})` : 'rgba(255,255,255,.06)' })}"></div>`).join('');

  const singCount = (s) => Array.isArray(s.sings) ? s.sings.length : s.plays;
  const topSongsMax = Math.max(1, ...songs.map(singCount));
  const topSongs = songs.slice().sort((a, b) => singCount(b) - singCount(a)).slice(0, 5).map((s) => {
    const cnt = singCount(s); const gc = GENRES[s.genre] || GENRES.artist;
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;"><span style="${css({ width: '8px', height: '8px', borderRadius: '2px', background: gc.color, boxShadow: `0 0 6px ${gc.color}`, flexShrink: 0 })}"></span><div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:5px;">${esc(s.title)}</div><div style="height:7px;border-radius:4px;background:rgba(255,255,255,.07);overflow:hidden;"><div style="${css({ height: '100%', width: (cnt / topSongsMax * 100) + '%', borderRadius: '4px', background: `linear-gradient(90deg,${gc.color}77,${gc.color})`, boxShadow: `0 0 8px ${gc.color}44` })}"></div></div></div><span style="font-family:'Orbitron',sans-serif;font-weight:700;font-size:13px;color:var(--accent);flex-shrink:0;min-width:22px;text-align:right;">${cnt}</span></div>`;
  }).join('');

  const dailyCounts = {};
  songs.forEach((s) => (s.sings || []).forEach((sing) => { const d = sing.date || sing; dailyCounts[d] = (dailyCounts[d] || 0) + 1; }));
  const last30 = []; for (let i = 29; i >= 0; i--) { const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10); last30.push(dailyCounts[d] || 0); }
  const maxDay = Math.max(1, ...last30);
  const DW = 520, DH = 90, Dp = 8;
  const dpts = last30.map((v, i) => [Dp + i * ((DW - 2 * Dp) / 29), DH - Dp - (v / maxDay) * (DH - 2 * Dp)]);
  const dailyLinePath = 'M' + dpts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
  const dailyAreaPath = dailyLinePath + ` L${(DW - Dp).toFixed(1)} ${DH - Dp} L${Dp} ${DH - Dp} Z`;

  return `
  <div style="animation:vvFade 200ms ease;">
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:18px;">${statCards}</div>
    <div style="display:grid;grid-template-columns:1.1fr 1.4fr;gap:16px;margin-bottom:16px;">
      <div style="border-radius:16px;padding:22px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(16px);">
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:2px;color:rgba(255,255,255,.45);margin-bottom:6px;">GENRE BREAKDOWN</div>
        <div style="font-size:15px;font-weight:700;margin-bottom:18px;">ジャンル比率</div>
        <div style="display:flex;align-items:center;gap:26px;">
          <div style="position:relative;width:180px;height:180px;flex-shrink:0;">
            <svg viewBox="0 0 180 180" style="width:180px;height:180px;transform:rotate(-90deg);"><circle cx="90" cy="90" r="70" style="fill:none;stroke:rgba(255,255,255,.06);stroke-width:18;"></circle>${donutCircles}</svg>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;"><div style="font-family:'Orbitron',sans-serif;font-weight:900;font-size:30px;">${total}</div><div style="font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:1.5px;color:rgba(255,255,255,.4);margin-top:3px;">TRACKS</div></div>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;gap:12px;">${donutLegend}</div>
        </div>
      </div>
      <div style="border-radius:16px;padding:22px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(16px);">
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:2px;color:rgba(255,255,255,.45);margin-bottom:6px;">MONTHLY REGISTRATIONS</div>
        <div style="font-size:15px;font-weight:700;margin-bottom:20px;">月別 登録数</div>
        <div style="display:flex;align-items:flex-end;gap:12px;height:172px;padding-bottom:22px;position:relative;">${bars}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1.4fr 1.1fr;gap:16px;">
      <div style="border-radius:16px;padding:22px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(16px);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;"><div><div style="font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:2px;color:rgba(255,255,255,.45);margin-bottom:6px;">CUMULATIVE GROWTH</div><div style="font-size:15px;font-weight:700;">アーカイブ累計</div></div><div style="text-align:right;"><div style="font-family:'Orbitron',sans-serif;font-weight:900;font-size:26px;color:var(--accent);line-height:1;">${total}</div><div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:rgba(255,255,255,.4);">TOTAL</div></div></div>
        <svg viewBox="0 0 520 160" preserveAspectRatio="none" style="width:100%;height:160px;"><line x1="0" y1="40" x2="520" y2="40" style="stroke:rgba(255,255,255,.05);stroke-width:1;"></line><line x1="0" y1="80" x2="520" y2="80" style="stroke:rgba(255,255,255,.05);stroke-width:1;"></line><line x1="0" y1="120" x2="520" y2="120" style="stroke:rgba(255,255,255,.05);stroke-width:1;"></line><path d="${areaPath}" style="fill:var(--accent);opacity:.13;"></path><path d="${linePath}" style="fill:none;stroke:var(--accent);stroke-width:2.5;stroke-linejoin:round;filter:drop-shadow(0 0 6px var(--glow));"></path>${areaDots}</svg>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="border-radius:16px;padding:20px 22px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(16px);"><div style="font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:2px;color:rgba(255,255,255,.45);margin-bottom:16px;">TOP ARTISTS</div>${topsHTML}</div>
        <div style="border-radius:16px;padding:20px 22px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(16px);display:flex;align-items:center;gap:20px;">
          <div style="position:relative;width:118px;height:118px;flex-shrink:0;"><svg viewBox="0 0 140 140" style="width:118px;height:118px;transform:rotate(-90deg);"><circle cx="70" cy="70" r="56" style="fill:none;stroke:rgba(255,255,255,.06);stroke-width:13;"></circle><circle cx="70" cy="70" r="56" stroke-dasharray="${gaugeDash}" style="fill:none;stroke:var(--accent);stroke-width:13;stroke-linecap:round;filter:drop-shadow(0 0 7px var(--glow));"></circle></svg><div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;"><div style="font-family:'Orbitron',sans-serif;font-weight:900;font-size:24px;">${favPct}%</div></div></div>
          <div><div style="font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:1.5px;color:rgba(255,255,255,.45);margin-bottom:6px;">FAV RATIO</div><div style="font-size:14px;font-weight:700;">お気に入り率</div><div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:4px;">${favCount} / ${total} 曲</div></div>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1.55fr 1fr;gap:16px;margin-top:16px;">
      <div style="border-radius:16px;padding:22px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(16px);">
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:2px;color:rgba(255,255,255,.45);margin-bottom:6px;">SING CALENDAR</div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:16px;"><div style="font-size:15px;font-weight:700;">歌唱カレンダー</div><div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:rgba(255,255,255,.4);">直近10週 · 70日</div></div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">${heatCells.join('')}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:12px;justify-content:flex-end;"><span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:rgba(255,255,255,.3);">少</span>${heatLegend}<span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:rgba(255,255,255,.3);">多</span></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="border-radius:16px;padding:20px 22px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(16px);"><div style="font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:2px;color:rgba(255,255,255,.45);margin-bottom:16px;">TOP SONGS</div>${topSongs}</div>
        <div style="border-radius:16px;padding:20px 22px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(16px);"><div style="font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:2px;color:rgba(255,255,255,.45);margin-bottom:6px;">DAILY SINGS</div><div style="font-size:14px;font-weight:700;margin-bottom:14px;">日別歌唱推移<span style="font-size:10px;font-weight:400;color:rgba(255,255,255,.4);margin-left:8px;">直近30日</span></div><svg viewBox="0 0 520 90" preserveAspectRatio="none" style="width:100%;height:80px;"><line x1="0" y1="30" x2="520" y2="30" style="stroke:rgba(255,255,255,.05);stroke-width:1;"></line><line x1="0" y1="60" x2="520" y2="60" style="stroke:rgba(255,255,255,.05);stroke-width:1;"></line><path d="${dailyAreaPath}" style="fill:var(--accent);opacity:.14;"></path><path d="${dailyLinePath}" style="fill:none;stroke:var(--accent);stroke-width:2;stroke-linejoin:round;filter:drop-shadow(0 0 5px var(--glow));"></path></svg></div>
      </div>
    </div>
  </div>`;
}

// ── modals + toast ──────────────────────────────────────────────────────────
function modalsHTML() {
  let html = '';
  const st = state;
  if (st.addToListSong) {
    const songObj = st.songs.find((s) => s.id === st.addToListSong);
    const opts = st.lists.map((l) => {
      const already = l.songIds.includes(st.addToListSong);
      const cv = getCover(l)[0];
      const style = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 14px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, textAlign: 'left', marginBottom: '8px', border: already ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,.1)', background: already ? 'rgba(34,211,238,.07)' : 'rgba(255,255,255,.03)', color: already ? 'var(--accent)' : '#fff' });
      return `<button data-act="toggleInList" data-list="${l.id}" style="${style}"><div style="display:flex;align-items:center;gap:10px;"><div style="${css({ width: '12px', height: '12px', borderRadius: '3px', background: cv, boxShadow: `0 0 7px ${cv}` })}"></div><span style="font-size:13px;font-weight:700;">${esc(l.name)}</span></div><div style="display:flex;align-items:center;gap:8px;"><span style="font-family:'Share Tech Mono',monospace;font-size:11px;opacity:.5;">${l.songIds.length}曲</span><span style="${css({ color: already ? 'var(--accent)' : 'rgba(255,255,255,.2)', fontSize: '15px', fontWeight: 700 })}">✓</span></div></button>`;
    }).join('');
    html += `
      <div data-act="closeAtl" style="position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);">
        <div data-act="stop" style="width:400px;border-radius:18px;background:rgba(12,14,28,.95);border:1px solid rgba(255,255,255,.12);padding:26px;animation:vvPop 200ms ease;box-shadow:0 0 60px rgba(0,0,0,.6);">
          <div style="margin-bottom:18px;"><div style="font-size:17px;font-weight:900;">リストに追加</div><div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">「${esc(songObj ? songObj.title : '')}」</div></div>
          ${opts}
          <button data-act="openCreateList" style="width:100%;margin-top:10px;padding:11px;border-radius:10px;background:none;border:1px dashed rgba(255,255,255,.2);color:rgba(255,255,255,.55);font-size:13px;cursor:pointer;transition:all .15s;">＋ 新しいリストを作成</button>
          <button data-act="closeAtl" style="width:100%;margin-top:8px;padding:10px;border-radius:10px;background:none;border:none;color:rgba(255,255,255,.4);font-size:13px;cursor:pointer;">閉じる</button>
        </div>
      </div>`;
  }
  if (st.creatingList) {
    const btnStyle = css({ flex: 1, padding: '13px', borderRadius: '11px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: '#06070f', background: st.newListName.trim() ? 'linear-gradient(135deg,var(--accent),var(--accent3))' : 'rgba(255,255,255,.2)', boxShadow: st.newListName.trim() ? '0 0 22px var(--glow)' : 'none', opacity: st.newListName.trim() ? 1 : .5 });
    html += `
      <div data-act="cancelCreateList" style="position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);">
        <div data-act="stop" style="width:400px;border-radius:18px;background:rgba(12,14,28,.95);border:1px solid rgba(255,255,255,.12);padding:28px;animation:vvPop 200ms ease;box-shadow:0 0 60px rgba(0,0,0,.6);">
          <div style="font-size:18px;font-weight:900;margin-bottom:6px;">新しいマイリスト</div>
          <div style="font-size:13px;color:rgba(255,255,255,.5);margin-bottom:20px;">リスト名を入力してください</div>
          <div style="padding:3px 16px;border-radius:11px;background:rgba(0,0,0,.4);border:1px solid var(--accent);box-shadow:0 0 20px var(--glow);"><input data-field="newListName" data-act="newListName" value="${esc(st.newListName)}" placeholder="例：深夜のセトリ" style="width:100%;padding:12px 0;background:none;border:none;color:#fff;font-size:15px;font-weight:700;"/></div>
          <div style="display:flex;gap:10px;margin-top:18px;"><button data-act="cancelCreateList" style="flex:1;padding:13px;border-radius:11px;background:none;border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);font-size:13px;font-weight:700;cursor:pointer;">キャンセル</button><button data-act="submitNewList" style="${btnStyle}">作成する</button></div>
        </div>
      </div>`;
  }
  if (st.unsingPending) {
    const song = st.songs.find((s) => s.id === st.unsingPending);
    const sings = song?.sings || [];
    const rows = sings.slice().reverse().map((sing) => {
      const dateF = sing.date.replace(/-/g, '.');
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);margin-bottom:8px;">
                <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:rgba(255,255,255,.7);">${esc(dateF)}</span>
                <button data-act="undoSing" data-id="${st.unsingPending}" data-singid="${sing.id}" style="background:rgba(255,100,100,.15);border:1px solid rgba(255,150,150,.3);color:#ff6b6b;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-weight:700;">取り消す</button>
              </div>`;
    }).join('');
    html += `
      <div data-act="closeUnsing" style="position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);">
        <div data-act="stop" style="width:420px;border-radius:18px;background:rgba(12,14,28,.95);border:1px solid rgba(255,255,255,.12);padding:28px;animation:vvPop 200ms ease;box-shadow:0 0 60px rgba(0,0,0,.6);">
          <div style="font-size:18px;font-weight:900;margin-bottom:4px;">歌唱履歴</div>
          <div style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:18px;">「${esc(song ? song.title : '')}」の歌唱記録</div>
          ${sings.length > 0 ? `<div style="max-height:280px;overflow-y:auto;padding-right:8px;">${rows}</div>` : `<div style="padding:40px;text-align:center;color:rgba(255,255,255,.35);font-size:13px;">記録がありません</div>`}
          <button data-act="closeUnsing" style="width:100%;margin-top:16px;padding:11px;border-radius:11px;border:none;cursor:pointer;font-weight:700;font-size:13px;color:#06070f;background:linear-gradient(135deg,var(--accent),var(--accent3));box-shadow:0 0 22px var(--glow);">閉じる</button>
        </div>
      </div>`;
  }
  return html;
}

function toastHTML() {
  if (!state.toast) return '';
  const tc = { success: 'linear-gradient(135deg,rgba(34,211,238,.22),rgba(167,139,250,.18))', info: 'rgba(255,255,255,.1)', error: 'rgba(255,80,80,.18)' };
  const style = css({ position: 'fixed', bottom: '24px', right: '24px', zIndex: 300, padding: '13px 20px', borderRadius: '12px', backdropFilter: 'blur(16px)', background: tc[state.toast.type] || tc.success, border: '1px solid rgba(255,255,255,.15)', boxShadow: '0 8px 32px rgba(0,0,0,.4)', fontSize: '13px', fontWeight: 700, color: '#fff', animation: 'vvToast 2.6s ease forwards', maxWidth: '340px', pointerEvents: 'none' });
  return `<div style="${style}">${esc(state.toast.msg)}</div>`;
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT DELEGATION
// ════════════════════════════════════════════════════════════════════════════
function findCandidate(key) {
  return state.regCandidates.find((c) => (c.videoId || c.title) === key);
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act;
  const id = t.dataset.id ? +t.dataset.id : null;

  switch (act) {
    case 'go': setState({ screen: t.dataset.screen, activeList: null }); break;
    case 'theme': setTheme(t.dataset.theme); break;
    case 'filter': setState({ filter: t.dataset.filter }); break;
    case 'view': setState({ view: t.dataset.view }); break;
    case 'sort': setState((s) => ({ sortKey: t.dataset.sort, sortDir: s.sortKey === t.dataset.sort ? (s.sortDir === 'asc' ? 'desc' : 'asc') : 'desc' })); break;
    case 'play': incPlays(id); break;
    case 'showUnsing': showUnsingModal(id); break;
    case 'undoSing': { undoSing(+t.dataset.id, +t.dataset.singid); break; }
    case 'closeUnsing': setState({ unsingPending: null }); break;
    case 'fav': toggleFav(id); break;
    case 'open': { const s = state.songs.find((x) => x.id === id); if (s) window.open(decorate(s).url, '_blank'); break; }
    case 'addToList': setState({ addToListSong: id }); break;
    case 'startDel': e.stopPropagation(); startDel(id); break;
    case 'confirmDel': e.stopPropagation(); confirmDel(id); break;
    case 'cancelDel': e.stopPropagation(); setState({ deletePending: null }); break;
    case 'clearPending': if (state.deletePending) setState({ deletePending: null }); break;
    // register
    case 'startSearch': startSearch(); break;
    case 'backStep1': setState({ regStep: 1 }); break;
    case 'backStep2': setState({ regStep: 2 }); break;
    case 'selectCand': { const c = findCandidate(t.dataset.id); if (c) setState({ regSelected: c, regGenre: c.genre || 'artist', regStep: 3, regTitle: c.title || '', regArtists: c.artist ? [c.artist] : [], regVocals: [], regTags: [], regWork: '', regArtistQ: '' }); break; }
    case 'regGenre': setState({ regGenre: t.dataset.genre }); break;
    case 'rmArtist': { const idx = +t.dataset.idx; setState((s) => ({ regArtists: s.regArtists.filter((_, j) => j !== idx) })); break; }
    case 'rmVocal': { const idx = +t.dataset.idx; setState((s) => ({ regVocals: s.regVocals.filter((_, j) => j !== idx) })); break; }
    case 'rmTag': { const idx = +t.dataset.idx; setState((s) => ({ regTags: s.regTags.filter((_, j) => j !== idx) })); break; }
    case 'quickAddArtist': { const val = t.dataset.val; if (val && !state.regArtists.includes(val)) setState((s) => ({ regArtists: [...s.regArtists, val], regArtistQ: '' })); break; }
    case 'quickAddVocal': { const val = t.dataset.val; if (val && !state.regVocals.includes(val)) setState((s) => ({ regVocals: [...s.regVocals, val] })); break; }
    case 'quickAddTag': { const val = t.dataset.val; if (val && !state.regTags.includes(val)) setState((s) => ({ regTags: [...s.regTags, val] })); break; }
    case 'quickSetWork': setState({ regWork: t.dataset.val }); break;
    case 'saveSong': saveSong(); break;
    case 'resetReg': setState({ regStep: 1, regQuery: '', regSelected: null, regTitle: '', regArtists: [], regVocals: [], regTags: [], regWork: '', regArtistQ: '', regCandidates: [], regSource: null }); break;
    // lists
    case 'openList': setState({ activeList: id }); break;
    case 'closeList': setState({ activeList: null }); break;
    case 'deleteList': e.stopPropagation(); deleteList(id); break;
    case 'removeFromList': removeFromList(id, +t.dataset.list); break;
    case 'openCreateList': setState({ creatingList: true, addToListSong: null }); break;
    case 'cancelCreateList': setState({ creatingList: false, newListName: '' }); break;
    case 'submitNewList': submitNewList(); break;
    case 'toggleInList': toggleSongInList(state.addToListSong, +t.dataset.list); break;
    case 'closeAtl': setState({ addToListSong: null }); break;
    case 'stop': e.stopPropagation(); break;
    default: break;
  }
});

document.addEventListener('input', (e) => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  switch (t.dataset.act) {
    // library search needs real-time filtering → full re-render
    case 'query': setState({ query: e.target.value }); break;
    // these fields don't change anything visible until submitted → update state silently
    case 'regQuery': state.regQuery = e.target.value; break;
    case 'regTitle': state.regTitle = e.target.value; break;
    case 'addArtist': setState({ regArtistQ: e.target.value }); break;
    case 'regWork': setState({ regWork: e.target.value }); break;
    case 'newListName': state.newListName = e.target.value; break;
    default: break;
  }
});

document.addEventListener('keydown', (e) => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act;
  if (act === 'regQuery' && e.key === 'Enter') { startSearch(); }
  else if (act === 'newListName' && e.key === 'Enter') { submitNewList(); }
  else if (act === 'addArtist' && e.key === 'Enter' && e.target.value.trim()) {
    const v = e.target.value.trim(); e.target.value = '';
    setState((s) => ({ regArtists: [...s.regArtists, v], regArtistQ: '' }));
  } else if (act === 'addVocal' && e.key === 'Enter' && e.target.value.trim()) {
    const v = e.target.value.trim(); e.target.value = '';
    setState((s) => ({ regVocals: [...s.regVocals, v] }));
  } else if (act === 'addTag' && e.key === 'Enter' && e.target.value.trim()) {
    const v = e.target.value.trim(); e.target.value = '';
    setState((s) => ({ regTags: [...s.regTags, v] }));
  }
});

// ── boot ──────────────────────────────────────────────────────────────────────
async function boot() {
  try {
    const data = await api('/state');
    Object.assign(state, { songs: data.songs, lists: data.lists, favs: data.favs, theme: data.settings?.theme || 'holo' });
  } catch (e) {
    showToast('サーバーに接続できませんでした', 'error');
  }
  render();
}
boot();
