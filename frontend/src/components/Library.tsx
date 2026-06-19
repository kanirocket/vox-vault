import { useMemo } from 'react';
import { useStore } from '../store';
import { useIsMobile } from '../hooks';
import { GENRE_KEYS, GENRES } from '../constants';
import { decorate } from '../utils';
import type { Genre, SortKey } from '../types';
import { PlusIcon, SearchIcon, StarIcon } from '../icons';
import { LibraryRow } from './LibraryRow';
import { SongCard } from './SongCard';

const CHIP_DEFS: { key: 'all' | Genre; label: string; color: string }[] = [
  { key: 'all', label: 'すべて', color: '#fff' },
  ...GENRE_KEYS.map((k) => ({ key: k, label: GENRES[k].label, color: GENRES[k].color })),
];

export function Library() {
  const { songs, favs, filter, favOnly, sortKey, sortDir, query, view, artistFilter,
    setFilter, toggleFavOnly, setView, setQuery, toggleSort, clearArtistFilter, setScreen, resetReg } = useStore();
  const isMobile = useIsMobile();

  const lib = useMemo(() => {
    let list = songs.slice();
    if (filter !== 'all') list = list.filter((s) => s.genre === filter);
    if (favOnly) list = list.filter((s) => favs[s.id]);
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
  }, [songs, favs, filter, favOnly, artistFilter, query, sortKey, sortDir]);

  const showGenre = filter === 'all';
  const isListView = view === 'list';
  const gc = showGenre ? '96px 1fr 130px 104px 84px 76px 76px 106px' : '96px 1fr 104px 84px 76px 76px 106px';
  const ar = (k: SortKey) => (sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '');

  const vbClass = (on: boolean) =>
    'px-[9px] py-[7px] rounded-[7px] border-none cursor-pointer transition-[background] duration-150 grid place-items-center ' +
    (on ? 'bg-white/[.14] text-white' : 'bg-transparent text-white/40');
  const sortBtn = "bg-transparent border-none text-inherit font-[inherit] cursor-pointer text-left tracking-[1.5px]";

  return (
    <div className="animate-[vvFade_200ms_ease]">
      {/* toolbar */}
      <div className="flex flex-col gap-2.5 mb-[18px]">
        {/* genre chips + favorites filter */}
        <div className={`flex items-center ${isMobile ? 'gap-1.5' : 'gap-2.5'}`}>
          <div className={`flex flex-wrap flex-1 min-w-0 ${isMobile ? 'gap-[3px]' : 'gap-2'}`}>
            {CHIP_DEFS.map((c) => {
              const on = filter === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setFilter(c.key)}
                  className={`rounded-[9px] cursor-pointer font-bold transition-all whitespace-nowrap shrink-0 border ${isMobile ? 'px-1.5 py-1.5 text-[10.5px]' : 'px-[15px] py-2 text-[12.5px]'}`}
                  style={{
                    borderColor: on ? c.color : 'rgba(255,255,255,.1)',
                    background: on ? (c.key === 'all' ? 'rgba(255,255,255,.12)' : c.color + '1f') : 'rgba(255,255,255,.03)',
                    color: on ? (c.key === 'all' ? '#fff' : c.color) : 'rgba(255,255,255,.55)',
                    boxShadow: on && c.key !== 'all' ? '0 0 16px ' + c.color + '44' : 'none',
                  }}
                >{c.label}</button>
              );
            })}
          </div>
          <button
            onClick={toggleFavOnly}
            title={favOnly ? 'お気に入りフィルター解除' : 'お気に入りのみ表示'}
            className={`shrink-0 grid place-items-center rounded-[9px] cursor-pointer transition-all border ${isMobile ? 'p-[7px]' : 'p-2'} ${favOnly ? 'border-[#ffd24a] bg-[rgba(255,210,74,.14)] shadow-[0_0_16px_rgba(255,210,74,.4)]' : 'border-white/10 bg-white/[.03]'}`}
          ><StarIcon size={isMobile ? 17 : 18} fill={favOnly ? '#ffd24a' : 'none'} stroke={favOnly ? '#ffd24a' : 'rgba(255,255,255,.5)'} style={{ filter: favOnly ? 'drop-shadow(0 0 4px #ffd24a)' : 'none' }} /></button>
        </div>
        {/* search row */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-[9px] px-[14px] py-[9px] rounded-[10px] bg-white/[.04] border border-white/[.08] flex-1">
            <SearchIcon size={14} stroke="rgba(255,255,255,.45)" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="タイトル・アーティスト検索" className="flex-1 w-full bg-transparent border-none text-white text-[13px]" />
          </div>
          {!isMobile && <div className="font-['Share_Tech_Mono',monospace] text-xs text-white/45 whitespace-nowrap">{lib.length} 件</div>}
          <button onClick={() => { resetReg(); setScreen('register'); }} title="楽曲を追加" className={`flex items-center gap-1.5 rounded-[10px] cursor-pointer text-[13px] font-bold whitespace-nowrap text-accent bg-white/[.06] border border-[color:var(--accent)] shadow-[0_0_16px_var(--glow)] ${isMobile ? 'px-3 py-[9px]' : 'px-[15px] py-[9px]'}`}><PlusIcon size={15} />{!isMobile && '追加'}</button>
          <div className="flex gap-0.5 p-[3px] rounded-[9px] bg-white/[.04] border border-white/[.08]">
            <button onClick={() => setView('list')} className={vbClass(isListView)} title="リスト"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg></button>
            <button onClick={() => setView('grid')} className={vbClass(!isListView)} title="グリッド"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg></button>
          </div>
        </div>
      </div>

      {/* artist filter banner */}
      {artistFilter && (
        <div className="flex items-center gap-2.5 px-4 py-[9px] rounded-[10px] bg-white/5 border border-white/15 mb-[14px] text-[13px]">
          <span className="text-white/45 font-['Share_Tech_Mono',monospace] text-[10px] tracking-[1px]">ARTIST</span>
          <span className="font-bold">{artistFilter}</span>
          <span className="text-white/35 text-xs">{lib.length} 件</span>
          <button onClick={clearArtistFilter} title="フィルターを解除" className="ml-auto bg-transparent border-none cursor-pointer text-white/45 text-base px-0.5 leading-none">✕</button>
        </div>
      )}

      {/* listing */}
      {isListView ? (
        <div className="rounded-2xl bg-white/[.025] backdrop-blur-lg border border-white/[.07] overflow-hidden">
          {!isMobile && (
            <div className="grid items-center gap-4 px-5 py-[13px] border-b border-white/[.07] font-['Share_Tech_Mono',monospace] text-[10px] tracking-[1.5px] text-white/40" style={{ gridTemplateColumns: gc }}>
              <span />
              <button onClick={() => toggleSort('title')} className={sortBtn}>TITLE {ar('title')}</button>
              {showGenre && <span>GENRE</span>}
              <button onClick={() => toggleSort('date')} className={sortBtn}>投稿日 {ar('date')}</button>
              <button onClick={() => toggleSort('views')} className={sortBtn}>視聴 {ar('views')}</button>
              <button onClick={() => toggleSort('plays')} className={sortBtn}>歌唱 {ar('plays')}</button>
              <span>歌える度</span>
              <span />
            </div>
          )}
          {lib.map((s) => <LibraryRow key={s.id} s={s} showGenre={showGenre} gridTemplateColumns={gc} />)}
          {lib.length === 0 && <div className="p-10 text-center text-white/35 text-sm">見つかりません</div>}
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: isMobile ? 'repeat(auto-fill,minmax(160px,1fr))' : 'repeat(auto-fill,minmax(226px,1fr))', gap: isMobile ? 12 : 16 }}>
          {lib.map((s) => <SongCard key={s.id} s={s} showGenre={showGenre} />)}
        </div>
      )}
    </div>
  );
}
