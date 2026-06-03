import { useAppSelector } from '../hooks/redux';
import { selectCanHold, selectHold } from '../store/selectors';
import { PiecePreview } from './PiecePreview';
import styles from './NextQueue.module.css';

export const HoldPiece = () => {
  const hold = useAppSelector(selectHold);
  const canHold = useAppSelector(selectCanHold);

  return (
    <div className={styles.wrap}>
      <div className={styles.label}>HOLD</div>
      <div
        className={`${styles.slot} ${styles.first}`}
        style={canHold ? undefined : { opacity: 0.4 }}
      >
        <PiecePreview type={hold} />
      </div>
    </div>
  );
};
