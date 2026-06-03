import { useAppSelector } from '../hooks/redux';
import { selectClearFx } from '../store/selectors';
import styles from './ClearPopup.module.css';

const NAME: Record<number, string> = { 1: 'SINGLE', 2: 'DOUBLE', 3: 'TRIPLE', 4: 'TETRIS' };

export const ClearPopup = () => {
  const fx = useAppSelector(selectClearFx);
  if (!fx || (fx.lines <= 0 && !fx.tSpin)) return null;

  const label = fx.perfect
    ? 'ALL CLEAR'
    : fx.tSpin
      ? `T-SPIN ${NAME[fx.lines] ?? ''}`.trim()
      : (NAME[fx.lines] ?? '');

  return (
    <div key={fx.seq} className={styles.wrap} aria-hidden>
      <div
        className={`${styles.clear} ${fx.lines >= 4 ? styles.tetris : ''} ${fx.tSpin ? styles.tspin : ''} ${fx.perfect ? styles.perfect : ''}`}
      >
        {label}
      </div>
      {fx.combo > 1 && (
        <div className={styles.combo} data-heat={Math.min(fx.combo, 8)}>
          COMBO ×{fx.combo}
        </div>
      )}
      {fx.b2b > 1 && <div className={styles.b2b}>B2B ×{fx.b2b}</div>}
    </div>
  );
};
