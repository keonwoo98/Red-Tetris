import { useAppSelector } from '../hooks/redux';
import { selectPendingPenalty } from '../store/selectors';
import styles from './GarbageMeter.module.css';

export const GarbageMeter = () => {
  const pending = useAppSelector(selectPendingPenalty);
  if (pending <= 0) return null;

  const sev = pending >= 5 ? 'crit' : pending >= 3 ? 'high' : 'mid';

  return (
    <div className={styles.meter} data-sev={sev} aria-label={`incoming ${pending} garbage lines`}>
      <div className={styles.count}>⚠ {pending}</div>
      <div className={styles.segments}>
        {Array.from({ length: Math.min(pending, 12) }, (_, i) => (
          <div key={i} className={styles.seg} />
        ))}
      </div>
    </div>
  );
};
