import { useStore } from '../store';
import { GENRE_KEYS, GENRES } from '../constants';
import { singCount } from '../utils';
import type { Genre } from '../types';
import { UserAdmin } from './UserAdmin';

const panelBase = 'rounded-2xl bg-white/[.03] border border-white/[.08] backdrop-blur-md';
const panelClass = `${panelBase} p-[22px]`;
const panelTight = `${panelBase} px-[22px] py-5`;
const capClass = "font-['Share_Tech_Mono',monospace] text-[11px] tracking-[2px] text-white/45 mb-1.5";

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
      <div key={i} title={`${mm}/${dd}  ${cnt}回`} className="h-[14px] rounded-[3px]" style={{ background: cnt > 0 ? `rgba(${acRgb},${(0.15 + pct * 0.82).toFixed(2)})` : 'rgba(255,255,255,.06)', boxShadow: cnt > 0 ? `0 0 ${Math.round(pct * 8)}px rgba(${acRgb},.4)` : 'none' }} />,
    );
  }
  const heatLegend = [0, 0.25, 0.5, 0.75, 1].map((p, i) => (
    <div key={i} className="w-[18px] h-[14px] rounded-[3px] inline-block" style={{ background: p > 0 ? `rgba(${acRgb},${(0.15 + p * 0.82).toFixed(2)})` : 'rgba(255,255,255,.06)' }} />
  ));

  const topSongsMax = Math.max(1, ...songs.map(singCount));
  const topSongs = songs.slice().sort((a, b) => singCount(b) - singCount(a)).slice(0, 5).map((s) => {
    const cnt = singCount(s);
    const gc = GENRES[s.genre as Genre] || GENRES.artist;
    return (
      <div key={s.id} className="flex items-center gap-2.5 mb-3">
        <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: gc.color, boxShadow: `0 0 6px ${gc.color}` }} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold whitespace-nowrap overflow-hidden text-ellipsis mb-[5px]">{s.title}</div>
          <div className="h-[7px] rounded bg-white/[.07] overflow-hidden">
            <div className="h-full rounded" style={{ width: (cnt / topSongsMax * 100) + '%', background: `linear-gradient(90deg,${gc.color}77,${gc.color})`, boxShadow: `0 0 8px ${gc.color}44` }} />
          </div>
        </div>
        <span className="font-['Orbitron',sans-serif] font-bold text-[13px] text-accent shrink-0 min-w-[22px] text-right">{cnt}</span>
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
    <div className="animate-[vvFade_200ms_ease]">
      <div className="grid grid-cols-4 gap-4 mb-[18px]">
        {statCards.map((k) => (
          <div key={k.en} className="rounded-[15px] px-5 py-[18px] bg-white/[.03] border border-white/[.08] backdrop-blur-md relative overflow-hidden">
            <div className="absolute -right-[14px] -top-[14px] w-[70px] h-[70px] rounded-full" style={{ background: 'radial-gradient(circle,var(--glow),transparent 70%)' }} />
            <div className="font-['Share_Tech_Mono',monospace] text-[10px] tracking-[1.5px] text-white/40">{k.en}</div>
            <div className="font-['Orbitron',sans-serif] font-black text-[34px] text-white mt-2 mb-[3px] leading-none">{k.value}</div>
            <div className="text-xs text-accent">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: '1.1fr 1.4fr' }}>
        <div className={panelClass}>
          <div className={capClass}>GENRE BREAKDOWN</div>
          <div className="text-[15px] font-bold mb-[18px]">ジャンル比率</div>
          <div className="flex items-center gap-[26px]">
            <div className="relative w-[180px] h-[180px] shrink-0">
              <svg viewBox="0 0 180 180" className="w-[180px] h-[180px] -rotate-90">
                <circle cx="90" cy="90" r="70" style={{ fill: 'none', stroke: 'rgba(255,255,255,.06)', strokeWidth: 18 }} />
                {donut.map((seg) => <circle key={seg.genre} cx="90" cy="90" r="70" strokeDasharray={seg.dash} strokeDashoffset={seg.offset} style={{ fill: 'none', stroke: seg.color, strokeWidth: 18 }} />)}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-['Orbitron',sans-serif] font-black text-[30px]">{total}</div>
                <div className="font-['Share_Tech_Mono',monospace] text-[9px] tracking-[1.5px] text-white/40 mt-[3px]">TRACKS</div>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-3">
              {donut.map((seg) => (
                <div key={seg.genre} className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: seg.color, boxShadow: '0 0 9px ' + seg.color }} />
                  <span className="flex-1 text-[13px]">{seg.label}</span>
                  <span className="font-['Share_Tech_Mono',monospace] text-xs text-white/50">{seg.count}曲</span>
                  <span className="font-['Orbitron',sans-serif] font-bold text-sm w-[42px] text-right" style={{ color: seg.color }}>{seg.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={panelClass}>
          <div className={capClass}>MONTHLY REGISTRATIONS</div>
          <div className="text-[15px] font-bold mb-5">月別 登録数</div>
          <div className="flex items-end gap-3 h-[172px] pb-[22px] relative">
            {months.map((m, i) => (
              <div key={m} className="flex-1 h-full flex flex-col items-center justify-end gap-2 relative">
                <span className="font-['Share_Tech_Mono',monospace] text-[11px] text-accent">{mvals[i]}</span>
                <div className="w-full min-h-[6px] rounded-t-md bg-[linear-gradient(180deg,var(--accent),var(--accent3))] shadow-[0_0_14px_var(--glow)]" style={{ height: (mvals[i] / maxM * 100) + '%' }} />
                <span className="absolute -bottom-5 font-['Share_Tech_Mono',monospace] text-[9px] text-white/40">{m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1.4fr 1.1fr' }}>
        <div className={panelClass}>
          <div className="flex justify-between items-start mb-[18px]">
            <div><div className={capClass}>CUMULATIVE GROWTH</div><div className="text-[15px] font-bold">アーカイブ累計</div></div>
            <div className="text-right"><div className="font-['Orbitron',sans-serif] font-black text-[26px] text-accent leading-none">{total}</div><div className="font-['Share_Tech_Mono',monospace] text-[9px] text-white/40">TOTAL</div></div>
          </div>
          <svg viewBox="0 0 520 160" preserveAspectRatio="none" className="w-full h-40">
            <line x1="0" y1="40" x2="520" y2="40" style={{ stroke: 'rgba(255,255,255,.05)', strokeWidth: 1 }} />
            <line x1="0" y1="80" x2="520" y2="80" style={{ stroke: 'rgba(255,255,255,.05)', strokeWidth: 1 }} />
            <line x1="0" y1="120" x2="520" y2="120" style={{ stroke: 'rgba(255,255,255,.05)', strokeWidth: 1 }} />
            <path d={areaPath} style={{ fill: 'var(--accent)', opacity: 0.13 }} />
            <path d={linePath} style={{ fill: 'none', stroke: 'var(--accent)', strokeWidth: 2.5, strokeLinejoin: 'round', filter: 'drop-shadow(0 0 6px var(--glow))' }} />
            {pts.map((p, i) => <circle key={i} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r="3.5" style={{ fill: 'var(--bg)', stroke: 'var(--accent)', strokeWidth: 2 }} />)}
          </svg>
        </div>
        <div className="flex flex-col gap-4">
          <div className={panelTight}>
            <div className={`${capClass} !mb-4`}>TOP ARTISTS</div>
            {tops.map((t) => (
              <div key={t.name} className="flex items-center gap-3 mb-[11px]">
                <span className="w-[104px] text-xs whitespace-nowrap overflow-hidden text-ellipsis shrink-0">{t.name}</span>
                <div className="flex-1 h-[9px] rounded-md bg-white/5 overflow-hidden">
                  <div className="h-full rounded-md bg-[linear-gradient(90deg,var(--accent3),var(--accent))] shadow-[0_0_12px_var(--glow)]" style={{ width: (t.count / maxA * 100) + '%' }} />
                </div>
                <span className="font-['Share_Tech_Mono',monospace] text-xs text-accent w-[18px] text-right">{t.count}</span>
              </div>
            ))}
          </div>
          <div className={`${panelTight} flex items-center gap-5`}>
            <div className="relative w-[118px] h-[118px] shrink-0">
              <svg viewBox="0 0 140 140" className="w-[118px] h-[118px] -rotate-90">
                <circle cx="70" cy="70" r="56" style={{ fill: 'none', stroke: 'rgba(255,255,255,.06)', strokeWidth: 13 }} />
                <circle cx="70" cy="70" r="56" strokeDasharray={gaugeDash} style={{ fill: 'none', stroke: 'var(--accent)', strokeWidth: 13, strokeLinecap: 'round', filter: 'drop-shadow(0 0 7px var(--glow))' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-['Orbitron',sans-serif] font-black text-2xl">{favPct}%</div>
              </div>
            </div>
            <div>
              <div className="font-['Share_Tech_Mono',monospace] text-[11px] tracking-[1.5px] text-white/45 mb-1.5">FAV RATIO</div>
              <div className="text-sm font-bold">お気に入り率</div>
              <div className="text-xs text-white/50 mt-1">{favCount} / {total} 曲</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 mt-4" style={{ gridTemplateColumns: '1.55fr 1fr' }}>
        <div className={panelClass}>
          <div className={capClass}>SING CALENDAR</div>
          <div className="flex justify-between items-baseline mb-4">
            <div className="text-[15px] font-bold">歌唱カレンダー</div>
            <div className="font-['Share_Tech_Mono',monospace] text-[10px] text-white/40">直近10週 · 70日</div>
          </div>
          <div className="grid grid-cols-7 gap-1">{heatCells}</div>
          <div className="flex items-center gap-1.5 mt-3 justify-end">
            <span className="font-['Share_Tech_Mono',monospace] text-[9px] text-white/30">少</span>{heatLegend}<span className="font-['Share_Tech_Mono',monospace] text-[9px] text-white/30">多</span>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className={panelTight}><div className={`${capClass} !mb-4`}>TOP SONGS</div>{topSongs}</div>
          <div className={panelTight}>
            <div className={capClass}>DAILY SINGS</div>
            <div className="text-sm font-bold mb-[14px]">日別歌唱推移<span className="text-[10px] font-normal text-white/40 ml-2">直近30日</span></div>
            <svg viewBox="0 0 520 90" preserveAspectRatio="none" className="w-full h-20">
              <line x1="0" y1="30" x2="520" y2="30" style={{ stroke: 'rgba(255,255,255,.05)', strokeWidth: 1 }} />
              <line x1="0" y1="60" x2="520" y2="60" style={{ stroke: 'rgba(255,255,255,.05)', strokeWidth: 1 }} />
              <path d={dailyAreaPath} style={{ fill: 'var(--accent)', opacity: 0.14 }} />
              <path d={dailyLinePath} style={{ fill: 'none', stroke: 'var(--accent)', strokeWidth: 2, strokeLinejoin: 'round', filter: 'drop-shadow(0 0 5px var(--glow))' }} />
            </svg>
          </div>
        </div>
      </div>

      <UserAdmin />
    </div>
  );
}
