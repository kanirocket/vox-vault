import { useMemo, useState, type CSSProperties } from 'react';
import { useStore } from '../store';
import { GENRE_KEYS, GENRES, PRESET_VOCALS } from '../constants';
import { parseViews } from '../utils';
import { PlayIcon } from '../icons';
import type { Genre } from '../types';

const labelStyle: CSSProperties = { fontFamily: "'Share Tech Mono',monospace", fontSize: 10, letterSpacing: 1.5, color: 'rgba(255,255,255,.45)' };
const fieldBox: CSSProperties = { marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center', minHeight: 44, padding: '8px 12px', borderRadius: 10, background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.1)' };

const suggChip = (active = false): CSSProperties => ({
  padding: '3px 9px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600,
  border: '1px solid ' + (active ? 'var(--accent)' : 'rgba(255,255,255,.18)'),
  background: active ? 'rgba(34,211,238,.1)' : 'rgba(255,255,255,.05)',
  color: active ? 'var(--accent)' : 'rgba(255,255,255,.7)', whiteSpace: 'nowrap',
});

function Chip({ label, onRemove, accent }: { label: string; onRemove: () => void; accent?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 7px 4px 10px', borderRadius: 7, background: accent ? 'var(--accent)' : 'rgba(255,255,255,.12)', border: accent ? 'none' : '1px solid rgba(255,255,255,.25)', color: accent ? '#06070f' : '#fff', fontSize: 12, fontWeight: 700 }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent ? '#06070f' : 'rgba(255,255,255,.6)', fontSize: 15, padding: 0, lineHeight: 1 }}>×</button>
    </span>
  );
}

export function RegisterForm() {
  const { regSelected, songs, backStep, saveSong, showToast } = useStore();
  const sel = regSelected;

  const [title, setTitle] = useState(sel?.title || '');
  const [genre, setGenre] = useState<Genre>(sel?.genre || 'artist');
  const [artists, setArtists] = useState<string[]>(sel?.artist ? [sel.artist] : []);
  const [artistInput, setArtistInput] = useState('');
  const [vocals, setVocals] = useState<string[]>([]);
  const [vocalInput, setVocalInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [work, setWork] = useState('');
  const [rating, setRating] = useState<number | null>(null);

  // library-derived autocomplete sources
  const { knownVocals, knownWorks, knownTags, knownArtists } = useMemo(() => ({
    knownVocals: [...new Set(songs.flatMap((x) => x.vocals || []).filter(Boolean))].sort(),
    knownWorks: [...new Set(songs.filter((x) => x.genre === 'anime' || x.genre === 'game').map((x) => x.work).filter(Boolean))].sort(),
    knownTags: [...new Set(songs.flatMap((x) => x.tags || []).filter(Boolean))].sort(),
    knownArtists: [...new Set(songs.flatMap((x) => (x.artists && x.artists.length ? x.artists : x.artist ? [x.artist] : [])).filter(Boolean))].sort(),
  }), [songs]);

  const allVocals = [...new Set([...PRESET_VOCALS, ...knownVocals])];
  const quickVocals = allVocals.filter((v) => !vocals.includes(v));
  const quickTags = knownTags.filter((v) => !tags.includes(v)).slice(0, 10);
  const aq = artistInput.trim().toLowerCase();
  const artistMatches = (aq
    ? knownArtists.filter((v) => !artists.includes(v) && v.toLowerCase().includes(aq)).slice(0, 8)
    : knownArtists.filter((v) => !artists.includes(v)).slice(0, 6));
  const wq = work.trim().toLowerCase();
  const workMatches = (wq
    ? knownWorks.filter((v) => v.toLowerCase().includes(wq) && v !== work).slice(0, 6)
    : knownWorks.slice(0, 6));

  const addArtist = (v: string) => { const t = v.trim(); if (t && !artists.includes(t)) setArtists([...artists, t]); setArtistInput(''); };
  const addVocal = (v: string) => { const t = v.trim(); if (t && !vocals.includes(t)) setVocals([...vocals, t]); setVocalInput(''); };
  const addTag = (v: string) => { const t = v.trim(); if (t && !tags.includes(t)) setTags([...tags, t]); setTagInput(''); };

  const onSave = async () => {
    const all = [...artists];
    const pending = artistInput.trim();
    if (pending && !all.includes(pending)) all.push(pending);
    if (!all.length) { showToast('アーティスト名を入力してください', 'error'); return; }
    await saveSong({
      title: title.trim() || sel?.title || '',
      artists: all,
      genre,
      vocals: [...vocals],
      work,
      tags: [...tags],
      rating,
      date: String(sel?.date || '').replace(/\./g, '-'),
      dur: sel?.dur || '',
      views: parseViews(sel?.views || '0'),
      url: sel?.url || '',
    });
  };

  const selColor = sel?.genre ? (GENRES[sel.genre] || GENRES.artist).color : '#38e8ff';
  const selThumb: CSSProperties = sel?.thumb
    ? { position: 'absolute', inset: 0, backgroundImage: `url('${sel.thumb}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { position: 'absolute', inset: 0, background: `radial-gradient(130% 150% at 16% -10%,${selColor}88,transparent 56%),linear-gradient(135deg,#0b1126,#06070f)` };

  return (
    <div style={{ borderRadius: 18, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(18px)', padding: 30, animation: 'vvFade 180ms ease' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 28, alignItems: 'start' }}>
        <div>
          <div style={{ position: 'relative', width: '100%', height: 136, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,.12)' }}>
            <div style={selThumb} />
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}><PlayIcon size={30} /></div>
          </div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 14, lineHeight: 2 }}>
            <div>SOURCE · YouTube</div>
            <div>投稿日 · <span style={{ color: 'var(--accent)' }}>{sel?.date || ''}</span></div>
            <div>長さ · {sel?.dur || ''}</div>
            <div>視聴 · {sel?.views || ''}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* title */}
          <div>
            <label style={labelStyle}>楽曲名</label>
            <div style={{ marginTop: 7, padding: '2px 14px', borderRadius: 10, background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.1)' }}>
              <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '10px 0', background: 'none', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700 }} />
            </div>
          </div>

          {/* artists */}
          <div>
            <label style={labelStyle}>アーティスト（複数可）</label>
            <div style={fieldBox}>
              {artists.map((a, i) => <Chip key={a} label={a} onRemove={() => setArtists(artists.filter((_, j) => j !== i))} />)}
              <input value={artistInput} onChange={(e) => setArtistInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && artistInput.trim()) { e.preventDefault(); addArtist(artistInput); } }} placeholder="名前を入力しEnterで追加" style={{ flex: 1, minWidth: 120, background: 'none', border: 'none', color: '#fff', fontSize: 13 }} />
            </div>
            {artistMatches.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                {artistMatches.map((v) => <button key={v} onClick={() => addArtist(v)} style={suggChip()}>{v}</button>)}
              </div>
            )}
          </div>

          {/* genre */}
          <div>
            <label style={labelStyle}>ジャンル</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {GENRE_KEYS.map((k) => {
                const on = genre === k;
                return (
                  <button key={k} onClick={() => setGenre(k)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 6px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, border: on ? '1px solid ' + GENRES[k].color : '1px solid rgba(255,255,255,.1)', background: on ? GENRES[k].color + '1f' : 'rgba(0,0,0,.25)', color: on ? GENRES[k].color : 'rgba(255,255,255,.5)', boxShadow: on ? '0 0 14px ' + GENRES[k].color + '44' : 'none' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: GENRES[k].color, boxShadow: '0 0 7px ' + GENRES[k].color }} />{GENRES[k].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* vocals (vocaloid only) */}
          {genre === 'vocaloid' && (
            <div>
              <label style={labelStyle}>歌唱ボカロ（複数可）</label>
              <div style={fieldBox}>
                {vocals.map((v, i) => <Chip key={v} label={v} accent onRemove={() => setVocals(vocals.filter((_, j) => j !== i))} />)}
                <input value={vocalInput} onChange={(e) => setVocalInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && vocalInput.trim()) { e.preventDefault(); addVocal(vocalInput); } }} placeholder="名前を入力しEnterで追加" style={{ flex: 1, minWidth: 110, background: 'none', border: 'none', color: '#fff', fontSize: 12 }} />
              </div>
              {quickVocals.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                  {quickVocals.map((v) => <button key={v} onClick={() => addVocal(v)} style={suggChip()}>{v}</button>)}
                </div>
              )}
            </div>
          )}

          {/* work (anime / game) */}
          {(genre === 'anime' || genre === 'game') && (
            <div>
              <label style={labelStyle}>作品名</label>
              <div style={{ marginTop: 7, padding: '2px 14px', borderRadius: 10, background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.1)' }}>
                <input value={work} onChange={(e) => setWork(e.target.value)} placeholder={genre === 'game' ? '例：ゲーム「…」' : '例：TVアニメ「…」'} style={{ width: '100%', padding: '10px 0', background: 'none', border: 'none', color: '#fff', fontSize: 13 }} />
              </div>
              {workMatches.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                  {workMatches.map((v) => <button key={v} onClick={() => setWork(v)} style={suggChip(work === v)}>{v}</button>)}
                </div>
              )}
            </div>
          )}

          {/* tags */}
          <div>
            <label style={labelStyle}>タグ（複数可）<span style={{ opacity: 0.5, fontSize: 9, marginLeft: 8 }}>例：バラード 高音</span></label>
            <div style={fieldBox}>
              {tags.map((t, i) => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 7px 4px 9px', borderRadius: 7, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.18)', fontSize: 12 }}>
                  {t}<button onClick={() => setTags(tags.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.55)', fontSize: 15, padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && tagInput.trim()) { e.preventDefault(); addTag(tagInput); } }} placeholder="タグを入力しEnterで追加" style={{ flex: 1, minWidth: 110, background: 'none', border: 'none', color: '#fff', fontSize: 12 }} />
            </div>
            {quickTags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                {quickTags.map((v) => <button key={v} onClick={() => addTag(v)} style={suggChip()}>{v}</button>)}
              </div>
            )}
          </div>

          {/* rating */}
          <div>
            <label style={labelStyle}>歌える度</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => {
                const filled = rating !== null && n <= rating;
                return <button key={n} onClick={() => setRating(n === rating ? null : n)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 28, padding: '0 4px', lineHeight: 1, color: filled ? 'var(--accent)' : 'rgba(255,255,255,.15)' }}>★</button>;
              })}
              {rating !== null
                ? <button onClick={() => setRating(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'rgba(255,255,255,.4)', marginLeft: 6, fontFamily: 'inherit' }}>クリア</button>
                : <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', marginLeft: 8 }}>（未評価）</span>}
            </div>
          </div>

          {/* actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={() => backStep(2)} style={{ padding: '13px 22px', borderRadius: 11, background: 'none', border: '1px solid rgba(255,255,255,.15)', color: 'rgba(255,255,255,.7)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>← 候補に戻る</button>
            <button onClick={onSave} style={{ flex: 1, padding: 13, borderRadius: 11, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#06070f', background: 'linear-gradient(135deg,var(--accent),var(--accent3))', boxShadow: '0 0 22px var(--glow)' }}>VAULT に登録</button>
          </div>
        </div>
      </div>
    </div>
  );
}
