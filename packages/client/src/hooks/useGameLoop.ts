import { useEffect, useRef } from 'react';
import { GRAVITY_MS, SOFT_DROP_MS } from '@shared/constants';
import { gameActions } from '../store/gameSlice';
import { useAppDispatch, useAppSelector } from './redux';

/**
 * Fixed-step gravity loop. Dispatches `tick()` once per elapsed interval
 * (GRAVITY_MS, or SOFT_DROP_MS while soft-dropping). The one-frame lock grace
 * lives entirely in the tick reducer, so this stays a dumb deterministic emitter.
 */
export const useGameLoop = (): void => {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.game.status);
  const soft = useAppSelector((s) => s.game.softDropActive);
  const raf = useRef(0);

  useEffect(() => {
    if (status !== 'playing') return;
    const interval = soft ? SOFT_DROP_MS : GRAVITY_MS;
    let last = performance.now();
    let acc = 0;
    const step = (now: number): void => {
      acc += now - last;
      last = now;
      while (acc >= interval) {
        acc -= interval;
        dispatch(gameActions.tick());
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [status, soft, dispatch]);
};
