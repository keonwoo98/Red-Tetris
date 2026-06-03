import { FEATURES } from '@shared/constants';
import { useAppSelector } from '../hooks/redux';
import { selectLevel, selectLines, selectScore } from '../store/selectors';
import styles from './ScoreHUD.module.css';

export const ScoreHUD = () => {
  const score = useAppSelector(selectScore);
  const lines = useAppSelector(selectLines);
  const level = useAppSelector(selectLevel);
  if (!FEATURES.SCORING) return null;

  return (
    <div className={styles.hud}>
      <div className={styles.score}>
        <span className={styles.k}>SCORE</span>
        <span className={styles.big}>{score.toLocaleString()}</span>
      </div>
      <div className={styles.row}>
        <div className={styles.stat}>
          <span className={styles.k}>LINES</span>
          <span className={styles.v}>{lines}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.k}>LEVEL</span>
          <span className={styles.v}>{level}</span>
        </div>
      </div>
    </div>
  );
};
