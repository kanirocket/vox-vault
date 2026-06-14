import { useState, type CSSProperties } from 'react';
import { useStore } from '../store';
import { GENRES } from '../constants';
import type { Playlist } from '../types';

const overlay: CSSProperties = { position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(6px)' };
const card: CSSProperties = { borderRadius: 18, background: 'rgba(12,14,28,.95)', border: '1px solid rgba(255,255,255,.12)', padding: 26, animation: 'vvPop 200ms ease', boxShadow: '0 0 60px rgba(0,0,0,.6)' };

function firstCover(l: Playlist, songs: ReturnType<typeof useStore.getState>['songs']): string {
  const s = songs.find((x) => x.id === l.songIds[0]);
  return s ? (GENRES[s.genre] || GENRES.artist).color : l.colors[0] || '#1a1a2e';
}

function AddToListModal() {
  const { addToListSong, songs, lists, closeAddToList, toggleSongInList, openCreateList } = useStore();
  if (addToListSong === null) return null;
  const songObj = songs.find((s) => s.id === addToListSong);
  return (
    <div style={overlay} onClick={closeAddToList}>
      <div style={{ ...card, width: 400 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 17, fontWeight: 900 }}>リストに追加</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>「{songObj?.title || ''}」</div>
        </div>
        {lists.map((l) => {
          const already = l.songIds.includes(addToListSong);
          const cv = firstCover(l, songs);
          return (
            <button key={l.id} onClick={() => toggleSongInList(addToListSong, l.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, textAlign: 'left', marginBottom: 8, border: already ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,.1)', background: already ? 'rgba(34,211,238,.07)' : 'rgba(255,255,255,.03)', color: already ? 'var(--accent)' : '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: cv, boxShadow: `0 0 7px ${cv}` }} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>{l.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, opacity: 0.5 }}>{l.songIds.length}曲</span>
                <span style={{ color: already ? 'var(--accent)' : 'rgba(255,255,255,.2)', fontSize: 15, fontWeight: 700 }}>✓</span>
              </div>
            </button>
          );
        })}
        <button onClick={openCreateList} style={{ width: '100%', marginTop: 10, padding: 11, borderRadius: 10, background: 'none', border: '1px dashed rgba(255,255,255,.2)', color: 'rgba(255,255,255,.55)', fontSize: 13, cursor: 'pointer', transition: 'all .15s' }}>＋ 新しいリストを作成</button>
        <button onClick={closeAddToList} style={{ width: '100%', marginTop: 8, padding: 10, borderRadius: 10, background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', fontSize: 13, cursor: 'pointer' }}>閉じる</button>
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
    <div style={overlay} onClick={() => { cancelCreateList(); setName(''); }}>
      <div style={{ ...card, width: 400, padding: 28 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>新しいマイリスト</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 20 }}>リスト名を入力してください</div>
        <div style={{ padding: '3px 16px', borderRadius: 11, background: 'rgba(0,0,0,.4)', border: '1px solid var(--accent)', boxShadow: '0 0 20px var(--glow)' }}>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="例：深夜のセトリ" style={{ width: '100%', padding: '12px 0', background: 'none', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700 }} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={() => { cancelCreateList(); setName(''); }} style={{ flex: 1, padding: 13, borderRadius: 11, background: 'none', border: '1px solid rgba(255,255,255,.15)', color: 'rgba(255,255,255,.7)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>キャンセル</button>
          <button onClick={submit} style={{ flex: 1, padding: 13, borderRadius: 11, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#06070f', background: valid ? 'linear-gradient(135deg,var(--accent),var(--accent3))' : 'rgba(255,255,255,.2)', boxShadow: valid ? '0 0 22px var(--glow)' : 'none', opacity: valid ? 1 : 0.5 }}>作成する</button>
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
    <div style={overlay} onClick={closeUnsing}>
      <div style={{ ...card, width: 420, padding: 28 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4 }}>歌唱履歴</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 18 }}>「{song?.title || ''}」の歌唱記録</div>
        {sings.length > 0 ? (
          <div style={{ maxHeight: 280, overflowY: 'auto', paddingRight: 8 }}>
            {sings.slice().reverse().map((sing) => (
              <div key={sing.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', marginBottom: 8 }}>
                <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 12, color: 'rgba(255,255,255,.7)' }}>{sing.date.replace(/-/g, '.')}</span>
                <button onClick={() => undoSing(unsingPending, sing.id)} style={{ background: 'rgba(255,100,100,.15)', border: '1px solid rgba(255,150,150,.3)', color: '#ff6b6b', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>取り消す</button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,.35)', fontSize: 13 }}>記録がありません</div>
        )}
        <button onClick={closeUnsing} style={{ width: '100%', marginTop: 16, padding: 11, borderRadius: 11, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#06070f', background: 'linear-gradient(135deg,var(--accent),var(--accent3))', boxShadow: '0 0 22px var(--glow)' }}>閉じる</button>
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
