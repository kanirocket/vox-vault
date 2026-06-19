import { useEffect, type CSSProperties } from 'react';
import { useStore } from './store';
import { useIsMobile } from './hooks';
import { THEMES } from './constants';
import { Background } from './components/Background';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Library } from './components/Library';
import { Register } from './components/Register';
import { Playlists } from './components/Playlists';
import { Stats } from './components/Stats';
import { Modals } from './components/Modals';
import { Toast } from './components/Toast';
import { Login } from './components/Login';

function Screen() {
  const screen = useStore((s) => s.screen);
  switch (screen) {
    case 'library': return <Library />;
    case 'register': return <Register />;
    case 'lists': return <Playlists />;
    case 'favorites': return <Library />;
    case 'stats': return <Stats />;
    default: return null;
  }
}

export function App() {
  const { theme, user, authReady, booted, initAuth, clearPending, sidebarOpen, closeSidebar } = useStore();
  const isMobile = useIsMobile();

  useEffect(() => { initAuth(); }, [initAuth]);

  // theme CSS variables (--accent, --glow, --bg, …) must stay inline so they
  // cascade onto the root element and drive the Tailwind color tokens.
  const themeStyle: CSSProperties = {
    fontFamily: "'Noto Sans JP',sans-serif", background: 'var(--bg)',
    ...(THEMES[theme] as CSSProperties),
  };

  // gate on auth: wait for the initial session check, then require a user
  if (!authReady) {
    return (
      <div className="relative w-full h-screen grid place-items-center overflow-hidden text-white" style={themeStyle}>
        <div className="font-['Share_Tech_Mono',monospace] text-xs text-white/40">LOADING…</div>
      </div>
    );
  }
  if (!user) return <Login />;

  return (
    <div className="relative w-full h-screen flex overflow-hidden text-white" style={themeStyle}>
      <Sidebar />

      {/* overlay backdrop — mobile only, shown when sidebar is open */}
      {isMobile && sidebarOpen && (
        <div onClick={closeSidebar} className="fixed inset-0 z-[190] bg-black/55 backdrop-blur-[2px]" />
      )}

      <Background />
      <main className="relative z-[4] flex-1 h-screen flex flex-col overflow-hidden min-w-0">
        <Header />
        <div onClick={clearPending} className={`flex-1 overflow-y-auto ${isMobile ? 'px-[14px] pt-4 pb-8' : 'px-[34px] pt-6 pb-10'}`}>
          {booted && <Screen />}
        </div>
      </main>
      <Modals />
      <Toast />
    </div>
  );
}
