import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { lobbyActions } from '../store/lobbySlice';
import { selectIsHost, selectMyId, selectWinnerId } from '../store/selectors';
import styles from './GameOverOverlay.module.css';

export const GameOverOverlay = () => {
  const winnerId = useAppSelector(selectWinnerId);
  const myId = useAppSelector(selectMyId);
  const isHost = useAppSelector(selectIsHost);
  const dispatch = useAppDispatch();

  const won = winnerId !== null && winnerId === myId;
  const tag = won ? 'VICTORY' : winnerId === null ? 'GAME OVER' : 'DEFEAT';
  const sub = won
    ? 'last pelican standing'
    : winnerId === null
      ? 'the field is clear'
      : 'better luck next round';

  return (
    <div className={styles.overlay} role="dialog" aria-label="Game over">
      <div className={styles.card} data-won={won}>
        <div className={styles.tag}>{tag}</div>
        <p className={styles.sub}>{sub}</p>
        {isHost ? (
          <button className={styles.again} onClick={() => dispatch(lobbyActions.requestRestart())}>
            NEW ROUND
          </button>
        ) : (
          <div className={styles.wait}>waiting for host…</div>
        )}
      </div>
    </div>
  );
};
