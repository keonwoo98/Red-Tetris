import { BOARD_HEIGHT } from '@shared/constants';
import type { OpponentDTO } from '@shared/protocol';
import { useAppSelector } from '../hooks/redux';
import { selectOpponents } from '../store/selectors';
import styles from './OpponentsPanel.module.css';

export const OpponentSpectrum = ({ opp }: { opp: OpponentDTO }) => (
  <div className={`${styles.card} ${opp.alive ? '' : styles.dead}`}>
    <div className={styles.head}>
      <span className={styles.dot} data-alive={opp.alive} />
      <span className={styles.name}>{opp.name}</span>
    </div>
    <div className={styles.bars} role="img" aria-label={`${opp.name} field spectrum`}>
      {opp.spectrum.map((h, c) => (
        <div key={c} className={styles.track}>
          <div className={styles.bar} style={{ height: `${(h / BOARD_HEIGHT) * 100}%` }} />
        </div>
      ))}
    </div>
  </div>
);

export const OpponentsPanel = () => {
  const opponents = useAppSelector(selectOpponents);
  return (
    <div className={styles.panel}>
      <div className={styles.title}>RIVALS · {opponents.length}</div>
      {opponents.length === 0 ? (
        <div className={styles.empty}>solo run — last one standing</div>
      ) : (
        <div className={styles.list}>
          {opponents.map((o) => (
            <OpponentSpectrum key={o.id} opp={o} />
          ))}
        </div>
      )}
    </div>
  );
};
