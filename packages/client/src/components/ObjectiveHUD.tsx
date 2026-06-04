import { useEffect, useState } from 'react';
import { OBJECTIVE_GOAL } from '@shared/constants';
import { formatTime } from '../format';
import { useAppSelector } from '../hooks/redux';
import styles from './ObjectiveHUD.module.css';

/** Solo Sprint/Marathon panel: lines remaining + a live time-attack clock. Hidden in Endless/multiplayer. */
export const ObjectiveHUD = () => {
  const objective = useAppSelector((s) => s.game.objective);
  const lines = useAppSelector((s) => s.game.lines);
  const startedAtMs = useAppSelector((s) => s.game.startedAtMs);
  const status = useAppSelector((s) => s.game.status);
  const result = useAppSelector((s) => s.game.objectiveResult);
  const isSolo = useAppSelector((s) => s.lobby.players.length <= 1);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (status !== 'playing') return;
    const id = setInterval(() => setNow(Date.now()), 67);
    return () => clearInterval(id);
  }, [status]);

  const goal = OBJECTIVE_GOAL[objective];
  if (!isSolo || goal === null) return null;

  // freeze on the recorded finish time once the run ends; otherwise tick the live clock
  const elapsed = result ? result.timeMs : Math.max(0, now - startedAtMs);
  const remaining = Math.max(0, goal - lines);

  return (
    <div className={styles.hud} data-objective={objective}>
      <span className={styles.label}>{objective === 'sprint' ? 'SPRINT' : 'MARATHON'}</span>
      <span className={styles.time}>{formatTime(elapsed)}</span>
      <span className={styles.lines}>
        <b>{Math.min(lines, goal)}</b>
        <span className={styles.goal}>/ {goal}</span>
      </span>
      <span className={styles.left}>{remaining === 0 ? 'CLEAR!' : `${remaining} to go`}</span>
    </div>
  );
};
