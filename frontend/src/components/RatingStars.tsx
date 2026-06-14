// Singability rating stars (歌える度). Clickable when `onRate` is provided.
interface Props {
  rating: number | null;
  onRate?: (n: number) => void;
  size?: number;
}

export function RatingStars({ rating, onRate, size = 13 }: Props) {
  return (
    <>
      {[1, 2, 3, 4, 5].map((n) => {
        const lit = rating !== null && n <= rating;
        const color = lit ? 'var(--accent)' : 'rgba(255,255,255,.2)';
        if (onRate) {
          return (
            <button
              key={n}
              onClick={() => onRate(n)}
              title={`歌える度 ${n}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: size, padding: '0 1px', lineHeight: 1, color }}
            >
              ★
            </button>
          );
        }
        return <span key={n} style={{ fontSize: size - 1, color }}>★</span>;
      })}
    </>
  );
}
