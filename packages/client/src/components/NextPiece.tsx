import { COLORS, SHAPES } from '@shared/tetrominoes';
import { useAppSelector } from '../hooks/redux';
import styles from './NextPiece.module.css';

const SIZE = 4;

export const NextPiece = () => {
  const type = useAppSelector((s) => s.game.next[0]);
  const filled = new Set<string>();
  if (type) for (const [c, r] of SHAPES[type][0]!) filled.add(`${c},${r}`);
  const color = type ? COLORS[type] : 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.label}>NEXT</div>
      <div className={styles.grid}>
        {Array.from({ length: SIZE * SIZE }, (_, i) => {
          const on = filled.has(`${i % SIZE},${Math.floor(i / SIZE)}`);
          return (
            <div
              key={i}
              className={`${styles.mini} ${on ? styles.on : ''}`}
              style={on ? { background: `var(--c${color})`, boxShadow: `0 0 10px -2px var(--c${color})` } : undefined}
            />
          );
        })}
      </div>
    </div>
  );
};
