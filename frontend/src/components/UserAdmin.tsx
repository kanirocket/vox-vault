import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { GENRES } from '../constants';
import type { AdminUser, Playlist } from '../types';

// Admin-only panel (rendered under the Stats dashboard): lists every registered
// user and lets the admin view a selected user's playlists.
export function UserAdmin() {
  const { user, songs } = useStore();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[] | null>(null);
  const [loadingPl, setLoadingPl] = useState(false);

  useEffect(() => {
    if (!user?.isAdmin) return;
    api<AdminUser[]>('/users').then(setUsers).catch(() => setUsers([]));
  }, [user?.isAdmin]);

  const openUser = (u: AdminUser) => {
    setSelected(u);
    setPlaylists(null);
    setLoadingPl(true);
    api<Playlist[]>(`/users/${u.id}/playlists`).then(setPlaylists).catch(() => setPlaylists([])).finally(() => setLoadingPl(false));
  };

  if (!user?.isAdmin) return null;

  const colorOf = (id: number) => {
    const s = songs.find((x) => x.id === id);
    return s ? (GENRES[s.genre] || GENRES.artist).color : null;
  };
  const cover = (pl: Playlist): string[] => {
    const cs = pl.songIds.slice(0, 4).map(colorOf).filter(Boolean) as string[];
    while (cs.length < 4) cs.push(pl.colors[cs.length] || '#1a1a2e');
    return cs;
  };

  return (
    <div className="mt-4">
      <div className="font-['Share_Tech_Mono',monospace] text-[11px] tracking-[2px] text-white/45 mb-1.5">REGISTERED USERS</div>
      <div className="text-[15px] font-bold mb-4">登録ユーザー<span className="text-[10px] font-normal text-white/40 ml-2">{users ? `${users.length}人` : ''}</span></div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1.4fr' }}>
        {/* user list */}
        <div className="rounded-2xl bg-white/[.03] border border-white/[.08] backdrop-blur-md overflow-hidden">
          {users === null ? (
            <div className="p-6 text-center text-white/40 font-['Share_Tech_Mono',monospace] text-xs">LOADING…</div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center text-white/35 text-[13px]">ユーザーがいません</div>
          ) : (
            users.map((u) => {
              const on = selected?.id === u.id;
              return (
                <button key={u.id} onClick={() => openUser(u)} className={`flex items-center gap-3 w-full px-[14px] py-2.5 border-b border-white/[.04] cursor-pointer text-left transition-colors ${on ? 'bg-accent/10' : 'bg-transparent'}`}>
                  {u.picture
                    ? <img src={u.picture} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full shrink-0" />
                    : <div className="w-8 h-8 rounded-full shrink-0 grid place-items-center bg-[linear-gradient(135deg,var(--accent),var(--accent3))] text-[#06070f] font-black">{(u.name || u.email || '?').slice(0, 1).toUpperCase()}</div>}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold whitespace-nowrap overflow-hidden text-ellipsis">{u.name || 'ゲスト'}{u.isAdmin && <span className="ml-1.5 font-['Share_Tech_Mono',monospace] text-[8px] text-accent border border-[color:var(--accent)] rounded px-1 py-px">ADMIN</span>}</div>
                    <div className="text-[10px] text-white/40 whitespace-nowrap overflow-hidden text-ellipsis">{u.email}</div>
                  </div>
                  <span className="font-['Share_Tech_Mono',monospace] text-[11px] text-white/50 shrink-0">{u.playlistCount} リスト</span>
                </button>
              );
            })
          )}
        </div>

        {/* selected user's playlists */}
        <div className="rounded-2xl bg-white/[.03] border border-white/[.08] backdrop-blur-md p-[18px]">
          {!selected ? (
            <div className="h-full grid place-items-center text-white/35 text-[13px] py-10">ユーザーを選択するとマイリストを表示します</div>
          ) : (
            <>
              <div className="text-[13px] font-bold mb-3">{selected.name || selected.email} のマイリスト</div>
              {loadingPl ? (
                <div className="py-8 text-center text-white/40 font-['Share_Tech_Mono',monospace] text-xs">LOADING…</div>
              ) : !playlists || playlists.length === 0 ? (
                <div className="py-8 text-center text-white/35 text-[13px]">マイリストがありません</div>
              ) : (
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))' }}>
                  {playlists.map((pl) => {
                    const cv = cover(pl);
                    return (
                      <div key={pl.id} className="rounded-xl overflow-hidden bg-white/[.03] border border-white/[.07]">
                        <div className="relative grid grid-cols-2 grid-rows-2 h-[70px] gap-px">
                          <div style={{ background: cv[0] }} /><div style={{ background: cv[1] }} /><div style={{ background: cv[2] }} /><div style={{ background: cv[3] }} />
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent 40%,rgba(8,10,20,.85))' }} />
                        </div>
                        <div className="px-2.5 py-2">
                          <div className="text-[12px] font-bold whitespace-nowrap overflow-hidden text-ellipsis">{pl.name}</div>
                          <div className="font-['Share_Tech_Mono',monospace] text-[10px] text-white/45">{pl.songIds.length} TRACKS</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
