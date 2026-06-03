import { COLORS, SHAPES } from '@shared/tetrominoes';
import type { PieceType } from '@shared/types';
import styles from './PiecePreview.module.css';

/**
 * Renders a tetromino centered in its slot by drawing only its bounding box
 * (trimmed of empty rows/cols), so no piece looks shoved into a corner.
 */
export const PiecePreview = ({ type }: { type: PieceType | null }) => {
  if (!type) return <div className={styles.empty} aria-hidden />;

  const cells = SHAPES[type][0]!;
  const cols = cells.map(([c]) => c);
  const rows = cells.map(([, r]) => r);
  const minC = Math.min(...cols);
  const maxC = Math.max(...cols);
  const minR = Math.min(...rows);
  const maxR = Math.max(...rows);
  const w = maxC - minC + 1;
  const h = maxR - minR + 1;
  const color = COLORS[type];

  return (
    <div
      className={styles.piece}
      data-type={type}
      style={{
        gridTemplateColumns: `repeat(${w}, var(--pc))`,
        gridTemplateRows: `repeat(${h}, var(--pc))`,
      }}
    >
      {cells.map(([c, r], i) => (
        <div
          key={i}
          className={styles.block}
          style={{
            gridColumnStart: c - minC + 1,
            gridRowStart: r - minR + 1,
            background: `var(--c${color})`,
            boxShadow: `0 0 10px -2px var(--c${color}), inset 0 0 0 1px rgba(255, 255, 255, 0.42)`,
          }}
        />
      ))}
    </div>
  );
};
