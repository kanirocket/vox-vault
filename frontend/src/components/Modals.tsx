import { useState } from 'react';
import { useStore } from '../store';
import { GENRES } from '../constants';
import type { Playlist } from '../types';

const overlay = 'fixed inset-0 z-[200] flex items-center justify-center bg-black/65 backdrop-blur-[6px]';
const card = 'rounded-[18px] bg-[rgba(12,14,28,.95)] border border-white/12 animate-[vvPop_200ms_ease] shadow-[0_0_60px_rgba(0,0,0,.6)]';

function firstCover(l: Playlist, songs: ReturnType<typeof useStore.getState>['songs']): string {
  const s = songs.find((x) => x.id === l.songIds[0]);
  return s ? (GENRES[s.genre] || GENRES.artist).color : l.colors[0] || '#1a1a2e';
}

function AddToListModal() {
  const { addToListSong, songs, lists, closeAddToList, toggleSongInList, openCreateList } = useStore();
  if (addToListSong === null) return null;
  const songObj = songs.find((s) => s.id === addToListSong);
  return (
    <div className={overlay} onClick={closeAddToList}>
      <div className={`${card} w-[400px] p-[26px]`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-[18px]">
          <div className="text-[17px] font-black">リストに追加</div>
          <div className="text-xs text-white/50 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">「{songObj?.title || ''}」</div>
        </div>
        {lists.map((l) => {
          const already = l.songIds.includes(addToListSong);
          const cv = firstCover(l, songs);
          return (
            <button key={l.id} onClick={() => toggleSongInList(addToListSong, l.id)} className="flex items-center justify-between w-full px-[14px] py-3 rounded-[10px] cursor-pointer text-[13px] font-semibold text-left mb-2 border" style={{ borderColor: already ? 'var(--accent)' : 'rgba(255,255,255,.1)', background: already ? 'rgba(34,211,238,.07)' : 'rgba(255,255,255,.03)', color: already ? 'var(--accent)' : '#fff' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-[3px]" style={{ background: cv, boxShadow: `0 0 7px ${cv}` }} />
                <span className="text-[13px] font-bold">{l.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-['Share_Tech_Mono',monospace] text-[11px] opacity-50">{l.songIds.length}曲</span>
                <span className="text-[15px] font-bold" style={{ color: already ? 'var(--accent)' : 'rgba(255,255,255,.2)' }}>✓</span>
              </div>
            </button>
          );
        })}
        <button onClick={openCreateList} className="w-full mt-2.5 p-[11px] rounded-[10px] bg-transparent border border-dashed border-white/20 text-white/55 text-[13px] cursor-pointer transition-all">＋ 新しいリストを作成</button>
        <button onClick={closeAddToList} className="w-full mt-2 p-2.5 rounded-[10px] bg-transparent border-none text-white/40 text-[13px] cursor-pointer">閉じる</button>
      </div>
    </div>
  );
}

function CreateListModal() {
  const { creatingList, cancelCreateList, submitNewList } = useStore();
  const [name, setName] = useState('');
  if (!creatingList) return null;
  const valid = !!name.trim();
  const submit = () => { if (valid) { submitNewList(name); setName(''); } };
  return (
    <div className={overlay} onClick={() => { cancelCreateList(); setName(''); }}>
      <div className={`${card} w-[400px] p-7`} onClick={(e) => e.stopPropagation()}>
        <div className="text-lg font-black mb-1.5">新しいマイリスト</div>
        <div className="text-[13px] text-white/50 mb-5">リスト名を入力してください</div>
        <div className="px-4 py-[3px] rounded-[11px] bg-black/40 border border-[color:var(--accent)] shadow-[0_0_20px_var(--glow)]">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="例：深夜のセトリ" className="w-full py-3 bg-transparent border-none text-white text-[15px] font-bold" />
        </div>
        <div className="flex gap-2.5 mt-[18px]">
          <button onClick={() => { cancelCreateList(); setName(''); }} className="flex-1 p-[13px] rounded-[11px] bg-transparent border border-white/15 text-white/70 text-[13px] font-bold cursor-pointer">キャンセル</button>
          <button onClick={submit} className="flex-1 p-[13px] rounded-[11px] border-none cursor-pointer font-bold text-sm text-[#06070f]" style={{ background: valid ? 'linear-gradient(135deg,var(--accent),var(--accent3))' : 'rgba(255,255,255,.2)', boxShadow: valid ? '0 0 22px var(--glow)' : 'none', opacity: valid ? 1 : 0.5 }}>作成する</button>
        </div>
      </div>
    </div>
  );
}

function UnsingModal() {
  const { unsingPending, songs, closeUnsing, undoSing } = useStore();
  if (unsingPending === null) return null;
  const song = songs.find((s) => s.id === unsingPending);
  const sings = song?.sings || [];
  return (
    <div className={overlay} onClick={closeUnsing}>
      <div className={`${card} w-[420px] p-7`} onClick={(e) => e.stopPropagation()}>
        <div className="text-lg font-black mb-1">歌唱履歴</div>
        <div className="text-xs text-white/50 mb-[18px]">「{song?.title || ''}」の歌唱記録</div>
        {sings.length > 0 ? (
          <div className="max-h-[280px] overflow-y-auto pr-2">
            {sings.slice().reverse().map((sing) => (
              <div key={sing.id} className="flex items-center justify-between px-[14px] py-2.5 rounded-lg bg-white/[.03] border border-white/[.08] mb-2">
                <span className="font-['Share_Tech_Mono',monospace] text-xs text-white/70">{sing.date.replace(/-/g, '.')}</span>
                <button onClick={() => undoSing(unsingPending, sing.id)} className="bg-[rgba(255,100,100,.15)] border border-[rgba(255,150,150,.3)] text-[#ff6b6b] rounded-md px-2.5 py-1 text-xs cursor-pointer font-bold">取り消す</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-white/35 text-[13px]">記録がありません</div>
        )}
        <button onClick={closeUnsing} className="w-full mt-4 p-[11px] rounded-[11px] border-none cursor-pointer font-bold text-[13px] text-[#06070f] bg-[linear-gradient(135deg,var(--accent),var(--accent3))] shadow-[0_0_22px_var(--glow)]">閉じる</button>
      </div>
    </div>
  );
}

export function Modals() {
  return (
    <>
      <AddToListModal />
      <CreateListModal />
      <UnsingModal />
    </>
  );
}
