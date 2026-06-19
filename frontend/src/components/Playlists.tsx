import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { GENRES } from '../constants';
import { decorate, thumbBg, badgeStyle, dotStyle } from '../utils';
import type { Playlist } from '../types';
import { PlayIcon, PlusIcon, SearchIcon, TrashIcon } from '../icons';

function cover(l: Playlist, songIdToGenreColor: (id: number) => string | null): string[] {
  const cs = l.songIds.slice(0, 4).map(songIdToGenreColor).filter(Boolean) as string[];
  while (cs.length < 4) cs.push(l.colors[cs.length] || '#1a1a2e');
  return cs;
}

export function Playlists() {
  const { songs, lists, favs, activeList, openList, closeList, deleteList, openCreateList, removeFromList, incPlays, toggleSongInList, registerForList } = useStore();
  const [addQuery, setAddQuery] = useState('');
  const colorOf = (id: number) => {
    const s = songs.find((x) => x.id === id);
    return s ? (GENRES[s.genre] || GENRES.artist).color : null;
  };

  const activeListObj = lists.find((l) => l.id === activeList) || null;

  // search existing library songs not yet in the active list
  const q = addQuery.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!activeListObj || !q) return [];
    return songs
      .filter((s) => !activeListObj.songIds.includes(s.id))
      .filter((s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q))
      .slice(0, 8)
      .map((s) => decorate(s, favs));
  }, [songs, activeListObj, q, favs]);

  if (activeListObj) {
    const detail = activeListObj.songIds
      .map((id) => songs.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => decorate(s, favs));
    return (
      <div className="animate-[vvFade_200ms_ease]">
        <div className="flex items-center gap-4 mb-[22px]">
          <button onClick={closeList} data-hover="dashbtn" className="flex items-center gap-2 bg-transparent border border-white/15 text-white/70 rounded-[9px] px-[14px] py-2 cursor-pointer text-[13px]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>リスト一覧
          </button>
          <div>
            <div className="text-xl font-black">{activeListObj.name}</div>
            <div className="font-['Share_Tech_Mono',monospace] text-[11px] text-accent tracking-[1px]">{activeListObj.en} · {activeListObj.songIds.length}曲</div>
          </div>
        </div>

        {/* search & add panel */}
        <div className="mb-[22px]">
          <div className="flex items-center gap-[9px] px-[14px] py-2.5 rounded-[10px] bg-white/[.04] border border-white/[.08]">
            <SearchIcon size={15} stroke="rgba(255,255,255,.45)" />
            <input value={addQuery} onChange={(e) => setAddQuery(e.target.value)} placeholder="曲を検索してこのリストに追加" className="flex-1 bg-transparent border-none text-white text-[13px]" />
            {addQuery && <button onClick={() => setAddQuery('')} className="bg-transparent border-none cursor-pointer text-white/40 text-[15px] leading-none px-0.5">✕</button>}
          </div>
          {q && (
            <div className="mt-2 rounded-xl overflow-hidden bg-white/[.025] border border-white/[.07]">
              {searchResults.map((s) => (
                <div key={s.id} className="flex items-center gap-[11px] px-[13px] py-[9px] border-b border-white/[.04]">
                  <div className="relative w-[52px] h-[30px] rounded-[5px] overflow-hidden shrink-0 border border-white/10">
                    <div style={thumbBg(s.color)} />
                    {s.thumbImg && <img src={s.thumbImg} loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} className="absolute inset-0 w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold whitespace-nowrap overflow-hidden text-ellipsis">{s.title}</div>
                    <div className="text-[11px] text-white/45 whitespace-nowrap overflow-hidden text-ellipsis">{s.artist}</div>
                  </div>
                  <button onClick={() => { toggleSongInList(s.id, activeListObj.id); }} className="flex items-center gap-[5px] shrink-0 px-[11px] py-1.5 rounded-lg cursor-pointer text-xs font-bold text-accent bg-white/5 border border-[color:var(--accent)]"><PlusIcon size={13} />追加</button>
                </div>
              ))}
              {/* no existing match → register a new song */}
              <button onClick={() => registerForList(activeListObj.id, addQuery)} data-hover="row" className="flex items-center gap-2.5 w-full px-[13px] py-3 bg-transparent border-none cursor-pointer text-left text-white">
                <div className="w-[30px] h-[30px] rounded-[7px] grid place-items-center bg-[color:var(--accent)] shrink-0"><PlusIcon size={16} /></div>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold">「{addQuery.trim()}」を新曲として登録</div>
                  <div className="text-[11px] text-white/45">{searchResults.length > 0 ? 'リストに無い曲はこちらから' : '一致する曲がありません。登録後このリストに追加されます'}</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {detail.length > 0 ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))' }}>
            {detail.map((s) => (
              <div key={s.id} data-hover="card" className="rounded-2xl overflow-hidden bg-white/[.03] border border-white/[.08] transition-all">
                <div className="relative w-full h-[120px]">
                  <div style={thumbBg(s.color)} />
                  <button onClick={() => incPlays(s.id)} className="absolute inset-0 grid place-items-center bg-transparent border-none cursor-pointer"><PlayIcon size={22} /></button>
                  <div className="absolute left-2 top-2"><span style={badgeStyle(s.color)}><span style={dotStyle(s.color)} />{s.genreLabel}</span></div>
                  <button onClick={() => removeFromList(s.id, activeListObj.id)} title="リストから削除" className="absolute right-1.5 top-1.5 bg-black/50 border-none cursor-pointer text-white/70 rounded-md px-[7px] py-1 text-[11px]">✕</button>
                </div>
                <div className="px-[13px] pt-2.5 pb-3">
                  <button onClick={() => window.open(s.url, '_blank')} data-hover="title" title="YouTubeで開く" className="block w-full text-left text-[13px] font-bold overflow-hidden text-ellipsis whitespace-nowrap bg-transparent border-none cursor-pointer text-white p-0 transition-colors">{s.title}</button>
                  <div className="text-[11px] text-white/50 mt-0.5">{s.artist}</div>
                  <div className="font-['Share_Tech_Mono',monospace] text-[10px] text-white/40 mt-1.5">{s.playsF} 歌唱</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-white/35 text-sm rounded-2xl border-[1.5px] border-dashed border-white/12">まだ楽曲がありません。ライブラリから「＋」で追加しましょう。</div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-[vvFade_200ms_ease]">
      <div className="grid gap-[18px]" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))' }}>
        <button onClick={openCreateList} data-hover="createcard" className="rounded-2xl min-h-[218px] border-[1.5px] border-dashed border-white/[.18] bg-white/[.015] flex flex-col items-center justify-center gap-[13px] cursor-pointer text-white/55 transition-all">
          <div className="w-[50px] h-[50px] rounded-[13px] grid place-items-center bg-white/5 border border-white/12"><PlusIcon size={24} /></div>
          <div className="font-bold text-sm">新しいマイリスト</div>
          <div className="font-['Share_Tech_Mono',monospace] text-[10px] tracking-[1px] opacity-60">CREATE PLAYLIST</div>
        </button>
        {lists.map((l) => {
          const cv = cover(l, colorOf);
          return (
            <div key={l.id} onClick={() => openList(l.id)} data-hover="card" className="rounded-2xl overflow-hidden bg-white/[.03] border border-white/[.08] transition-all cursor-pointer">
              <div className="relative grid grid-cols-2 grid-rows-2 h-[130px] gap-px">
                <div style={{ background: cv[0] }} /><div style={{ background: cv[1] }} /><div style={{ background: cv[2] }} /><div style={{ background: cv[3] }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent 40%,rgba(8,10,20,.85))' }} />
                <div className="absolute left-[13px] bottom-[11px]">
                  <div className="text-base font-black">{l.name}</div>
                  <div className="font-['Share_Tech_Mono',monospace] text-[10px] tracking-[1.5px] text-accent mt-0.5">{l.en}</div>
                </div>
                <div className="absolute right-[11px] bottom-[11px] w-[38px] h-[38px] rounded-full grid place-items-center bg-[color:var(--accent)] shadow-[0_0_18px_var(--glow)]"><PlayIcon size={16} fill="#06070f" /></div>
              </div>
              <div className="px-[14px] py-3 flex justify-between items-center">
                <span className="font-['Share_Tech_Mono',monospace] text-xs text-white/55">{l.songIds.length} TRACKS</span>
                <button onClick={(e) => { e.stopPropagation(); deleteList(l.id); }} title="削除" className="bg-transparent border-none cursor-pointer text-white/30 p-0.5"><TrashIcon size={15} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
