import { COLORS, SHAPES } from '@shared/tetrominoes';
import { useAppSelector } from '../hooks/redux';
import { selectCanHold, selectHold } from '../store/selectors';
import styles from './NextPiece.module.css';

const SIZE = 4;

export const HoldPiece = () => {
  const hold = useAppSelector(selectHold);
  const canHold = useAppSelector(selectCanHold);
  const filled = new Set<string>();
  if (hold) for (const [c, r] of SHAPES[hold][0]!) filled.add(`${c},${r}`);
  const color = hold ? COLORS[hold] : 0;

  return (
    <div className={styles.wrap} style={canHold ? undefined : { opacity: 0.4 }}>
      <div className={styles.label}>HOLD</div>
      <div className={styles.grid}>
        {Array.from({ length: SIZE * SIZE }, (_, i) => {
          const on = filled.has(`${i % SIZE},${Math.floor(i / SIZE)}`);
          return (
            <div
              key={i}
              className={`${styles.mini} ${on ? styles.on : ''}`}
              style={
                on
                  ? { background: `var(--c${color})`, boxShadow: `0 0 10px -2px var(--c${color})` }
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
};
