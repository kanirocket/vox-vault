import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { SearchIcon, PlayIcon } from '../icons';
import { RegisterForm } from './RegisterForm';

function Stepper({ step }: { step: number }) {
  const cur = Math.min(step, 3);
  const defs = [
    { n: 1, label: '検索', en: 'SEARCH' },
    { n: 2, label: '候補を選択', en: 'SELECT' },
    { n: 3, label: '確認・登録', en: 'CONFIRM' },
  ];
  return (
    <div className="flex items-center mt-1.5 mb-[30px]">
      {defs.map((s) => {
        const done = s.n < cur;
        const active = s.n === cur;
        return (
          <div key={s.n} className="flex items-center flex-1">
            <div className="w-[34px] h-[34px] rounded-full grid place-items-center shrink-0 font-['Orbitron',sans-serif] font-bold text-sm" style={{ color: done || active ? '#06070f' : 'rgba(255,255,255,.5)', background: done || active ? 'linear-gradient(135deg,var(--accent),var(--accent3))' : 'rgba(255,255,255,.06)', border: done || active ? 'none' : '1px solid rgba(255,255,255,.12)', boxShadow: active ? '0 0 18px var(--glow)' : 'none' }}>{done ? '✓' : s.n}</div>
            <div className="ml-[11px] leading-tight">
              <div className="text-[13px] font-bold" style={{ color: done || active ? '#fff' : 'rgba(255,255,255,.5)' }}>{s.label}</div>
              <div className="font-['Share_Tech_Mono',monospace] text-[9px] tracking-[1px] text-white/35">{s.en}</div>
            </div>
            <div className={`flex-1 h-0.5 mx-[14px] rounded-sm ${s.n === 3 ? 'hidden' : 'block'}`} style={{ background: done ? 'linear-gradient(90deg,var(--accent),var(--accent3))' : 'rgba(255,255,255,.08)' }} />
          </div>
        );
      })}
    </div>
  );
}

function Step1() {
  const startSearch = useStore((s) => s.startSearch);
  const [query, setQuery] = useState('');
  const [suggests, setSuggests] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const skipFetch = useRef(false); // suppress refetch right after picking a suggestion

  const go = (q?: string) => { setOpen(false); startSearch(q ?? query); };
  const pick = (s: string) => { skipFetch.current = true; setQuery(s); setSuggests([]); setOpen(false); setActive(-1); go(s); };

  // debounced suggestion fetch
  useEffect(() => {
    if (skipFetch.current) { skipFetch.current = false; return; }
    const q = query.trim();
    if (!q) { setSuggests([]); setOpen(false); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await api<{ suggestions: string[] }>(`/youtube/suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        setSuggests(r.suggestions || []);
        setOpen((r.suggestions || []).length > 0);
        setActive(-1);
      } catch { /* aborted or failed — keep silent */ }
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query]);

  // close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    if (open && suggests.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % suggests.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? suggests.length - 1 : a - 1)); return; }
      if (e.key === 'Enter') { e.preventDefault(); if (active >= 0) pick(suggests[active]); else go(); return; }
      if (e.key === 'Escape') { setOpen(false); return; }
    } else if (e.key === 'Enter') { go(); }
  };

  return (
    <div className="rounded-[18px] bg-white/[.03] border border-white/[.08] backdrop-blur-lg px-10 pt-[42px] pb-[46px] text-center animate-[vvFade_180ms_ease]">
      <div className="w-[58px] h-[58px] rounded-[15px] mx-auto mb-5 grid place-items-center bg-[linear-gradient(135deg,var(--accent),var(--accent3))] shadow-[0_0_30px_var(--glow)]"><SearchIcon size={28} stroke="#06070f" /></div>
      <h2 className="mt-0 mb-2 text-[21px] font-black">楽曲を検索して登録</h2>
      <p className="mt-0 mb-[26px] text-[13px] text-white/50 leading-[1.7]">曲名を入力すると YouTube から候補を取得します。<br />サムネイル・アーティスト・投稿日は自動で取り込まれます。</p>
      <div className="flex gap-2.5 max-w-[560px] mx-auto">
        <div ref={boxRef} className="flex-1 relative">
          <div className="flex items-center gap-[11px] px-[18px] py-[14px] rounded-xl bg-black/35 border border-[color:var(--accent)] shadow-[0_0_24px_var(--glow)]">
            <SearchIcon size={18} stroke="var(--accent)" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKey} onFocus={() => suggests.length && setOpen(true)} placeholder="例：グリッチ・ハート" autoComplete="off" className="flex-1 bg-transparent border-none text-white text-[15px]" />
          </div>
          {open && suggests.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-30 rounded-xl overflow-hidden bg-[rgba(14,16,26,.98)] border border-white/12 shadow-[0_12px_34px_rgba(0,0,0,.55)] text-left animate-[vvPop_120ms_ease]">
              {suggests.map((s, i) => (
                <button key={s} onMouseEnter={() => setActive(i)} onClick={() => pick(s)} className={`flex items-center gap-3 w-full px-4 py-[11px] border-none cursor-pointer text-white text-sm text-left ${i ? 'border-t border-white/[.04]' : ''} ${i === active ? 'bg-white/[.07]' : 'bg-transparent'}`}>
                  <SearchIcon size={14} stroke="rgba(255,255,255,.4)" />
                  <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{s}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => go()} className="px-7 rounded-xl border-none cursor-pointer font-bold text-sm text-[#06070f] bg-[linear-gradient(135deg,var(--accent),var(--accent3))] shadow-[0_0_22px_var(--glow)]">検索</button>
      </div>
      <div className="font-['Share_Tech_Mono',monospace] text-[10px] text-white/30 mt-[18px] tracking-[1px]">YOUTUBE DATA API · v3</div>
    </div>
  );
}

// Extract a YouTube video id from a watch / youtu.be / embed URL.
function ytId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function Step2() {
  const { regCandidates, regLoading, regSource, backStep, selectCand, songs } = useStore();
  const qShown = 'グリッチ・ハート';
  // video ids already in the library
  const registered = new Map<string, string>(); // videoId -> registered title
  for (const s of songs) {
    const id = ytId(s.url);
    if (id) registered.set(id, s.title);
  }
  return (
    <div className="animate-[vvFade_180ms_ease]">
      <div className="flex justify-between items-center mb-[14px]">
        <div className="font-['Share_Tech_Mono',monospace] text-[11px] text-white/50">{regSource === 'youtube' ? 'YOUTUBE RESULTS' : 'SEARCH RESULTS'}</div>
        <button onClick={() => backStep(1)} className="bg-transparent border border-white/15 text-white/60 rounded-lg px-[14px] py-[7px] text-xs cursor-pointer">← 検索に戻る</button>
      </div>
      {!regLoading && regSource === 'mock' && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-[10px] bg-[rgba(255,200,0,.07)] border border-[rgba(255,200,0,.25)] mb-[14px]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffd24a" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span className="font-['Share_Tech_Mono',monospace] text-[10px] text-[#ffd24a] tracking-[0.5px]">DEMO MODE — YouTube API キー未設定。以下はサンプル候補です。実際のYouTube検索結果ではありません。</span>
        </div>
      )}
      <div className="flex flex-col gap-2.5">
        {regLoading ? (
          <div className="p-10 text-center text-white/40 font-['Share_Tech_Mono',monospace] text-xs">SEARCHING…</div>
        ) : regCandidates.length > 0 ? (
          regCandidates.map((c, i) => {
            const color = c.thumbColor || '#38e8ff';
            const thumbBg = c.thumb
              ? { backgroundImage: `url('${c.thumb}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { background: `radial-gradient(130% 150% at 16% -10%,${color}88,transparent 56%),linear-gradient(135deg,#0b1126,#06070f)` };
            const vid = c.videoId || ytId(c.url);
            const isReg = vid != null && registered.has(vid);
            return (
              <button key={c.videoId || c.title + i} onClick={() => !isReg && selectCand(c)} disabled={isReg} data-hover={isReg ? undefined : 'cand'} title={isReg ? 'すでにライブラリに登録済みです' : undefined} className="grid items-center gap-4 text-left p-[11px] rounded-[14px] bg-white/[.03] border border-white/[.08] transition-all" style={{ gridTemplateColumns: '148px 1fr auto', cursor: isReg ? 'not-allowed' : 'pointer', opacity: isReg ? 0.45 : 1, filter: isReg ? 'grayscale(1)' : 'none' }}>
                <div className="relative w-[148px] h-[84px] rounded-[9px] overflow-hidden border border-white/10">
                  <div className="absolute inset-0" style={thumbBg} />
                  <div className="absolute inset-0 grid place-items-center"><PlayIcon size={22} /></div>
                  <span className="absolute right-[5px] bottom-1 font-['Share_Tech_Mono',monospace] text-[10px] px-[5px] py-px rounded-[3px] bg-black/75">{c.dur}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[15px] font-bold whitespace-nowrap overflow-hidden text-ellipsis">{c.title}</span>
                    {isReg && <span className="shrink-0 font-['Share_Tech_Mono',monospace] text-[10px] font-bold tracking-[0.5px] text-[#ffd24a] bg-[rgba(255,200,0,.12)] border border-[rgba(255,200,0,.4)] rounded-[5px] px-[7px] py-0.5">登録済み</span>}
                  </div>
                  <div className="text-xs text-white/55 mt-[3px]">{c.channel}</div>
                  <div className="font-['Share_Tech_Mono',monospace] text-[11px] text-white/40 mt-[5px]">{c.views} 回視聴 · {c.published}</div>
                </div>
                <div className="px-2 flex items-center gap-[7px] font-['Share_Tech_Mono',monospace] text-[11px]" style={{ color: isReg ? 'rgba(255,255,255,.4)' : 'var(--accent)' }}>{isReg ? '登録済み' : <>選択<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 6 15 12 9 18" /></svg></>}</div>
              </button>
            );
          })
        ) : (
          <div className="p-10 text-center">
            <div className="text-white/40 font-['Share_Tech_Mono',monospace] text-xs mb-3">NO RESULTS</div>
            <div className="text-white/30 text-xs">「{qShown}」に該当する曲が見つかりませんでした。<br />別の検索語をお試しください。</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Step4() {
  const { regSelected, resetReg, setScreen } = useStore();
  return (
    <div className="rounded-[18px] bg-white/[.03] border border-[color:var(--accent)] backdrop-blur-lg px-10 py-12 text-center shadow-[0_0_40px_var(--glow)] animate-[vvPop_220ms_ease]">
      <div className="w-16 h-16 rounded-full mx-auto mb-[22px] grid place-items-center bg-[linear-gradient(135deg,var(--accent),var(--accent3))] shadow-[0_0_34px_var(--glow)]"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#06070f" strokeWidth="3" strokeLinecap="round"><polyline points="4 12 10 18 20 6" /></svg></div>
      <h2 className="mt-0 mb-2 text-[21px] font-black">登録が完了しました</h2>
      <p className="mt-0 mb-7 text-sm text-white/60">「{regSelected?.title || ''}」を VAULT に追加しました。</p>
      <div className="flex gap-2.5 justify-center">
        <button onClick={resetReg} className="px-[26px] py-[13px] rounded-[11px] border border-white/[.18] bg-transparent text-white font-bold text-[13px] cursor-pointer">続けて登録</button>
        <button onClick={() => setScreen('library')} className="px-[26px] py-[13px] rounded-[11px] border-none cursor-pointer font-bold text-[13px] text-[#06070f] bg-[linear-gradient(135deg,var(--accent),var(--accent3))] shadow-[0_0_22px_var(--glow)]">ライブラリで確認</button>
      </div>
    </div>
  );
}

export function Register() {
  const regStep = useStore((s) => s.regStep);
  return (
    <div className="max-w-[880px] mx-auto animate-[vvFade_200ms_ease]">
      <Stepper step={regStep} />
      {regStep === 1 && <Step1 />}
      {regStep === 2 && <Step2 />}
      {regStep === 3 && <RegisterForm />}
      {regStep === 4 && <Step4 />}
    </div>
  );
}
