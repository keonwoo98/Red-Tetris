import { useEffect } from 'react';
import {
  GRAVITY_MS,
  RISING_GRAVITY_MIN_MS,
  RISING_GRAVITY_STEP_MS,
  SOFT_DROP_MS,
} from '@shared/constants';
import { runGravityLoop } from '../frp/streams';
import { gameActions } from '../store/gameSlice';
import { useAppDispatch, useAppSelector } from './redux';

/**
 * Gravity loop driven by a flyd stream (FRP bonus). `runGravityLoop` emits ticks on a flyd
 * interval stream; each emission dispatches `tick()`. The one-frame lock grace lives in the
 * tick reducer, so this stays a dumb deterministic emitter. The pure engine is untouched.
 */
export const useGameLoop = (): void => {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.game.status);
  const soft = useAppSelector((s) => s.game.softDropActive);
  const mode = useAppSelector((s) => s.game.mode);
  const level = useAppSelector((s) => s.game.level);

  useEffect(() => {
    if (status !== 'playing') return;
    const gravity =
      mode === 'rising'
        ? Math.max(RISING_GRAVITY_MIN_MS, GRAVITY_MS - (level - 1) * RISING_GRAVITY_STEP_MS)
        : GRAVITY_MS;
    const interval = soft ? SOFT_DROP_MS : gravity;
    return runGravityLoop(interval, () => dispatch(gameActions.tick()));
  }, [status, soft, mode, level, dispatch]);
};
