import { useEffect, useState } from 'react';
import { OBJECTIVE_GOAL } from '@shared/constants';
import type { LeaderboardEntry } from '@shared/protocol';
import { formatTime } from '../format';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { socket } from '../socket/socket';
import { lobbyActions } from '../store/lobbySlice';
import {
  selectIsHost,
  selectMyId,
  selectOpponents,
  selectPlacementOrder,
  selectWinnerId,
} from '../store/selectors';
import { Confetti } from './Confetti';
import styles from './GameOverOverlay.module.css';

interface Standing {
  name: string;
  rank: number;
  isMe: boolean;
}

export const GameOverOverlay = () => {
  const winnerId = useAppSelector(selectWinnerId);
  const myId = useAppSelector(selectMyId);
  const myName = useAppSelector((s) => s.lobby.myName);
  const isHost = useAppSelector(selectIsHost);
  const opponents = useAppSelector(selectOpponents);
  const placementOrder = useAppSelector(selectPlacementOrder);
  const objResult = useAppSelector((s) => s.game.objectiveResult);
  const objective = useAppSelector((s) => s.game.objective);
  const lines = useAppSelector((s) => s.game.lines);
  const dispatch = useAppDispatch();
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    socket.emit('leaderboard', (entries) => setBoard(entries));
  }, []);

  const won = winnerId !== null && winnerId === myId;
  const multi = opponents.length > 0;
  // a completed solo objective is a WIN, shown with its own headline + finishing stats
  const goal = OBJECTIVE_GOAL[objective];
  const celebrate = won || objResult !== null;
  const tag = objResult
    ? `${objResult.kind === 'sprint' ? 'SPRINT' : 'MARATHON'} CLEAR!`
    : won
      ? 'VICTORY'
      : winnerId === null
        ? 'GAME OVER'
        : 'DEFEAT';
  const sub = objResult
    ? formatTime(objResult.timeMs)
    : won
      ? 'last pilot standing'
      : winnerId === null
        ? !multi && goal !== null
          ? `${lines} / ${goal} lines`
          : 'the field is clear'
        : 'better luck next round';

  // survival standings: winner #1, then opponents by reverse elimination, me slotted in
  const standings: Standing[] = [];
  const nameOf = (id: string): string =>
    id === myId ? (myName ?? 'you') : (opponents.find((o) => o.id === id)?.name ?? '?');
  if (multi && winnerId) {
    const seen = new Set<string>([winnerId]);
    standings.push({ name: nameOf(winnerId), rank: 1, isMe: winnerId === myId });
    [...placementOrder].reverse().forEach((id) => {
      if (seen.has(id)) return;
      seen.add(id);
      standings.push({ name: nameOf(id), rank: standings.length + 1, isMe: id === myId });
    });
    if (myId && !seen.has(myId)) {
      standings.push({ name: myName ?? 'you', rank: standings.length + 1, isMe: true });
    }
  }

  return (
    <div className={styles.overlay} role="dialog" aria-label="Game over">
      {celebrate && <Confetti />}
      <div className={styles.card} data-won={celebrate}>
        {celebrate && <div className={styles.crown} aria-hidden />}
        <div className={styles.tag}>{tag}</div>
        <p className={styles.sub}>{sub}</p>

        {objResult && (
          <dl className={styles.objStats}>
            <div className={styles.stat}>
              <dt>TIME</dt>
              <dd>{formatTime(objResult.timeMs)}</dd>
            </div>
            <div className={styles.stat}>
              <dt>LINES</dt>
              <dd>{objResult.lines}</dd>
            </div>
            <div className={styles.stat}>
              <dt>LEVEL</dt>
              <dd>{objResult.level}</dd>
            </div>
            <div className={styles.stat}>
              <dt>SCORE</dt>
              <dd>{objResult.score.toLocaleString()}</dd>
            </div>
          </dl>
        )}

        {multi && standings.length > 0 && (
          <ol className={styles.standings}>
            {standings.map((st) => (
              <li
                key={st.rank}
                className={`${styles.standing} ${st.isMe ? styles.me : ''}`}
                data-rank={st.rank}
                style={{ animationDelay: `${(standings.length - st.rank) * 70}ms` }}
              >
                <span className={styles.medal}>#{st.rank}</span>
                <span className={styles.who}>
                  {st.name}
                  {st.isMe && ' (you)'}
                </span>
              </li>
            ))}
          </ol>
        )}

        {!multi && board.length > 0 && (
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
            PLAY AGAIN
          </button>
        ) : (
          <div className={styles.wait}>waiting for host…</div>
        )}
      </div>
    </div>
  );
};
