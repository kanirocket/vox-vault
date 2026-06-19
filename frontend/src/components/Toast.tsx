import { useStore } from '../store';

const TONE: Record<string, string> = {
  success: 'linear-gradient(135deg,rgba(34,211,238,.22),rgba(167,139,250,.18))',
  info: 'rgba(255,255,255,.1)',
  error: 'rgba(255,80,80,.18)',
};

export function Toast() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div
      key={toast.ts}
      className="fixed bottom-6 right-6 z-[300] px-5 py-[13px] rounded-xl backdrop-blur-md border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,.4)] text-[13px] font-bold text-white max-w-[340px] pointer-events-none animate-[vvToast_2.6s_ease_forwards]"
      style={{ background: TONE[toast.type] || TONE.success }}
    >
      {toast.msg}
    </div>
  );
}
