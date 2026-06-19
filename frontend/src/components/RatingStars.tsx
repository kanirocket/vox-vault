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
              className="bg-transparent border-none cursor-pointer leading-none px-px"
              style={{ fontSize: size, color }}
            >
              ★
            </button>
          );
        }
        return <span key={n} className="leading-none" style={{ fontSize: size - 1, color }}>★</span>;
      })}
    </>
  );
}
