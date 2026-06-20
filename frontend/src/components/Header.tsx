import { useStore } from '../store';
import { useIsMobile } from '../hooks';
import type { Screen } from '../types';

export function Header() {
  const { screen, songs, favs, lists, activeList, favOnly, toggleSidebar } = useStore();
  const isMobile = useIsMobile();

  const total = songs.length;
  const favCount = Object.values(favs).filter(Boolean).length;
  const activeListObj = lists.find((l) => l.id === activeList) || null;

  const hs: Record<Screen, { en: string; title: string; desc: string }> = {
    library: { en: '// LIBRARY', title: 'ライブラリ', desc: total + ' TRACKS ARCHIVED' },
    register: { en: '// REGISTER', title: '楽曲を登録', desc: 'YOUTUBE → VAULT' },
    lists: { en: '// PLAYLISTS', title: activeListObj ? activeListObj.name : 'マイリスト', desc: activeListObj ? activeListObj.songIds.length + ' TRACKS' : lists.length + ' LISTS' },
    favorites: { en: '// FAVORITES', title: 'お気に入り', desc: favCount + ' FAVORITED' },
    users: { en: '// USERS', title: '登録ユーザー', desc: 'MEMBER DIRECTORY' },
    stats: { en: '// ANALYTICS', title: '統計ダッシュボード', desc: 'VAULT INSIGHTS' },
  };
  const h = screen === 'library' && favOnly
    ? { en: '// FAVORITES', title: 'お気に入り', desc: favCount + ' FAVORITED' }
    : hs[screen];

  return (
    <header className={`shrink-0 flex items-center justify-between gap-3 border-b border-white/[.06] ${isMobile ? 'px-4 pt-4 pb-[14px]' : 'px-[34px] pt-[26px] pb-5'}`}>
      <div className="flex items-center gap-3 min-w-0">
        {isMobile && (
          <button
            onClick={toggleSidebar}
            className="shrink-0 bg-transparent border-none cursor-pointer text-white/70 p-1.5 rounded-lg leading-none"
            aria-label="メニューを開く"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
        <div className="min-w-0">
          <div className={`font-['Share_Tech_Mono',monospace] text-[10px] tracking-[3px] text-accent ${isMobile ? 'mb-[3px]' : 'mb-1.5'}`}>{h.en}</div>
          <h1 className={`m-0 font-black tracking-[0.5px] whitespace-nowrap overflow-hidden text-ellipsis ${isMobile ? 'text-xl' : 'text-[27px]'}`}>{h.title}</h1>
        </div>
      </div>
      {!isMobile && (
        <div className="font-['Share_Tech_Mono',monospace] text-[11px] text-white/40 text-right leading-[1.7] shrink-0">
          <div><span className="inline-block w-[7px] h-[7px] rounded-full bg-accent shadow-[0_0_8px_var(--accent)] mr-1.5 animate-[vvBlink_1.6s_ease-in-out_infinite]" />SYNCED · LOCAL VAULT</div>
          <div className="opacity-60">{h.desc}</div>
        </div>
      )}
    </header>
  );
}
