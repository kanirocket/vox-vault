import { useStore } from '../store';
import { decorate } from '../utils';
import { SongCard } from './SongCard';

export function Favorites() {
  const { songs, favs } = useStore();
  const fav = songs.filter((s) => favs[s.id]).map((s) => decorate(s, favs));

  if (fav.length === 0) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 18, animation: 'vvFade 200ms ease' }}>
        <div style={{ gridColumn: '1/-1', padding: 48, textAlign: 'center', color: 'rgba(255,255,255,.35)', fontSize: 14 }}>お気に入りがまだありません。★ をタップして登録しましょう。</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 18, animation: 'vvFade 200ms ease' }}>
      {fav.map((s) => <SongCard key={s.id} s={s} showGenre height={130} />)}
    </div>
  );
}
