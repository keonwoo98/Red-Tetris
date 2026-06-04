import { useEffect } from 'react';
import { OBJECTIVE_GOAL } from '@shared/constants';
import { gameActions } from '../store/gameSlice';
import { useAppDispatch, useAppSelector } from './redux';

/**
 * Solo objective watcher (bonus): in a one-player game with a Sprint/Marathon goal, end the run as
 * a WIN the moment the line goal is reached, stamping the elapsed wall-clock time. No-op in
 * multiplayer (the win is always last-standing) and in Endless. Lives in a hook so `Date.now` stays
 * out of the deterministic reducer/engine.
 */
export const useSoloObjective = (): void => {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.game.status);
  const objective = useAppSelector((s) => s.game.objective);
  const lines = useAppSelector((s) => s.game.lines);
  const startedAtMs = useAppSelector((s) => s.game.startedAtMs);
  const isSolo = useAppSelector((s) => s.lobby.players.length <= 1);

  useEffect(() => {
    if (status !== 'playing' || !isSolo) return;
    const goal = OBJECTIVE_GOAL[objective];
    if (goal === null || lines < goal) return;
    dispatch(gameActions.objectiveComplete({ timeMs: Date.now() - startedAtMs }));
  }, [status, objective, lines, isSolo, startedAtMs, dispatch]);
};
