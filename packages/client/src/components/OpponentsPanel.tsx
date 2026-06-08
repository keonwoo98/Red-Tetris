import { COLOR_HEX } from '@shared/constants';
import { useAppSelector } from '../hooks/redux';
import type { OpponentView } from '../store/opponentsSlice';
import { selectLastAttack, selectOpponents } from '../store/selectors';
import styles from './OpponentsPanel.module.css';

/** Highest filled row of the field → stack height (0..20), for the danger glow. */
const maxHeight = (field: number[][]): number => {
  for (let r = 0; r < field.length; r++) {
    if (field[r]?.some((v) => v !== 0)) return field.length - r;
  }
  return 0;
};

export const OpponentSpectrum = ({
  opp,
  attackSeq,
}: {
  opp: OpponentView;
  attackSeq?: number | undefined;
}) => {
  const danger = opp.alive && maxHeight(opp.spectrum) >= 16;

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
        {/* a true mini-board: each cell painted with its real color (0 empty, 1-7 piece, 8 garbage) */}
        {opp.spectrum.flatMap((row, r) =>
          row.map((v, c) => (
            <div
              key={`${r}-${c}`}
              className={styles.cell}
              style={v ? { background: COLOR_HEX[v] } : undefined}
            />
          )),
        )}
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
