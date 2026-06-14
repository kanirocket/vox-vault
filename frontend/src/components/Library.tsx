import { useMemo } from 'react';
import { useStore } from '../store';
import { GENRE_KEYS, GENRES } from '../constants';
import { decorate } from '../utils';
import type { Genre, SortKey } from '../types';
import { SearchIcon } from '../icons';
import { LibraryRow } from './LibraryRow';
import { SongCard } from './SongCard';

const CHIP_DEFS: { key: 'all' | Genre; label: string; color: string }[] = [
  { key: 'all', label: 'すべて', color: '#fff' },
  ...GENRE_KEYS.map((k) => ({ key: k, label: GENRES[k].label, color: GENRES[k].color })),
];

export function Library() {
  const { songs, favs, filter, sortKey, sortDir, query, view, artistFilter,
    setFilter, setView, setQuery, toggleSort, clearArtistFilter } = useStore();

  const lib = useMemo(() => {
    let list = songs.slice();
    if (filter !== 'all') list = list.filter((s) => s.genre === filter);
    if (artistFilter) list = list.filter((s) => (Array.isArray(s.artists) && s.artists.length ? s.artists : [s.artist]).includes(artistFilter));
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      if (sortKey === 'title') return a.title.localeCompare(b.title, 'ja') * dir;
      if (sortKey === 'date') return (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) * dir;
      if (sortKey === 'views') return (a.views - b.views) * dir;
      if (sortKey === 'plays') return (a.plays - b.plays) * dir;
      return (a.id - b.id) * dir;
    });
    return list.map((s) => decorate(s, favs));
  }, [songs, favs, filter, artistFilter, query, sortKey, sortDir]);

  const showGenre = filter === 'all';
  const isListView = view === 'list';
  const gc = showGenre ? '96px 1fr 130px 104px 84px 76px 76px 106px' : '96px 1fr 104px 84px 76px 76px 106px';
  const ar = (k: SortKey) => (sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '');

  const vb = (on: boolean) => ({ padding: '7px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', transition: 'background .15s', background: on ? 'rgba(255,255,255,.14)' : 'transparent', color: on ? '#fff' : 'rgba(255,255,255,.4)', display: 'grid', placeItems: 'center' } as const);

  return (
    <div style={{ animation: 'vvFade 200ms ease' }}>
      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CHIP_DEFS.map((c) => {
            const on = filter === c.key;
            return (
              <button key={c.key} onClick={() => setFilter(c.key)} style={{ padding: '8px 15px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, transition: 'all .15s', whiteSpace: 'nowrap', border: on ? '1px solid ' + c.color : '1px solid rgba(255,255,255,.1)', background: on ? (c.key === 'all' ? 'rgba(255,255,255,.12)' : c.color + '1f') : 'rgba(255,255,255,.03)', color: on ? (c.key === 'all' ? '#fff' : c.color) : 'rgba(255,255,255,.55)', boxShadow: on && c.key !== 'all' ? '0 0 16px ' + c.color + '44' : 'none' }}>{c.label}</button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', width: 220 }}>
            <SearchIcon size={14} stroke="rgba(255,255,255,.45)" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="タイトル・アーティスト検索" style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: 13, width: '100%' }} />
          </div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 12, color: 'rgba(255,255,255,.45)', whiteSpace: 'nowrap' }}>{lib.length} 件</div>
          <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 9, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
            <button onClick={() => setView('list')} style={vb(isListView)} title="リスト"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg></button>
            <button onClick={() => setView('grid')} style={vb(!isListView)} title="グリッド"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg></button>
          </div>
        </div>
      </div>

      {/* artist filter banner */}
      {artistFilter && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderRadius: 10, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.15)', marginBottom: 14, fontSize: 13 }}>
          <span style={{ color: 'rgba(255,255,255,.45)', fontFamily: "'Share Tech Mono',monospace", fontSize: 10, letterSpacing: 1 }}>ARTIST</span>
          <span style={{ fontWeight: 700 }}>{artistFilter}</span>
          <span style={{ color: 'rgba(255,255,255,.35)', fontSize: 12 }}>{lib.length} 件</span>
          <button onClick={clearArtistFilter} title="フィルターを解除" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.45)', fontSize: 16, padding: '0 2px', lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* listing */}
      {isListView ? (
        <div style={{ borderRadius: 16, background: 'rgba(255,255,255,.025)', backdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,.07)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: gc, alignItems: 'center', gap: 16, padding: '13px 20px', borderBottom: '1px solid rgba(255,255,255,.07)', fontFamily: "'Share Tech Mono',monospace", fontSize: 10, letterSpacing: 1.5, color: 'rgba(255,255,255,.4)' }}>
            <span />
            <button onClick={() => toggleSort('title')} style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', textAlign: 'left', letterSpacing: 1.5 }}>TITLE {ar('title')}</button>
            {showGenre && <span>GENRE</span>}
            <button onClick={() => toggleSort('date')} style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', textAlign: 'left', letterSpacing: 1.5 }}>投稿日 {ar('date')}</button>
            <button onClick={() => toggleSort('views')} style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', textAlign: 'left', letterSpacing: 1.5 }}>視聴 {ar('views')}</button>
            <button onClick={() => toggleSort('plays')} style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', textAlign: 'left', letterSpacing: 1.5 }}>歌唱 {ar('plays')}</button>
            <span>歌える度</span>
            <span />
          </div>
          {lib.map((s) => <LibraryRow key={s.id} s={s} showGenre={showGenre} gridTemplateColumns={gc} />)}
          {lib.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,.35)', fontSize: 14 }}>見つかりません</div>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(226px,1fr))', gap: 16 }}>
          {lib.map((s) => <SongCard key={s.id} s={s} showGenre={showGenre} />)}
        </div>
      )}
    </div>
  );
}
