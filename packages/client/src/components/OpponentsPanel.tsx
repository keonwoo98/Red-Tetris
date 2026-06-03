import { useAppSelector } from '../hooks/redux';
import type { OpponentView } from '../store/opponentsSlice';
import { selectLastAttack, selectOpponents } from '../store/selectors';
import styles from './OpponentsPanel.module.css';

const zone = (h: number): string => (h >= 16 ? 'crit' : h >= 12 ? 'high' : h >= 8 ? 'mid' : 'low');

export const OpponentSpectrum = ({
  opp,
  attackSeq,
}: {
  opp: OpponentView;
  attackSeq?: number | undefined;
}) => {
  const maxH = opp.spectrum.length ? Math.max(...opp.spectrum) : 0;
  const danger = opp.alive && maxH >= 16;

  return (
    <div className={`${styles.card} ${opp.alive ? '' : styles.dead} ${danger ? styles.cardDanger : ''}`}>
      {attackSeq !== undefined && opp.alive && (
        <div key={attackSeq} className={styles.attackPulse} aria-hidden />
      )}
      {!opp.alive && opp.koSeq > 0 && (
        <div key={opp.koSeq} className={styles.koStamp} aria-hidden>
          KO
        </div>
      )}
      <div className={styles.head}>
        <span className={styles.dot} data-alive={opp.alive} />
        <span className={styles.name}>{opp.name}</span>
        {!opp.alive && <span className={styles.out}>OUT</span>}
      </div>
      <div className={styles.well} role="img" aria-label={`${opp.name} field`}>
        {opp.spectrum.map((h, c) => (
          <div key={c} className={styles.col} data-zone={zone(h)}>
            <div className={styles.fill} style={{ height: `${(h / 20) * 100}%` }} />
          </div>
        ))}
        <div className={styles.deathline} aria-hidden />
      </div>
    </div>
  );
};

export const OpponentsPanel = () => {
  const opponents = useAppSelector(selectOpponents);
  const lastAttack = useAppSelector(selectLastAttack);

  return (
    <div className={styles.panel}>
      <div className={styles.title}>RIVALS · {opponents.length}</div>
      {opponents.length === 0 ? (
        <div className={styles.empty}>solo run — last one standing</div>
      ) : (
        <div className={styles.list} data-count={Math.min(opponents.length, 6)}>
          {opponents.map((o) => (
            <OpponentSpectrum
              key={o.id}
              opp={o}
              attackSeq={lastAttack?.fromId === o.id ? lastAttack.seq : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};
