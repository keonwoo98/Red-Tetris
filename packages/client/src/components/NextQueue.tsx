import { useAppSelector } from '../hooks/redux';
import { PiecePreview } from './PiecePreview';
import styles from './NextQueue.module.css';

export const NextQueue = () => {
  const queue = useAppSelector((s) => s.game.next);

  return (
    <div className={styles.wrap}>
      <div className={styles.label}>NEXT</div>
      <div className={styles.list}>
        {queue.slice(0, 5).map((type, i) => (
          <div
            key={i}
            className={`${styles.slot} ${i === 0 ? styles.first : styles.rest}`}
            data-testid="next-slot"
          >
            <PiecePreview type={type} />
          </div>
        ))}
      </div>
    </div>
  );
};
