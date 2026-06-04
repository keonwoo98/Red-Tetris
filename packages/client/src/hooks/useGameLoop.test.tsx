import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { ReactNode } from 'react';
import { LOCK_DELAY_MS } from '@shared/constants';
import { gameActions } from '../store/gameSlice';
import { makeStore, type TestStore } from '../components/test-utils';
import { useGameLoop } from './useGameLoop';

const wrap = (store: TestStore) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };

/** Drop the active piece to the floor with gravity ticks (each falls one row, no-op once grounded). */
const groundPiece = (store: TestStore): void => {
  for (let i = 0; i < 40; i++) store.dispatch(gameActions.tick());
};

describe('useGameLoop lock delay', () => {
  it('locks a grounded piece after a fixed LOCK_DELAY_MS, not a gravity interval', () => {
    vi.useFakeTimers();
    try {
      const store = makeStore();
      store.dispatch(gameActions.startGame({ seed: 42 }));
      groundPiece(store);
      expect(store.getState().game.pieceIndex).toBe(0); // grounded, gravity never locks it

      renderHook(() => useGameLoop(), { wrapper: wrap(store) });
      act(() => vi.advanceTimersByTime(LOCK_DELAY_MS - 50));
      expect(store.getState().game.pieceIndex).toBe(0); // still within the lock-delay window
      act(() => vi.advanceTimersByTime(100));
      expect(store.getState().game.pieceIndex).toBe(1); // locked ~500ms after grounding
    } finally {
      vi.useRealTimers();
    }
  });

  it('a grounded move restarts the lock-delay timer (tuck window)', () => {
    vi.useFakeTimers();
    try {
      const store = makeStore();
      store.dispatch(gameActions.startGame({ seed: 42 }));
      groundPiece(store);
      renderHook(() => useGameLoop(), { wrapper: wrap(store) });

      act(() => vi.advanceTimersByTime(LOCK_DELAY_MS - 100)); // 400ms in
      act(() => store.dispatch(gameActions.moveLeft())); // tuck → restarts the 500ms timer
      act(() => vi.advanceTimersByTime(LOCK_DELAY_MS - 100)); // 400ms since the restart
      expect(store.getState().game.pieceIndex).toBe(0); // not locked: the move bought more time
      act(() => vi.advanceTimersByTime(150)); // now past 500ms since the restart
      expect(store.getState().game.pieceIndex).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
