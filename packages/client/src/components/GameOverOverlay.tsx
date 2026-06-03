import { useEffect, useState } from 'react';
import type { LeaderboardEntry } from '@shared/protocol';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { socket } from '../socket/socket';
import { lobbyActions } from '../store/lobbySlice';
import { selectIsHost, selectMyId, selectWinnerId } from '../store/selectors';
import styles from './GameOverOverlay.module.css';

export const GameOverOverlay = () => {
  const winnerId = useAppSelector(selectWinnerId);
  const myId = useAppSelector(selectMyId);
  const isHost = useAppSelector(selectIsHost);
  const dispatch = useAppDispatch();
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    socket.emit('leaderboard', (entries) => setBoard(entries));
  }, []);

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
        {board.length > 0 && (
          <ol className={styles.board}>
            {board.slice(0, 5).map((e, i) => (
              <li key={`${e.name}-${i}`} className={styles.entry}>
                <span className={styles.rank}>{i + 1}</span>
                <span className={styles.who}>{e.name}</span>
                <span className={styles.pts}>{e.score.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        )}
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
