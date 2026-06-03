import { FEATURES } from '@shared/constants';
import { useAppSelector } from '../hooks/redux';
import { selectLevel, selectLines, selectScore } from '../store/selectors';
import styles from './ScoreHUD.module.css';

export const ScoreHUD = () => {
  const score = useAppSelector(selectScore);
  const lines = useAppSelector(selectLines);
  const level = useAppSelector(selectLevel);
  if (!FEATURES.SCORING) return null;

  const intoLevel = lines % 10; // 0..9 lines into the current level

  return (
    <div className={styles.hud}>
      <div className={styles.primary}>
        <div className={styles.stat}>
          <span className={styles.k}>LINES</span>
          <span className={styles.big}>{lines}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.k}>LEVEL</span>
          <span className={styles.big}>{level}</span>
        </div>
      </div>
      <div className={styles.toNext} aria-hidden>
        <div className={styles.toNextFill} style={{ width: `${intoLevel * 10}%` }} />
      </div>
      <div className={styles.score}>
        <span className={styles.k}>SCORE</span>
        <span className={styles.scoreV}>{score.toLocaleString()}</span>
      </div>
    </div>
  );
};
