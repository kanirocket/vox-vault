import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { useIsMobile } from '../hooks';
import { badgeStyle, dotStyle, tagChipStyle, thumbBg, type Decorated } from '../utils';
import { MicIcon, MoreIcon, PlusIcon, StarIcon, TrashIcon } from '../icons';
import { RatingStars } from './RatingStars';

interface Props {
  s: Decorated;
  showGenre: boolean;
  gridTemplateColumns: string;
}

export function LibraryRow({ s, showGenre, gridTemplateColumns }: Props) {
  const { deletePending, filterArtist, incPlays, showUnsing, toggleFav, openAddToList, startDel, confirmDel, cancelDel, rateSong } = useStore();
  const isMobile = useIsMobile();
  const isPending = deletePending === s.id;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  if (isMobile) {
    // larger touch targets (~36px) for the inline actions
    const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 8, lineHeight: 1, display: 'grid', placeItems: 'center', flexShrink: 0 } as const;
    const menuItem = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '11px 14px', fontFamily: 'inherit', fontSize: 13, color: '#fff', textAlign: 'left' as const };
    return (
      <div data-hover="row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,.04)', transition: 'background .15s' }}>
        {/* thumbnail */}
        <button onClick={() => window.open(s.url, '_blank')} title="YouTubeで開く" style={{ position: 'relative', width: 64, height: 36, borderRadius: 5, overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer', padding: 0, background: 'none', flexShrink: 0 }}>
          <div style={thumbBg(s.color)} />
          {s.thumbImg && <img src={s.thumbImg} loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        </button>
        {/* info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* line 1: title */}
          <button onClick={() => window.open(s.url, '_blank')} data-hover="title" title="YouTubeで開く" style={{ display: 'block', width: '100%', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, textAlign: 'left', transition: 'color .15s' }}>{s.title}</button>
          {/* line 2: artist + plays */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <button onClick={() => filterArtist(s.artist)} style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>{s.artist}</button>
            <button onClick={() => showUnsing(s.id)} style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>{s.playsF}</button>
          </div>
        </div>
        {/* actions */}
        {isPending ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button onClick={(e) => { e.stopPropagation(); confirmDel(s.id); }} style={{ background: 'rgba(255,80,80,.2)', border: '1px solid rgba(255,100,100,.5)', color: '#fff', borderRadius: 7, cursor: 'pointer', padding: '7px 12px', fontSize: 13, fontWeight: 700 }}>✓</button>
            <button onClick={(e) => { e.stopPropagation(); cancelDel(); }} style={{ background: 'none', border: '1px solid rgba(255,255,255,.15)', color: 'rgba(255,255,255,.6)', borderRadius: 7, cursor: 'pointer', padding: '7px 11px', fontSize: 13 }}>✕</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <button onClick={() => toggleFav(s.id)} style={iconBtn}><StarIcon size={18} fill={s.fav ? s.color : 'none'} stroke={s.fav ? s.color : 'rgba(255,255,255,.35)'} style={{ filter: s.fav ? `drop-shadow(0 0 4px ${s.color})` : 'none', transition: 'all .15s' }} /></button>
            {/* overflow menu */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button onClick={() => setMenuOpen((o) => !o)} title="メニュー" style={{ ...iconBtn, color: 'rgba(255,255,255,.5)' }}><MoreIcon size={18} /></button>
              {menuOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, minWidth: 150, background: 'rgba(20,22,34,.98)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,.5)', overflow: 'hidden', zIndex: 20, animation: 'vvPop 120ms ease' }}>
                  <button onClick={() => { incPlays(s.id); setMenuOpen(false); }} style={{ ...menuItem, color: 'var(--accent)' }}><MicIcon size={16} />歌唱 +1</button>
                  <button onClick={() => { openAddToList(s.id); setMenuOpen(false); }} style={menuItem}><PlusIcon size={16} />リストに追加</button>
                  <button onClick={(e) => { e.stopPropagation(); startDel(s.id); setMenuOpen(false); }} style={{ ...menuItem, color: 'rgba(255,120,120,.95)' }}><TrashIcon size={15} />削除</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-hover="row" style={{ display: 'grid', gridTemplateColumns, alignItems: 'center', gap: 16, padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,.04)', transition: 'background .15s' }}>
      <button onClick={() => window.open(s.url, '_blank')} title="YouTubeで開く" style={{ position: 'relative', width: 96, height: 54, borderRadius: 7, overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer', padding: 0, background: 'none', flexShrink: 0 }}>
        <div style={thumbBg(s.color)} />
        {s.thumbImg && <img src={s.thumbImg} loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        <span style={{ position: 'absolute', right: 4, bottom: 3, fontFamily: "'Share Tech Mono',monospace", fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'rgba(0,0,0,.7)', color: '#fff' }}>{s.dur}</span>
      </button>
      <div style={{ minWidth: 0 }}>
        <button onClick={() => window.open(s.url, '_blank')} data-hover="title" title="YouTubeで開く" style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, textAlign: 'left', maxWidth: '100%', transition: 'color .15s', display: 'block' }}>{s.title}</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2, minWidth: 0 }}>
          {s.artists.length > 1 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, minWidth: 0 }}>
              {s.artists.map((a) => (
                <button key={a} onClick={() => filterArtist(a)} style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', padding: '1px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.04)', whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'inherit', transition: 'color .15s' }}>{a}</button>
              ))}
            </div>
          ) : (
            <button onClick={() => filterArtist(s.artist)} style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color .15s' }}>{s.artist}</button>
          )}
          {s.hasDetail && (
            <>
              <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: 'var(--accent)', padding: '1px 5px', borderRadius: 4, border: '1px solid var(--accent)', flexShrink: 0, opacity: 0.8 }}>{s.detailLabel}</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.detailText}</span>
            </>
          )}
        </div>
        {s.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
            {s.tags.map((t) => <span key={t} style={tagChipStyle}>{t}</span>)}
          </div>
        )}
      </div>
      {showGenre && <div><span style={badgeStyle(s.color)}><span style={dotStyle(s.color)} />{s.genreLabel}</span></div>}
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 12, color: 'rgba(255,255,255,.6)' }}>{s.dateF}</div>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 12, color: 'rgba(255,255,255,.55)' }}>{s.viewsF}</div>
      <button onClick={() => showUnsing(s.id)} title="クリックで取り消し" style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 2, justifySelf: 'start' }}>{s.playsF}</button>
      <div style={{ display: 'flex', alignItems: 'center' }}><RatingStars rating={s.rating} onRate={(n) => rateSong(s.id, n)} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
        {isPending ? (
          <>
            <span style={{ fontSize: 10, color: 'rgba(255,100,100,.9)', marginRight: 2, whiteSpace: 'nowrap' }}>削除?</span>
            <button onClick={(e) => { e.stopPropagation(); confirmDel(s.id); }} title="確認" style={{ background: 'rgba(255,80,80,.2)', border: '1px solid rgba(255,100,100,.5)', color: '#fff', borderRadius: 6, cursor: 'pointer', padding: '4px 7px', fontSize: 11, fontWeight: 700 }}>✓</button>
            <button onClick={(e) => { e.stopPropagation(); cancelDel(); }} title="キャンセル" style={{ background: 'none', border: '1px solid rgba(255,255,255,.15)', color: 'rgba(255,255,255,.6)', borderRadius: 6, cursor: 'pointer', padding: '4px 7px', fontSize: 12 }}>✕</button>
          </>
        ) : (
          <>
            <button onClick={() => toggleFav(s.id)} data-hover="iconbtn" title="お気に入り" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6 }}><StarIcon size={17} fill={s.fav ? s.color : 'none'} stroke={s.fav ? s.color : 'rgba(255,255,255,.35)'} style={{ filter: s.fav ? `drop-shadow(0 0 6px ${s.color})` : 'none', transition: 'all .15s' }} /></button>
            <button onClick={() => incPlays(s.id)} data-hover="iconbtn" title="歌唱 +1" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: 'rgba(255,255,255,.35)' }}><MicIcon size={15} /></button>
            <button onClick={() => openAddToList(s.id)} data-hover="iconbtn" title="リストに追加" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: 'rgba(255,255,255,.35)' }}><PlusIcon size={15} /></button>
            <button onClick={(e) => { e.stopPropagation(); startDel(s.id); }} data-hover="iconbtn" title="削除" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: 'rgba(255,255,255,.3)' }}><TrashIcon size={14} /></button>
          </>
        )}
      </div>
    </div>
  );
}
