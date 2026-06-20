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
    // larger touch targets for the inline actions
    const iconBtn = 'bg-transparent border-none cursor-pointer p-2.5 rounded-lg leading-none grid place-items-center shrink-0';
    const menuItem = 'flex items-center gap-[11px] w-full bg-transparent border-none cursor-pointer px-4 py-[13px] text-sm text-white text-left';
    return (
      <div data-hover="row" className="flex items-center gap-[14px] px-4 py-[11px] border-b border-white/[.04] transition-[background] duration-150">
        {/* thumbnail */}
        <button onClick={() => window.open(s.url, '_blank')} title="YouTubeで開く" className="relative w-24 h-[54px] rounded-[7px] overflow-hidden border border-white/10 cursor-pointer p-0 bg-transparent shrink-0">
          <div style={thumbBg(s.color)} />
          {s.thumbImg && <img src={s.thumbImg} loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} className="absolute inset-0 w-full h-full object-cover" />}
        </button>
        {/* info */}
        <div className="flex-1 min-w-0">
          {/* line 1: title (no link) */}
          <div className="text-lg font-bold whitespace-nowrap overflow-hidden text-ellipsis text-white">{s.title}</div>
          {/* line 2: artist */}
          <div className="flex items-center gap-2 mt-[3px]">
            <button onClick={() => filterArtist(s.artist)} className="flex-1 text-left text-[15px] text-white/45 bg-transparent border-none cursor-pointer p-0 whitespace-nowrap overflow-hidden text-ellipsis">{s.artist}</button>
          </div>
        </div>
        {/* actions */}
        {isPending ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); confirmDel(s.id); }} className="bg-[rgba(255,80,80,.2)] border border-[rgba(255,100,100,.5)] text-white rounded-[7px] cursor-pointer px-[14px] py-[9px] text-[15px] font-bold">✓</button>
            <button onClick={(e) => { e.stopPropagation(); cancelDel(); }} className="bg-transparent border border-white/15 text-white/60 rounded-[7px] cursor-pointer px-[13px] py-[9px] text-[15px]">✕</button>
          </div>
        ) : (
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={() => toggleFav(s.id)} className={iconBtn}><StarIcon size={22} fill={s.fav ? s.color : 'none'} stroke={s.fav ? s.color : 'rgba(255,255,255,.35)'} style={{ filter: s.fav ? `drop-shadow(0 0 4px ${s.color})` : 'none', transition: 'all .15s' }} /></button>
            {/* overflow menu */}
            <div ref={menuRef} className="relative">
              <button onClick={() => setMenuOpen((o) => !o)} title="メニュー" className={`${iconBtn} text-white/50`}><MoreIcon size={22} /></button>
              {menuOpen && (
                <div className="absolute top-full right-0 mt-1 min-w-[168px] bg-[rgba(20,22,34,.98)] border border-white/12 rounded-[10px] shadow-[0_8px_28px_rgba(0,0,0,.5)] overflow-hidden z-20 animate-[vvPop_120ms_ease]">
                  <button onClick={() => { incPlays(s.id); setMenuOpen(false); }} className={`${menuItem} !text-accent`}><MicIcon size={17} />歌唱 +1</button>
                  <button onClick={() => { showUnsing(s.id); setMenuOpen(false); }} className={menuItem}><MicIcon size={17} />歌唱履歴</button>
                  <button onClick={() => { openAddToList(s.id); setMenuOpen(false); }} className={menuItem}><PlusIcon size={17} />リストに追加</button>
                  <button onClick={(e) => { e.stopPropagation(); startDel(s.id); setMenuOpen(false); }} className={`${menuItem} !text-[rgba(255,120,120,.95)]`}><TrashIcon size={16} />削除</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-hover="row" className="grid items-center gap-4 px-5 py-[11px] border-b border-white/[.04] transition-[background] duration-150" style={{ gridTemplateColumns }}>
      <button onClick={() => window.open(s.url, '_blank')} title="YouTubeで開く" className="relative w-24 h-[54px] rounded-[7px] overflow-hidden border border-white/10 cursor-pointer p-0 bg-transparent shrink-0">
        <div style={thumbBg(s.color)} />
        {s.thumbImg && <img src={s.thumbImg} loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} className="absolute inset-0 w-full h-full object-cover" />}
        <span className="absolute right-1 bottom-[3px] font-['Share_Tech_Mono',monospace] text-[9px] px-1 py-px rounded-[3px] bg-black/70 text-white">{s.dur}</span>
      </button>
      <div className="min-w-0">
        <button onClick={() => window.open(s.url, '_blank')} data-hover="title" title="YouTubeで開く" className="block max-w-full text-left text-sm font-bold whitespace-nowrap overflow-hidden text-ellipsis bg-transparent border-none cursor-pointer text-white p-0 transition-colors">{s.title}</button>
        <div className="flex items-center gap-[7px] mt-0.5 min-w-0">
          {s.artists.length > 1 ? (
            <div className="flex flex-wrap gap-1 min-w-0">
              {s.artists.map((a) => (
                <button key={a} onClick={() => filterArtist(a)} className="text-[11px] text-white/65 px-1.5 py-px rounded border border-white/15 bg-white/[.04] whitespace-nowrap cursor-pointer transition-colors">{a}</button>
              ))}
            </div>
          ) : (
            <button onClick={() => filterArtist(s.artist)} className="text-xs text-white/50 bg-transparent border-none cursor-pointer p-0 whitespace-nowrap overflow-hidden text-ellipsis transition-colors">{s.artist}</button>
          )}
          {s.hasDetail && (
            <>
              <span className="font-['Share_Tech_Mono',monospace] text-[9px] text-accent px-[5px] py-px rounded border border-[color:var(--accent)] shrink-0 opacity-80">{s.detailLabel}</span>
              <span className="text-xs text-white/60 whitespace-nowrap overflow-hidden text-ellipsis">{s.detailText}</span>
            </>
          )}
        </div>
        {s.tags.length > 0 && (
          <div className="flex gap-[5px] mt-[5px] flex-wrap">
            {s.tags.map((t) => <span key={t} style={tagChipStyle}>{t}</span>)}
          </div>
        )}
      </div>
      {showGenre && <div><span style={badgeStyle(s.color)}><span style={dotStyle(s.color)} />{s.genreLabel}</span></div>}
      <div className="font-['Share_Tech_Mono',monospace] text-xs text-white/60">{s.dateF}</div>
      <div className="font-['Share_Tech_Mono',monospace] text-xs text-white/55">{s.viewsF}</div>
      <div className="flex items-center"><RatingStars rating={s.rating} onRate={(n) => rateSong(s.id, n)} /></div>
      <div className="flex items-center gap-[3px] justify-end">
        {isPending ? (
          <>
            <span className="text-[10px] text-[rgba(255,100,100,.9)] mr-0.5 whitespace-nowrap">削除?</span>
            <button onClick={(e) => { e.stopPropagation(); confirmDel(s.id); }} title="確認" className="bg-[rgba(255,80,80,.2)] border border-[rgba(255,100,100,.5)] text-white rounded-md cursor-pointer px-[7px] py-1 text-[11px] font-bold">✓</button>
            <button onClick={(e) => { e.stopPropagation(); cancelDel(); }} title="キャンセル" className="bg-transparent border border-white/15 text-white/60 rounded-md cursor-pointer px-[7px] py-1 text-xs">✕</button>
          </>
        ) : (
          <>
            <button onClick={() => toggleFav(s.id)} data-hover="iconbtn" title="お気に入り" className="bg-transparent border-none cursor-pointer p-1 rounded-md"><StarIcon size={17} fill={s.fav ? s.color : 'none'} stroke={s.fav ? s.color : 'rgba(255,255,255,.35)'} style={{ filter: s.fav ? `drop-shadow(0 0 6px ${s.color})` : 'none', transition: 'all .15s' }} /></button>
            <button onClick={() => incPlays(s.id)} data-hover="iconbtn" title="歌唱 +1" className="bg-transparent border-none cursor-pointer p-1 rounded-md text-white/35"><MicIcon size={15} /></button>
            <button onClick={() => openAddToList(s.id)} data-hover="iconbtn" title="リストに追加" className="bg-transparent border-none cursor-pointer p-1 rounded-md text-white/35"><PlusIcon size={15} /></button>
            <button onClick={(e) => { e.stopPropagation(); startDel(s.id); }} data-hover="iconbtn" title="削除" className="bg-transparent border-none cursor-pointer p-1 rounded-md text-white/30"><TrashIcon size={14} /></button>
          </>
        )}
      </div>
    </div>
  );
}
