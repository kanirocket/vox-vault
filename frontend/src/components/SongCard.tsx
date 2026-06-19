import { useStore } from '../store';
import { badgeStyle, dotStyle, tagChipStyle, thumbBg, type Decorated } from '../utils';
import { MicIcon, PlusIcon, StarIcon } from '../icons';
import { RatingStars } from './RatingStars';

interface Props {
  s: Decorated;
  showGenre: boolean;
  height?: number;
}

export function SongCard({ s, showGenre, height = 128 }: Props) {
  const { filterArtist, openAddToList, toggleFav, incPlays, rateSong } = useStore();

  return (
    <div data-hover="card" className="rounded-2xl overflow-hidden bg-accent/5 border border-white/[.08] transition-all">
      <button onClick={() => window.open(s.url, '_blank')} title="YouTubeで開く" className="block relative w-full p-0 border-none cursor-pointer bg-transparent" style={{ height }}>
        <div style={thumbBg(s.color)} />
        {s.thumbImg && <img src={s.thumbImg} loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} className="absolute inset-0 w-full h-full object-cover" />}
        <span className="absolute right-1.5 bottom-[5px] font-['Share_Tech_Mono',monospace] text-[10px] px-[5px] py-0.5 rounded-[3px] bg-black/75">{s.dur}</span>
        {showGenre && <div className="absolute left-2 top-2"><span style={badgeStyle(s.color)}><span style={dotStyle(s.color)} />{s.genreLabel}</span></div>}
      </button>
      <div className="px-[14px] pt-3 pb-[14px]">
        <button onClick={() => window.open(s.url, '_blank')} data-hover="title" title="YouTubeで開く" className="block w-full text-left text-sm font-bold overflow-hidden text-ellipsis whitespace-nowrap bg-transparent border-none cursor-pointer text-white p-0 transition-colors">{s.title}</button>
        {s.artists.length > 1 ? (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {s.artists.map((a) => (
              <button key={a} onClick={() => filterArtist(a)} className="text-[11px] text-white/65 px-1.5 py-px rounded border border-white/15 bg-white/[.04] whitespace-nowrap cursor-pointer transition-colors">{a}</button>
            ))}
          </div>
        ) : (
          <button onClick={() => filterArtist(s.artist)} className="block w-full text-left text-xs text-white/50 mt-0.5 bg-transparent border-none cursor-pointer p-0 overflow-hidden text-ellipsis whitespace-nowrap transition-colors">{s.artist}</button>
        )}
        {s.hasDetail && (
          <div className="flex items-center gap-1.5 mt-[5px] min-w-0">
            <span className="font-['Share_Tech_Mono',monospace] text-[9px] text-accent px-[5px] py-px rounded border border-[color:var(--accent)] opacity-80 shrink-0">{s.detailLabel}</span>
            <span className="text-[11px] text-white/60 overflow-hidden text-ellipsis whitespace-nowrap">{s.detailText}</span>
          </div>
        )}
        {s.tags.length > 0 && (
          <div className="flex gap-[5px] mt-[7px] flex-wrap">
            {s.tags.map((t) => <span key={t} style={tagChipStyle}>{t}</span>)}
          </div>
        )}
        <div className="flex items-center gap-1 mt-2"><RatingStars rating={s.rating} onRate={(n) => rateSong(s.id, n)} /></div>
        <div className="flex justify-between items-center mt-1.5">
          <span className="font-['Share_Tech_Mono',monospace] text-[10px] text-white/40">{s.dateF}</span>
          <div className="flex gap-[3px] items-center">
            <span className="font-['Share_Tech_Mono',monospace] text-[11px] text-accent mr-1">{s.playsF}</span>
            <button onClick={() => openAddToList(s.id)} data-hover="iconbtn" title="リスト追加" className="bg-transparent border-none cursor-pointer p-[3px] rounded-[5px] text-white/35"><PlusIcon size={14} /></button>
            <button onClick={() => toggleFav(s.id)} title="お気に入り" className="bg-transparent border-none cursor-pointer p-[3px]"><StarIcon size={16} fill={s.fav ? s.color : 'none'} stroke={s.fav ? s.color : 'rgba(255,255,255,.35)'} style={{ filter: s.fav ? `drop-shadow(0 0 6px ${s.color})` : 'none', transition: 'all .15s' }} /></button>
            <button onClick={() => incPlays(s.id)} title="歌唱 +1" className="bg-transparent border-none cursor-pointer p-[3px] rounded-[5px] text-white/35"><MicIcon size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
