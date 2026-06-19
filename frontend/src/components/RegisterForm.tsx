import { useMemo, useState, type CSSProperties } from 'react';
import { useStore } from '../store';
import { GENRE_KEYS, GENRES, PRESET_VOCALS } from '../constants';
import { parseViews } from '../utils';
import { PlayIcon } from '../icons';
import type { Genre } from '../types';

const labelClass = "font-['Share_Tech_Mono',monospace] text-[10px] tracking-[1.5px] text-white/45";
const fieldClass = 'mt-[7px] flex flex-wrap gap-[7px] items-center min-h-[44px] px-3 py-2 rounded-[10px] bg-black/30 border border-white/10';
const inputBoxClass = 'mt-[7px] px-[14px] py-0.5 rounded-[10px] bg-black/30 border border-white/10';
const suggRowClass = 'flex flex-wrap gap-[5px] mt-1.5';

const suggClass = (active = false) =>
  'px-[9px] py-[3px] rounded-md cursor-pointer text-[11.5px] font-semibold whitespace-nowrap border ' +
  (active ? 'border-accent bg-[rgba(34,211,238,.1)] text-accent' : 'border-white/[.18] bg-white/5 text-white/70');

function Chip({ label, onRemove, accent }: { label: string; onRemove: () => void; accent?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-[5px] pl-2.5 pr-[7px] py-1 rounded-[7px] text-xs font-bold ${accent ? 'bg-[color:var(--accent)] border-none text-[#06070f]' : 'bg-white/12 border border-white/25 text-white'}`}>
      {label}
      <button onClick={onRemove} className={`bg-transparent border-none cursor-pointer text-[15px] p-0 leading-none ${accent ? 'text-[#06070f]' : 'text-white/60'}`}>×</button>
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
    <div className="rounded-[18px] bg-white/[.03] border border-white/[.08] backdrop-blur-lg p-[30px] animate-[vvFade_180ms_ease]">
      <div className="grid items-start gap-7" style={{ gridTemplateColumns: '240px 1fr' }}>
        <div>
          <div className="relative w-full h-[136px] rounded-xl overflow-hidden border border-white/12">
            <div style={selThumb} />
            <div className="absolute inset-0 grid place-items-center"><PlayIcon size={30} /></div>
          </div>
          <div className="font-['Share_Tech_Mono',monospace] text-[10px] text-white/40 mt-[14px] leading-loose">
            <div>SOURCE · YouTube</div>
            <div>投稿日 · <span className="text-accent">{sel?.date || ''}</span></div>
            <div>長さ · {sel?.dur || ''}</div>
            <div>視聴 · {sel?.views || ''}</div>
          </div>
        </div>

        <div className="flex flex-col gap-[14px]">
          {/* title */}
          <div>
            <label className={labelClass}>楽曲名</label>
            <div className={inputBoxClass}>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full py-2.5 bg-transparent border-none text-white text-[15px] font-bold" />
            </div>
          </div>

          {/* artists */}
          <div>
            <label className={labelClass}>アーティスト（複数可）</label>
            <div className={fieldClass}>
              {artists.map((a, i) => <Chip key={a} label={a} onRemove={() => setArtists(artists.filter((_, j) => j !== i))} />)}
              <input value={artistInput} onChange={(e) => setArtistInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && artistInput.trim()) { e.preventDefault(); addArtist(artistInput); } }} placeholder="名前を入力しEnterで追加" className="flex-1 min-w-[120px] bg-transparent border-none text-white text-[13px]" />
            </div>
            {artistMatches.length > 0 && (
              <div className={suggRowClass}>
                {artistMatches.map((v) => <button key={v} onClick={() => addArtist(v)} className={suggClass()}>{v}</button>)}
              </div>
            )}
          </div>

          {/* genre */}
          <div>
            <label className={labelClass}>ジャンル</label>
            <div className="flex gap-2 mt-2">
              {GENRE_KEYS.map((k) => {
                const on = genre === k;
                return (
                  <button key={k} onClick={() => setGenre(k)} className="flex-1 flex items-center justify-center gap-[7px] px-1.5 py-2.5 rounded-[10px] cursor-pointer text-xs font-bold border" style={{ borderColor: on ? GENRES[k].color : 'rgba(255,255,255,.1)', background: on ? GENRES[k].color + '1f' : 'rgba(0,0,0,.25)', color: on ? GENRES[k].color : 'rgba(255,255,255,.5)', boxShadow: on ? '0 0 14px ' + GENRES[k].color + '44' : 'none' }}>
                    <span className="w-[7px] h-[7px] rounded-full" style={{ background: GENRES[k].color, boxShadow: '0 0 7px ' + GENRES[k].color }} />{GENRES[k].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* vocals (vocaloid only) */}
          {genre === 'vocaloid' && (
            <div>
              <label className={labelClass}>歌唱ボカロ（複数可）</label>
              <div className={fieldClass}>
                {vocals.map((v, i) => <Chip key={v} label={v} accent onRemove={() => setVocals(vocals.filter((_, j) => j !== i))} />)}
                <input value={vocalInput} onChange={(e) => setVocalInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && vocalInput.trim()) { e.preventDefault(); addVocal(vocalInput); } }} placeholder="名前を入力しEnterで追加" className="flex-1 min-w-[110px] bg-transparent border-none text-white text-xs" />
              </div>
              {quickVocals.length > 0 && (
                <div className={suggRowClass}>
                  {quickVocals.map((v) => <button key={v} onClick={() => addVocal(v)} className={suggClass()}>{v}</button>)}
                </div>
              )}
            </div>
          )}

          {/* work (anime / game) */}
          {(genre === 'anime' || genre === 'game') && (
            <div>
              <label className={labelClass}>作品名</label>
              <div className={inputBoxClass}>
                <input value={work} onChange={(e) => setWork(e.target.value)} placeholder={genre === 'game' ? '例：ゲーム「…」' : '例：TVアニメ「…」'} className="w-full py-2.5 bg-transparent border-none text-white text-[13px]" />
              </div>
              {workMatches.length > 0 && (
                <div className={suggRowClass}>
                  {workMatches.map((v) => <button key={v} onClick={() => setWork(v)} className={suggClass(work === v)}>{v}</button>)}
                </div>
              )}
            </div>
          )}

          {/* tags */}
          <div>
            <label className={labelClass}>タグ（複数可）<span className="opacity-50 text-[9px] ml-2">例：バラード 高音</span></label>
            <div className={fieldClass}>
              {tags.map((t, i) => (
                <span key={t} className="inline-flex items-center gap-[5px] pl-[9px] pr-[7px] py-1 rounded-[7px] bg-white/[.08] border border-white/[.18] text-xs">
                  {t}<button onClick={() => setTags(tags.filter((_, j) => j !== i))} className="bg-transparent border-none cursor-pointer text-white/55 text-[15px] p-0 leading-none">×</button>
                </span>
              ))}
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && tagInput.trim()) { e.preventDefault(); addTag(tagInput); } }} placeholder="タグを入力しEnterで追加" className="flex-1 min-w-[110px] bg-transparent border-none text-white text-xs" />
            </div>
            {quickTags.length > 0 && (
              <div className={suggRowClass}>
                {quickTags.map((v) => <button key={v} onClick={() => addTag(v)} className={suggClass()}>{v}</button>)}
              </div>
            )}
          </div>

          {/* rating */}
          <div>
            <label className={labelClass}>歌える度</label>
            <div className="flex items-center gap-0.5 mt-2">
              {[1, 2, 3, 4, 5].map((n) => {
                const filled = rating !== null && n <= rating;
                return <button key={n} onClick={() => setRating(n === rating ? null : n)} className="bg-transparent border-none cursor-pointer text-[28px] px-1 leading-none" style={{ color: filled ? 'var(--accent)' : 'rgba(255,255,255,.15)' }}>★</button>;
              })}
              {rating !== null
                ? <button onClick={() => setRating(null)} className="bg-transparent border-none cursor-pointer text-[11px] text-white/40 ml-1.5">クリア</button>
                : <span className="text-xs text-white/30 ml-2">（未評価）</span>}
            </div>
          </div>

          {/* actions */}
          <div className="flex gap-2.5 mt-1">
            <button onClick={() => backStep(2)} className="px-[22px] py-[13px] rounded-[11px] bg-transparent border border-white/15 text-white/70 font-bold text-[13px] cursor-pointer">← 候補に戻る</button>
            <button onClick={onSave} className="flex-1 p-[13px] rounded-[11px] border-none cursor-pointer font-bold text-sm text-[#06070f] bg-[linear-gradient(135deg,var(--accent),var(--accent3))] shadow-[0_0_22px_var(--glow)]">VAULT に登録</button>
          </div>
        </div>
      </div>
    </div>
  );
}
