import { useEffect } from 'react';
import {
  GRAVITY_MS,
  LOCK_DELAY_MS,
  RISING_GRAVITY_MIN_MS,
  RISING_GRAVITY_STEP_MS,
  SOFT_DROP_MS,
} from '@shared/constants';
import { runGravityLoop } from '../frp/streams';
import { gameActions } from '../store/gameSlice';
import { selectIsGrounded, selectLockResets } from '../store/selectors';
import { useAppDispatch, useAppSelector } from './redux';

/**
 * Two independent timers, the way modern Tetris (TETR.IO/Jstris) does it:
 *
 * 1. Gravity — a flyd interval (FRP bonus) that pulls the piece down one row at the gravity rate
 *    (or the faster soft-drop rate while held). It never locks.
 * 2. Lock delay — a FIXED `LOCK_DELAY_MS` timer that starts when the piece grounds and locks it on
 *    expiry. Each grounded move/rotate bumps `lockResets`, which restarts this timer so tucks and
 *    T-spins land; the reducer caps the bumps so you can't stall forever.
 *
 * Decoupling the lock from the gravity tick is the fix for "the piece takes ~2s to settle": the
 * lock delay is now a constant half-second regardless of the gravity speed.
 */
export const useGameLoop = (): void => {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.game.status);
  const soft = useAppSelector((s) => s.game.softDropActive);
  const grounded = useAppSelector(selectIsGrounded);
  const lockResets = useAppSelector(selectLockResets);
  const mode = useAppSelector((s) => s.game.mode);
  const level = useAppSelector((s) => s.game.level);

  // 1. gravity
  useEffect(() => {
    if (status !== 'playing') return;
    const gravity =
      mode === 'rising'
        ? Math.max(RISING_GRAVITY_MIN_MS, GRAVITY_MS - (level - 1) * RISING_GRAVITY_STEP_MS)
        : GRAVITY_MS;
    const interval = soft ? SOFT_DROP_MS : gravity;
    return runGravityLoop(interval, () => dispatch(gameActions.tick()));
  }, [status, soft, mode, level, dispatch]);

  // 2. lock delay — (re)armed whenever the piece is grounded; `lockResets` in the deps restarts it
  // on each grounded move/rotate, so this single timer also implements the tuck/spin window.
  useEffect(() => {
    if (status !== 'playing' || !grounded) return;
    const id = setTimeout(() => dispatch(gameActions.lockDown()), LOCK_DELAY_MS);
    return () => clearTimeout(id);
  }, [status, grounded, lockResets, dispatch]);
};
