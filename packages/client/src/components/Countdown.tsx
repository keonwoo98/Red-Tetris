import { useAppSelector } from '../hooks/redux';
import { selectGameStatus } from '../store/selectors';
import styles from './Countdown.module.css';

/** 3-2-1-GO intro over the board. Keyed on seed so it replays each new round. */
export const Countdown = () => {
  const status = useAppSelector(selectGameStatus);
  const seed = useAppSelector((s) => s.game.seed);
  if (status !== 'playing' || seed === null) return null;

  return (
    <div key={seed} className={styles.overlay} aria-hidden>
      <span className={styles.three}>3</span>
      <span className={styles.two}>2</span>
      <span className={styles.one}>1</span>
      <span className={styles.go}>GO!</span>
    </div>
  );
};
