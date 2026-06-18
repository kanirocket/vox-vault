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
    <div style={{ display: 'flex', alignItems: 'center', margin: '6px 0 30px' }}>
      {defs.map((s) => {
        const done = s.n < cur;
        const active = s.n === cur;
        return (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 14, color: done || active ? '#06070f' : 'rgba(255,255,255,.5)', background: done || active ? 'linear-gradient(135deg,var(--accent),var(--accent3))' : 'rgba(255,255,255,.06)', border: done || active ? 'none' : '1px solid rgba(255,255,255,.12)', boxShadow: active ? '0 0 18px var(--glow)' : 'none' }}>{done ? '✓' : s.n}</div>
            <div style={{ marginLeft: 11, lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: done || active ? '#fff' : 'rgba(255,255,255,.5)' }}>{s.label}</div>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: 1, color: 'rgba(255,255,255,.35)' }}>{s.en}</div>
            </div>
            <div style={{ flex: 1, height: 2, margin: '0 14px', borderRadius: 2, background: done ? 'linear-gradient(90deg,var(--accent),var(--accent3))' : 'rgba(255,255,255,.08)', display: s.n === 3 ? 'none' : 'block' }} />
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
    <div style={{ borderRadius: 18, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(18px)', padding: '42px 40px 46px', textAlign: 'center', animation: 'vvFade 180ms ease' }}>
      <div style={{ width: 58, height: 58, borderRadius: 15, margin: '0 auto 20px', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg,var(--accent),var(--accent3))', boxShadow: '0 0 30px var(--glow)' }}><SearchIcon size={28} stroke="#06070f" /></div>
      <h2 style={{ margin: '0 0 8px', fontSize: 21, fontWeight: 900 }}>楽曲を検索して登録</h2>
      <p style={{ margin: '0 0 26px', fontSize: 13, color: 'rgba(255,255,255,.5)', lineHeight: 1.7 }}>曲名を入力すると YouTube から候補を取得します。<br />サムネイル・アーティスト・投稿日は自動で取り込まれます。</p>
      <div style={{ display: 'flex', gap: 10, maxWidth: 560, margin: '0 auto' }}>
        <div ref={boxRef} style={{ flex: 1, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 18px', borderRadius: 12, background: 'rgba(0,0,0,.35)', border: '1px solid var(--accent)', boxShadow: '0 0 24px var(--glow)' }}>
            <SearchIcon size={18} stroke="var(--accent)" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKey} onFocus={() => suggests.length && setOpen(true)} placeholder="例：グリッチ・ハート" autoComplete="off" style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: 15 }} />
          </div>
          {open && suggests.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, zIndex: 30, borderRadius: 12, overflow: 'hidden', background: 'rgba(14,16,26,.98)', border: '1px solid rgba(255,255,255,.12)', boxShadow: '0 12px 34px rgba(0,0,0,.55)', textAlign: 'left', animation: 'vvPop 120ms ease' }}>
              {suggests.map((s, i) => (
                <button key={s} onMouseEnter={() => setActive(i)} onClick={() => pick(s)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 16px', background: i === active ? 'rgba(255,255,255,.07)' : 'none', border: 'none', borderTop: i ? '1px solid rgba(255,255,255,.04)' : 'none', cursor: 'pointer', color: '#fff', fontFamily: 'inherit', fontSize: 14, textAlign: 'left' }}>
                  <SearchIcon size={14} stroke="rgba(255,255,255,.4)" />
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => go()} style={{ padding: '0 28px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#06070f', background: 'linear-gradient(135deg,var(--accent),var(--accent3))', boxShadow: '0 0 22px var(--glow)' }}>検索</button>
      </div>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 18, letterSpacing: 1 }}>YOUTUBE DATA API · v3</div>
    </div>
  );
}

function Step2() {
  const { regCandidates, regLoading, regSource, backStep, selectCand } = useStore();
  const qShown = 'グリッチ・ハート';
  return (
    <div style={{ animation: 'vvFade 180ms ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: 'rgba(255,255,255,.5)' }}>{regSource === 'youtube' ? 'YOUTUBE RESULTS' : 'SEARCH RESULTS'}</div>
        <button onClick={() => backStep(1)} style={{ background: 'none', border: '1px solid rgba(255,255,255,.15)', color: 'rgba(255,255,255,.6)', borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>← 検索に戻る</button>
      </div>
      {!regLoading && regSource === 'mock' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10, background: 'rgba(255,200,0,.07)', border: '1px solid rgba(255,200,0,.25)', marginBottom: 14 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffd24a" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#ffd24a', letterSpacing: 0.5 }}>DEMO MODE — YouTube API キー未設定。以下はサンプル候補です。実際のYouTube検索結果ではありません。</span>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {regLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,.4)', fontFamily: "'Share Tech Mono',monospace", fontSize: 12 }}>SEARCHING…</div>
        ) : regCandidates.length > 0 ? (
          regCandidates.map((c, i) => {
            const color = c.thumbColor || '#38e8ff';
            const thumbBg = c.thumb
              ? { backgroundImage: `url('${c.thumb}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { background: `radial-gradient(130% 150% at 16% -10%,${color}88,transparent 56%),linear-gradient(135deg,#0b1126,#06070f)` };
            return (
              <button key={c.videoId || c.title + i} onClick={() => selectCand(c)} data-hover="cand" style={{ display: 'grid', gridTemplateColumns: '148px 1fr auto', alignItems: 'center', gap: 16, textAlign: 'left', padding: 11, borderRadius: 14, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', cursor: 'pointer', transition: 'all .15s' }}>
                <div style={{ position: 'relative', width: 148, height: 84, borderRadius: 9, overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)' }}>
                  <div style={{ position: 'absolute', inset: 0, ...thumbBg }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}><PlayIcon size={22} /></div>
                  <span style={{ position: 'absolute', right: 5, bottom: 4, fontFamily: "'Share Tech Mono',monospace", fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'rgba(0,0,0,.75)' }}>{c.dur}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginTop: 3 }}>{c.channel}</div>
                  <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 5 }}>{c.views} 回視聴 · {c.published}</div>
                </div>
                <div style={{ padding: '0 8px', display: 'flex', alignItems: 'center', gap: 7, color: 'var(--accent)', fontFamily: "'Share Tech Mono',monospace", fontSize: 11 }}>選択<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 6 15 12 9 18" /></svg></div>
              </button>
            );
          })
        ) : (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,.4)', fontFamily: "'Share Tech Mono',monospace", fontSize: 12, marginBottom: 12 }}>NO RESULTS</div>
            <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 12 }}>「{qShown}」に該当する曲が見つかりませんでした。<br />別の検索語をお試しください。</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Step4() {
  const { regSelected, resetReg, setScreen } = useStore();
  return (
    <div style={{ borderRadius: 18, background: 'rgba(255,255,255,.03)', border: '1px solid var(--accent)', backdropFilter: 'blur(18px)', padding: '48px 40px', textAlign: 'center', boxShadow: '0 0 40px var(--glow)', animation: 'vvPop 220ms ease' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 22px', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg,var(--accent),var(--accent3))', boxShadow: '0 0 34px var(--glow)' }}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#06070f" strokeWidth="3" strokeLinecap="round"><polyline points="4 12 10 18 20 6" /></svg></div>
      <h2 style={{ margin: '0 0 8px', fontSize: 21, fontWeight: 900 }}>登録が完了しました</h2>
      <p style={{ margin: '0 0 28px', fontSize: 14, color: 'rgba(255,255,255,.6)' }}>「{regSelected?.title || ''}」を VAULT に追加しました。</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={resetReg} style={{ padding: '13px 26px', borderRadius: 11, border: '1px solid rgba(255,255,255,.18)', background: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>続けて登録</button>
        <button onClick={() => setScreen('library')} style={{ padding: '13px 26px', borderRadius: 11, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#06070f', background: 'linear-gradient(135deg,var(--accent),var(--accent3))', boxShadow: '0 0 22px var(--glow)' }}>ライブラリで確認</button>
      </div>
    </div>
  );
}

export function Register() {
  const regStep = useStore((s) => s.regStep);
  return (
    <div style={{ maxWidth: 880, margin: '0 auto', animation: 'vvFade 200ms ease' }}>
      <Stepper step={regStep} />
      {regStep === 1 && <Step1 />}
      {regStep === 2 && <Step2 />}
      {regStep === 3 && <RegisterForm />}
      {regStep === 4 && <Step4 />}
    </div>
  );
}
