import type { ReactNode } from 'react';
import { useStore } from '../store';
import { useIsMobile } from '../hooks';
import { THEME_DEFS } from '../constants';
import type { Screen, Theme } from '../types';

const navBtnClass = (on: boolean) =>
  'flex items-center gap-[13px] w-full pl-4 pr-[14px] py-[11px] rounded-r-[11px] cursor-pointer text-left mb-0.5 transition-all border-0 border-l-2 ' +
  (on
    ? 'bg-white/[.06] border-accent text-white shadow-[inset_0_0_36px_var(--glow)]'
    : 'bg-transparent border-transparent text-white/50');

const NAV: { key: Screen; jp: string; en: string; icon: ReactNode; adminOnly?: boolean }[] = [
  { key: 'library', jp: 'ライブラリ', en: 'LIBRARY', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg> },
  { key: 'register', jp: '楽曲を登録', en: 'REGISTER', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg> },
  { key: 'lists', jp: 'マイリスト', en: 'PLAYLISTS', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6h13M3 12h13M3 18h9" /><path d="M19 9v9l4-2.2" /></svg> },
  { key: 'favorites', jp: 'お気に入り', en: 'FAVORITES', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polygon points="12 2.5 15.1 9 22 9.7 16.8 14.4 18.3 21 12 17.4 5.7 21 7.2 14.4 2 9.7 8.9 9" /></svg> },
  { key: 'users', jp: '登録ユーザー', en: 'USERS', adminOnly: true, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
  { key: 'stats', jp: '統計', en: 'ANALYTICS', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" /><rect x="13" y="7" width="3" height="10" /></svg> },
];

export function Sidebar() {
  const { songs, favs, theme, screen, favOnly, sidebarOpen, user, setScreen, setTheme, closeSidebar, showFavorites, logout } = useStore();
  const isMobile = useIsMobile();

  const total = songs.length;
  const favCount = Object.values(favs).filter(Boolean).length;
  const totalPlays = songs.reduce((a, s) => a + s.plays, 0);

  const handleNav = (key: Screen) => {
    if (key === 'favorites') { showFavorites(); }
    else { setScreen(key); }
    if (isMobile) closeSidebar();
  };

  // favorites is now a library filter, not a separate screen
  const isActive = (key: Screen) =>
    key === 'favorites' ? screen === 'library' && favOnly : screen === key && !(key === 'library' && favOnly);

  const baseClass = 'h-screen flex flex-col pt-[26px] px-4 pb-[18px] bg-[rgba(10,12,24,.92)] backdrop-blur-[22px] border-r border-white/[.07]';
  const sidebarClass = isMobile
    ? `${baseClass} fixed top-0 left-0 bottom-0 z-[200] w-[272px] transition-transform duration-[280ms] ease-[cubic-bezier(.4,0,.2,1)] ${sidebarOpen ? 'translate-x-0 shadow-[4px_0_32px_rgba(0,0,0,.6)]' : '-translate-x-full'}`
    : `${baseClass} relative z-[5] w-[248px] shrink-0`;

  return (
    <aside className={sidebarClass}>
      <div className="flex items-center gap-[11px] px-1.5 pb-[26px]">
        <div className="w-[38px] h-[38px] rounded-[10px] shrink-0 grid place-items-center bg-[linear-gradient(135deg,var(--accent),var(--accent3))] shadow-[0_0_22px_var(--glow)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06070f" strokeWidth="2.4" strokeLinecap="round"><path d="M12 3v12" /><circle cx="9" cy="17" r="3" /><path d="M12 3l7 2v4" /></svg>
        </div>
        <div className="flex-1">
          <div className="font-['Orbitron',sans-serif] font-black text-base tracking-[1px] leading-none">VOX<span className="text-accent">//</span>VAULT</div>
          <div className="font-['Share_Tech_Mono',monospace] text-[9px] tracking-[2.5px] text-white/40 mt-1">KARAOKE ARCHIVE</div>
        </div>
        {isMobile && (
          <button onClick={closeSidebar} className="bg-transparent border-none cursor-pointer text-white/50 p-1.5 rounded-[7px] leading-none">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        )}
      </div>
      <div className="font-['Share_Tech_Mono',monospace] text-[9px] tracking-[2px] text-white/30 px-3 pb-2">// NAVIGATION</div>
      <nav className="flex flex-col gap-0.5">
        {NAV.filter((n) => !n.adminOnly || user?.isAdmin).map((n) => (
          <button key={n.key} className={navBtnClass(isActive(n.key))} onClick={() => handleNav(n.key)}>
            {n.icon}
            <div>
              <div className="text-[13px] font-bold">{n.jp}</div>
              <div className="font-['Share_Tech_Mono',monospace] text-[9px] tracking-[1.5px] opacity-55">{n.en}</div>
            </div>
          </button>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-[14px]">
        <div className="p-[14px] rounded-xl bg-white/[.03] border border-white/[.06]">
          <div className="flex justify-between items-baseline">
            <span className="font-['Share_Tech_Mono',monospace] text-[9px] tracking-[1.5px] text-white/40">ARCHIVE</span>
            <span className="font-['Orbitron',sans-serif] font-bold text-lg text-accent">{total}</span>
          </div>
          <div className="h-[5px] rounded bg-white/[.07] mt-2 overflow-hidden">
            <div className="h-full rounded bg-[linear-gradient(90deg,var(--accent3),var(--accent))] shadow-[0_0_10px_var(--glow)]" style={{ width: Math.min(total / 30, 1) * 100 + '%' }} />
          </div>
          <div className="font-['Share_Tech_Mono',monospace] text-[9px] text-white/35 mt-[7px]">{favCount} FAV · {totalPlays} SINGS</div>
        </div>
        <div>
          <div className="font-['Share_Tech_Mono',monospace] text-[9px] tracking-[2px] text-white/30 px-1 pb-[7px]">// THEME</div>
          <div className="flex gap-1.5">
            {(Object.keys(THEME_DEFS) as Theme[]).map((k) => {
              const on = theme === k;
              const d = THEME_DEFS[k];
              return (
                <button key={k} onClick={() => setTheme(k)} className="flex-1 py-[9px] rounded-[9px] cursor-pointer font-['Share_Tech_Mono',monospace] text-[11px] tracking-[1px] text-center border" style={{ borderColor: on ? d.c : 'rgba(255,255,255,.1)', background: on ? d.c + '1f' : 'transparent', color: on ? '#fff' : 'rgba(255,255,255,.45)', boxShadow: on ? '0 0 16px ' + d.c + '55' : 'none' }}>{d.l}</button>
              );
            })}
          </div>
        </div>
        {user && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[.03] border border-white/[.06]">
            {user.picture
              ? <img src={user.picture} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full shrink-0" />
              : <div className="w-8 h-8 rounded-full shrink-0 grid place-items-center bg-[linear-gradient(135deg,var(--accent),var(--accent3))] text-[#06070f] font-black">{(user.name || user.email || '?').slice(0, 1).toUpperCase()}</div>}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold whitespace-nowrap overflow-hidden text-ellipsis">{user.name || 'ゲスト'}{user.isAdmin && <span className="ml-1.5 font-['Share_Tech_Mono',monospace] text-[8px] text-accent border border-[color:var(--accent)] rounded px-1 py-px">ADMIN</span>}</div>
              <div className="text-[10px] text-white/40 whitespace-nowrap overflow-hidden text-ellipsis">{user.email}</div>
            </div>
            <button onClick={logout} title="ログアウト" className="shrink-0 bg-transparent border-none cursor-pointer text-white/45 p-1.5 rounded-[7px] leading-none">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
