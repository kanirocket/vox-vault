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
      <div style={{ animation: 'vvFade 200ms ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
          <button onClick={closeList} data-hover="dashbtn" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: '1px solid rgba(255,255,255,.15)', color: 'rgba(255,255,255,.7)', borderRadius: 9, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>リスト一覧
          </button>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{activeListObj.name}</div>
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: 'var(--accent)', letterSpacing: 1 }}>{activeListObj.en} · {activeListObj.songIds.length}曲</div>
          </div>
        </div>

        {/* search & add panel */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
            <SearchIcon size={15} stroke="rgba(255,255,255,.45)" />
            <input value={addQuery} onChange={(e) => setAddQuery(e.target.value)} placeholder="曲を検索してこのリストに追加" style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: 13 }} />
            {addQuery && <button onClick={() => setAddQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', fontSize: 15, lineHeight: 1, padding: '0 2px' }}>✕</button>}
          </div>
          {q && (
            <div style={{ marginTop: 8, borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)' }}>
              {searchResults.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 13px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                  <div style={{ position: 'relative', width: 52, height: 30, borderRadius: 5, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,.1)' }}>
                    <div style={thumbBg(s.color)} />
                    {s.thumbImg && <img src={s.thumbImg} loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.artist}</div>
                  </div>
                  <button onClick={() => { toggleSongInList(s.id, activeListObj.id); }} style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, padding: '6px 11px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: 'var(--accent)', background: 'rgba(255,255,255,.05)', border: '1px solid var(--accent)' }}><PlusIcon size={13} />追加</button>
                </div>
              ))}
              {/* no existing match → register a new song */}
              <button onClick={() => registerForList(activeListObj.id, addQuery)} data-hover="row" style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 13px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#fff' }}>
                <div style={{ width: 30, height: 30, borderRadius: 7, display: 'grid', placeItems: 'center', background: 'var(--accent)', flexShrink: 0 }}><PlusIcon size={16} /></div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>「{addQuery.trim()}」を新曲として登録</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>{searchResults.length > 0 ? 'リストに無い曲はこちらから' : '一致する曲がありません。登録後このリストに追加されます'}</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {detail.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 16 }}>
            {detail.map((s) => (
              <div key={s.id} data-hover="card" style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', transition: 'all .15s' }}>
                <div style={{ position: 'relative', width: '100%', height: 120 }}>
                  <div style={thumbBg(s.color)} />
                  <button onClick={() => incPlays(s.id)} style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}><PlayIcon size={22} /></button>
                  <div style={{ position: 'absolute', left: 8, top: 8 }}><span style={badgeStyle(s.color)}><span style={dotStyle(s.color)} />{s.genreLabel}</span></div>
                  <button onClick={() => removeFromList(s.id, activeListObj.id)} title="リストから削除" style={{ position: 'absolute', right: 6, top: 6, background: 'rgba(0,0,0,.5)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.7)', borderRadius: 6, padding: '4px 7px', fontSize: 11 }}>✕</button>
                </div>
                <div style={{ padding: '10px 13px 12px' }}>
                  <button onClick={() => window.open(s.url, '_blank')} data-hover="title" title="YouTubeで開く" style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, textAlign: 'left', width: '100%', transition: 'color .15s', display: 'block' }}>{s.title}</button>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{s.artist}</div>
                  <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 6 }}>{s.playsF} 歌唱</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,.35)', fontSize: 14, borderRadius: 16, border: '1.5px dashed rgba(255,255,255,.12)' }}>まだ楽曲がありません。ライブラリから「＋」で追加しましょう。</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ animation: 'vvFade 200ms ease' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 18 }}>
        <button onClick={openCreateList} data-hover="createcard" style={{ borderRadius: 16, minHeight: 218, border: '1.5px dashed rgba(255,255,255,.18)', background: 'rgba(255,255,255,.015)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 13, cursor: 'pointer', color: 'rgba(255,255,255,.55)', transition: 'all .15s' }}>
          <div style={{ width: 50, height: 50, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)' }}><PlusIcon size={24} /></div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>新しいマイリスト</div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, letterSpacing: 1, opacity: 0.6 }}>CREATE PLAYLIST</div>
        </button>
        {lists.map((l) => {
          const cv = cover(l, colorOf);
          return (
            <div key={l.id} onClick={() => openList(l.id)} data-hover="card" style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', transition: 'all .15s', cursor: 'pointer' }}>
              <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', height: 130, gap: 1 }}>
                <div style={{ background: cv[0] }} /><div style={{ background: cv[1] }} /><div style={{ background: cv[2] }} /><div style={{ background: cv[3] }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 40%,rgba(8,10,20,.85))' }} />
                <div style={{ position: 'absolute', left: 13, bottom: 11 }}>
                  <div style={{ fontSize: 16, fontWeight: 900 }}>{l.name}</div>
                  <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, letterSpacing: 1.5, color: 'var(--accent)', marginTop: 2 }}>{l.en}</div>
                </div>
                <div style={{ position: 'absolute', right: 11, bottom: 11, width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--accent)', boxShadow: '0 0 18px var(--glow)' }}><PlayIcon size={16} fill="#06070f" /></div>
              </div>
              <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 12, color: 'rgba(255,255,255,.55)' }}>{l.songIds.length} TRACKS</span>
                <button onClick={(e) => { e.stopPropagation(); deleteList(l.id); }} title="削除" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.3)', padding: 2 }}><TrashIcon size={15} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
