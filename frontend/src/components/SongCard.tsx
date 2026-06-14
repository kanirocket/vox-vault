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
    <div data-hover="card" style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', transition: 'all .15s' }}>
      <button onClick={() => window.open(s.url, '_blank')} title="YouTubeで開く" style={{ display: 'block', position: 'relative', width: '100%', height, padding: 0, border: 'none', cursor: 'pointer', background: 'none' }}>
        <div style={thumbBg(s.color)} />
        {s.thumbImg && <img src={s.thumbImg} loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        <span style={{ position: 'absolute', right: 6, bottom: 5, fontFamily: "'Share Tech Mono',monospace", fontSize: 10, padding: '2px 5px', borderRadius: 3, background: 'rgba(0,0,0,.75)' }}>{s.dur}</span>
        {showGenre && <div style={{ position: 'absolute', left: 8, top: 8 }}><span style={badgeStyle(s.color)}><span style={dotStyle(s.color)} />{s.genreLabel}</span></div>}
      </button>
      <div style={{ padding: '12px 14px 14px' }}>
        <button onClick={() => window.open(s.url, '_blank')} data-hover="title" title="YouTubeで開く" style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, textAlign: 'left', width: '100%', transition: 'color .15s', display: 'block' }}>{s.title}</button>
        {s.artists.length > 1 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
            {s.artists.map((a) => (
              <button key={a} onClick={() => filterArtist(a)} style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', padding: '1px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.04)', whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'inherit', transition: 'color .15s' }}>{a}</button>
            ))}
          </div>
        ) : (
          <button onClick={() => filterArtist(s.artist)} style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 2, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', width: '100%', textAlign: 'left', transition: 'color .15s' }}>{s.artist}</button>
        )}
        {s.hasDetail && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, minWidth: 0 }}>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: 'var(--accent)', padding: '1px 5px', borderRadius: 4, border: '1px solid var(--accent)', opacity: 0.8, flexShrink: 0 }}>{s.detailLabel}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.detailText}</span>
          </div>
        )}
        {s.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
            {s.tags.map((t) => <span key={t} style={tagChipStyle}>{t}</span>)}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}><RatingStars rating={s.rating} onRate={(n) => rateSong(s.id, n)} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,.4)' }}>{s.dateF}</span>
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: 'var(--accent)', marginRight: 4 }}>{s.playsF}</span>
            <button onClick={() => openAddToList(s.id)} data-hover="iconbtn" title="リスト追加" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, borderRadius: 5, color: 'rgba(255,255,255,.35)' }}><PlusIcon size={14} /></button>
            <button onClick={() => toggleFav(s.id)} title="お気に入り" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}><StarIcon size={16} fill={s.fav ? s.color : 'none'} stroke={s.fav ? s.color : 'rgba(255,255,255,.35)'} style={{ filter: s.fav ? `drop-shadow(0 0 6px ${s.color})` : 'none', transition: 'all .15s' }} /></button>
            <button onClick={() => incPlays(s.id)} title="歌唱 +1" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, borderRadius: 5, color: 'rgba(255,255,255,.35)' }}><MicIcon size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
