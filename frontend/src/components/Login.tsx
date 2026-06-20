import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';

// Minimal typing for the Google Identity Services global.
interface GoogleId {
  accounts: {
    id: {
      initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void }) => void;
      renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
    };
  };
}
declare global {
  interface Window { google?: GoogleId }
}

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.getElementById('gis-script');
    if (existing) { existing.addEventListener('load', () => resolve()); return; }
    const s = document.createElement('script');
    s.id = 'gis-script';
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('failed to load Google Identity Services'));
    document.head.appendChild(s);
  });
}

export function Login() {
  const loginWithGoogle = useStore((s) => s.loginWithGoogle);
  const loginAsGuest = useStore((s) => s.loginAsGuest);
  const btnRef = useRef<HTMLDivElement>(null);
  // client id is fetched from the backend at runtime (no build-time bake)
  const [clientId, setClientId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api<{ configured: boolean; clientId: string }>('/auth/config')
      .then((c) => setClientId(c.clientId || null))
      .catch(() => setClientId(null))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadGis().then(() => {
      if (cancelled || !window.google || !btnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (r) => loginWithGoogle(r.credential),
      });
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', width: 280,
      });
    }).catch(() => { /* network/script error — handled by the missing button */ });
    return () => { cancelled = true; };
  }, [clientId, loginWithGoogle]);

  return (
    <div
      className="relative w-full h-screen grid place-items-center overflow-hidden text-white font-['Noto_Sans_JP',sans-serif]"
      style={{ background: 'radial-gradient(140% 120% at 50% -10%,#0b1126,#04050c 60%)' }}
    >
      <div className="relative z-[2] w-[min(92vw,420px)] text-center px-[34px] pt-[44px] pb-10 rounded-[22px] bg-white/[.03] border border-white/[.09] backdrop-blur-lg shadow-[0_0_60px_rgba(56,232,255,.12)]">
        <div className="w-[62px] h-[62px] rounded-2xl mx-auto mb-5 grid place-items-center bg-[linear-gradient(135deg,#38e8ff,#7b5bff)] shadow-[0_0_30px_rgba(56,232,255,.5)]">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#06070f" strokeWidth="2.4" strokeLinecap="round"><path d="M12 3v12" /><circle cx="9" cy="17" r="3" /><path d="M12 3l7 2v4" /></svg>
        </div>
        <div className="font-['Orbitron',sans-serif] font-black text-2xl tracking-[1px]">VOX<span className="text-[#38e8ff]">//</span>VAULT</div>
        <div className="font-['Share_Tech_Mono',monospace] text-[10px] tracking-[3px] text-white/40 mt-1.5">KARAOKE ARCHIVE</div>
        <p className="text-[13px] text-white/55 leading-[1.8] mx-0 mt-[26px] mb-6">
          サインインして、あなただけのお気に入り・<br />マイリスト・歌唱記録を管理しましょう。
        </p>
        {!ready ? (
          <div className="font-['Share_Tech_Mono',monospace] text-[11px] text-white/40 min-h-[44px] grid place-items-center">LOADING…</div>
        ) : clientId ? (
          <div ref={btnRef} className="flex justify-center min-h-[44px]" />
        ) : (
          <div className="px-4 py-[14px] rounded-[10px] bg-[rgba(255,200,0,.07)] border border-[rgba(255,200,0,.3)] text-xs text-[#ffd24a] leading-[1.7] text-left">
            Google サインインが未設定です。<br />
            サーバーの <code className="font-['Share_Tech_Mono',monospace]">GOOGLE_CLIENT_ID</code> を設定してください。
          </div>
        )}

        {/* guest login (always available) */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="font-['Share_Tech_Mono',monospace] text-[10px] text-white/30">または</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>
        <button onClick={() => loginAsGuest()} className="w-full py-3 rounded-full cursor-pointer text-[13px] font-bold text-white/80 bg-white/[.06] border border-white/15 transition-colors hover:bg-white/[.1]">
          ゲストとして続ける
        </button>
        <p className="text-[10px] text-white/35 mt-2 leading-[1.6]">ゲストのデータはこのブラウザに紐づきます。</p>
      </div>
    </div>
  );
}
