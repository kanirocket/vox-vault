import { useStore } from '../store';
import { GENRE_KEYS, GENRES } from '../constants';
import { singCount } from '../utils';
import type { Genre } from '../types';

const panel: React.CSSProperties = { borderRadius: 16, padding: 22, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(16px)' };
const capLabel: React.CSSProperties = { fontFamily: "'Share Tech Mono',monospace", fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,.45)', marginBottom: 6 };

export function Stats() {
  const { songs, favs, lists, theme } = useStore();
  const total = songs.length;
  const favCount = Object.values(favs).filter(Boolean).length;

  // donut
  const counts: Record<string, number> = {};
  songs.forEach((s) => (counts[s.genre] = (counts[s.genre] || 0) + 1));
  const C = 2 * Math.PI * 70;
  let acc = 0;
  const donut = GENRE_KEYS.map((k) => {
    const pct = (counts[k] || 0) / Math.max(total, 1);
    const seg = pct * C;
    const o = { genre: k, label: GENRES[k].label, count: counts[k] || 0, pct: Math.round(pct * 100), dash: `${seg.toFixed(2)} ${(C - seg).toFixed(2)}`, offset: (-acc * C).toFixed(2), color: GENRES[k].color };
    acc += pct;
    return o;
  });

  // monthly bars (static design data, as in the prototype)
  const months = ['10', '11', '12', '01', '02', '03', '04', '05', '06'];
  const mvals = [1, 2, 1, 3, 2, 2, 3, 1, 2];
  const maxM = Math.max(...mvals);

  // cumulative area
  let run = 0;
  const cum = mvals.map((v) => (run += v));
  const W = 520, H = 160, pad = 14, maxC = cum[cum.length - 1];
  const pts = cum.map((v, i) => [pad + i * ((W - 2 * pad) / (cum.length - 1)), H - pad - (v / maxC) * (H - 2 * pad - 6)]);
  const linePath = 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
  const areaPath = linePath + ' L' + (W - pad).toFixed(1) + ' ' + (H - pad) + ' L' + pad + ' ' + (H - pad) + ' Z';

  // top artists
  const acnt: Record<string, number> = {};
  songs.forEach((s) => (acnt[s.artist] = (acnt[s.artist] || 0) + 1));
  const tops = Object.keys(acnt).map((n) => ({ name: n, count: acnt[n] })).sort((a, b) => b.count - a.count).slice(0, 5);
  const maxA = tops.length ? tops[0].count : 1;

  // fav gauge
  const Cg = 2 * Math.PI * 56;
  const favPct = Math.round((favCount / Math.max(total, 1)) * 100);
  const gaugeDash = `${((favCount / Math.max(total, 1)) * Cg).toFixed(2)} ${Cg.toFixed(2)}`;
  const totalSings = songs.reduce((a, s) => a + singCount(s), 0);

  const statCards = [
    { en: 'TRACKS', label: '登録楽曲', value: String(total) },
    { en: 'FAVORITES', label: 'お気に入り', value: String(favCount) },
    { en: 'PLAYLISTS', label: 'マイリスト', value: String(lists.length) },
    { en: 'TOTAL SINGS', label: '総歌唱回数', value: String(totalSings) },
  ];

  // sing-history
  const acRgb = ({ holo: '34,211,238', neon: '255,45,149', acid: '157,255,60' } as Record<string, string>)[theme] || '34,211,238';
  const heatCounts: Record<string, number> = {};
  songs.forEach((s) => (s.sings || []).forEach((sing) => { heatCounts[sing.date] = (heatCounts[sing.date] || 0) + 1; }));
  const heatVals = Object.values(heatCounts);
  const maxHeat = Math.max(1, ...(heatVals.length ? heatVals : [1]));
  const heatCells = [];
  for (let i = 69; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 86400000);
    const ds = dt.toISOString().slice(0, 10);
    const cnt = heatCounts[ds] || 0;
    const pct = cnt / maxHeat;
    const mm = String(dt.getMonth() + 1).padStart(2, '0'), dd = String(dt.getDate()).padStart(2, '0');
    heatCells.push(
      <div key={i} title={`${mm}/${dd}  ${cnt}回`} style={{ height: 14, borderRadius: 3, background: cnt > 0 ? `rgba(${acRgb},${(0.15 + pct * 0.82).toFixed(2)})` : 'rgba(255,255,255,.06)', boxShadow: cnt > 0 ? `0 0 ${Math.round(pct * 8)}px rgba(${acRgb},.4)` : 'none' }} />,
    );
  }
  const heatLegend = [0, 0.25, 0.5, 0.75, 1].map((p, i) => (
    <div key={i} style={{ width: 18, height: 14, borderRadius: 3, display: 'inline-block', background: p > 0 ? `rgba(${acRgb},${(0.15 + p * 0.82).toFixed(2)})` : 'rgba(255,255,255,.06)' }} />
  ));

  const topSongsMax = Math.max(1, ...songs.map(singCount));
  const topSongs = songs.slice().sort((a, b) => singCount(b) - singCount(a)).slice(0, 5).map((s) => {
    const cnt = singCount(s);
    const gc = GENRES[s.genre as Genre] || GENRES.artist;
    return (
      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: gc.color, boxShadow: `0 0 6px ${gc.color}`, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 5 }}>{s.title}</div>
          <div style={{ height: 7, borderRadius: 4, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: (cnt / topSongsMax * 100) + '%', borderRadius: 4, background: `linear-gradient(90deg,${gc.color}77,${gc.color})`, boxShadow: `0 0 8px ${gc.color}44` }} />
          </div>
        </div>
        <span style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--accent)', flexShrink: 0, minWidth: 22, textAlign: 'right' }}>{cnt}</span>
      </div>
    );
  });

  const dailyCounts: Record<string, number> = {};
  songs.forEach((s) => (s.sings || []).forEach((sing) => { dailyCounts[sing.date] = (dailyCounts[sing.date] || 0) + 1; }));
  const last30: number[] = [];
  for (let i = 29; i >= 0; i--) { const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10); last30.push(dailyCounts[d] || 0); }
  const maxDay = Math.max(1, ...last30);
  const DW = 520, DH = 90, Dp = 8;
  const dpts = last30.map((v, i) => [Dp + i * ((DW - 2 * Dp) / 29), DH - Dp - (v / maxDay) * (DH - 2 * Dp)]);
  const dailyLinePath = 'M' + dpts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
  const dailyAreaPath = dailyLinePath + ` L${(DW - Dp).toFixed(1)} ${DH - Dp} L${Dp} ${DH - Dp} Z`;

  return (
    <div style={{ animation: 'vvFade 200ms ease' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 18 }}>
        {statCards.map((k) => (
          <div key={k.en} style={{ borderRadius: 15, padding: '18px 20px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(16px)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -14, top: -14, width: 70, height: 70, borderRadius: '50%', background: 'radial-gradient(circle,var(--glow),transparent 70%)' }} />
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, letterSpacing: 1.5, color: 'rgba(255,255,255,.4)' }}>{k.en}</div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 34, color: '#fff', margin: '8px 0 3px', lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: 'var(--accent)' }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.4fr', gap: 16, marginBottom: 16 }}>
        <div style={panel}>
          <div style={capLabel}>GENRE BREAKDOWN</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>ジャンル比率</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
            <div style={{ position: 'relative', width: 180, height: 180, flexShrink: 0 }}>
              <svg viewBox="0 0 180 180" style={{ width: 180, height: 180, transform: 'rotate(-90deg)' }}>
                <circle cx="90" cy="90" r="70" style={{ fill: 'none', stroke: 'rgba(255,255,255,.06)', strokeWidth: 18 }} />
                {donut.map((seg) => <circle key={seg.genre} cx="90" cy="90" r="70" strokeDasharray={seg.dash} strokeDashoffset={seg.offset} style={{ fill: 'none', stroke: seg.color, strokeWidth: 18 }} />)}
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 30 }}>{total}</div>
                <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: 1.5, color: 'rgba(255,255,255,.4)', marginTop: 3 }}>TRACKS</div>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {donut.map((seg) => (
                <div key={seg.genre} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, boxShadow: '0 0 9px ' + seg.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13 }}>{seg.label}</span>
                  <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 12, color: 'rgba(255,255,255,.5)' }}>{seg.count}曲</span>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 14, width: 42, textAlign: 'right', color: seg.color }}>{seg.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={panel}>
          <div style={capLabel}>MONTHLY REGISTRATIONS</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>月別 登録数</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 172, paddingBottom: 22, position: 'relative' }}>
            {months.map((m, i) => (
              <div key={m} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 8, position: 'relative' }}>
                <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: 'var(--accent)' }}>{mvals[i]}</span>
                <div style={{ width: '100%', height: (mvals[i] / maxM * 100) + '%', minHeight: 6, borderRadius: '6px 6px 0 0', background: 'linear-gradient(180deg,var(--accent),var(--accent3))', boxShadow: '0 0 14px var(--glow)' }} />
                <span style={{ position: 'absolute', bottom: -20, fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,.4)' }}>{m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr', gap: 16 }}>
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
            <div><div style={capLabel}>CUMULATIVE GROWTH</div><div style={{ fontSize: 15, fontWeight: 700 }}>アーカイブ累計</div></div>
            <div style={{ textAlign: 'right' }}><div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 26, color: 'var(--accent)', lineHeight: 1 }}>{total}</div><div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,.4)' }}>TOTAL</div></div>
          </div>
          <svg viewBox="0 0 520 160" preserveAspectRatio="none" style={{ width: '100%', height: 160 }}>
            <line x1="0" y1="40" x2="520" y2="40" style={{ stroke: 'rgba(255,255,255,.05)', strokeWidth: 1 }} />
            <line x1="0" y1="80" x2="520" y2="80" style={{ stroke: 'rgba(255,255,255,.05)', strokeWidth: 1 }} />
            <line x1="0" y1="120" x2="520" y2="120" style={{ stroke: 'rgba(255,255,255,.05)', strokeWidth: 1 }} />
            <path d={areaPath} style={{ fill: 'var(--accent)', opacity: 0.13 }} />
            <path d={linePath} style={{ fill: 'none', stroke: 'var(--accent)', strokeWidth: 2.5, strokeLinejoin: 'round', filter: 'drop-shadow(0 0 6px var(--glow))' }} />
            {pts.map((p, i) => <circle key={i} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r="3.5" style={{ fill: 'var(--bg)', stroke: 'var(--accent)', strokeWidth: 2 }} />)}
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...panel, padding: '20px 22px' }}>
            <div style={{ ...capLabel, marginBottom: 16 }}>TOP ARTISTS</div>
            {tops.map((t) => (
              <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 11 }}>
                <span style={{ width: 104, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>{t.name}</span>
                <div style={{ flex: 1, height: 9, borderRadius: 6, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: (t.count / maxA * 100) + '%', borderRadius: 6, background: 'linear-gradient(90deg,var(--accent3),var(--accent))', boxShadow: '0 0 12px var(--glow)' }} />
                </div>
                <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 12, color: 'var(--accent)', width: 18, textAlign: 'right' }}>{t.count}</span>
              </div>
            ))}
          </div>
          <div style={{ ...panel, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative', width: 118, height: 118, flexShrink: 0 }}>
              <svg viewBox="0 0 140 140" style={{ width: 118, height: 118, transform: 'rotate(-90deg)' }}>
                <circle cx="70" cy="70" r="56" style={{ fill: 'none', stroke: 'rgba(255,255,255,.06)', strokeWidth: 13 }} />
                <circle cx="70" cy="70" r="56" strokeDasharray={gaugeDash} style={{ fill: 'none', stroke: 'var(--accent)', strokeWidth: 13, strokeLinecap: 'round', filter: 'drop-shadow(0 0 7px var(--glow))' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 24 }}>{favPct}%</div>
              </div>
            </div>
            <div>
              <div style={{ ...capLabel, fontSize: 11, letterSpacing: 1.5 }}>FAV RATIO</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>お気に入り率</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>{favCount} / {total} 曲</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 16, marginTop: 16 }}>
        <div style={panel}>
          <div style={capLabel}>SING CALENDAR</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>歌唱カレンダー</div>
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,.4)' }}>直近10週 · 70日</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>{heatCells}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'flex-end' }}>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,.3)' }}>少</span>{heatLegend}<span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,.3)' }}>多</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...panel, padding: '20px 22px' }}><div style={{ ...capLabel, marginBottom: 16 }}>TOP SONGS</div>{topSongs}</div>
          <div style={{ ...panel, padding: '20px 22px' }}>
            <div style={capLabel}>DAILY SINGS</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>日別歌唱推移<span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,.4)', marginLeft: 8 }}>直近30日</span></div>
            <svg viewBox="0 0 520 90" preserveAspectRatio="none" style={{ width: '100%', height: 80 }}>
              <line x1="0" y1="30" x2="520" y2="30" style={{ stroke: 'rgba(255,255,255,.05)', strokeWidth: 1 }} />
              <line x1="0" y1="60" x2="520" y2="60" style={{ stroke: 'rgba(255,255,255,.05)', strokeWidth: 1 }} />
              <path d={dailyAreaPath} style={{ fill: 'var(--accent)', opacity: 0.14 }} />
              <path d={dailyLinePath} style={{ fill: 'none', stroke: 'var(--accent)', strokeWidth: 2, strokeLinejoin: 'round', filter: 'drop-shadow(0 0 5px var(--glow))' }} />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
