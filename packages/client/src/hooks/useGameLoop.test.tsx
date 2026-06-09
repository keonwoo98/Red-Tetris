import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { ReactNode } from 'react';
import { COUNTDOWN_MS, LOCK_DELAY_MS } from '@shared/constants';
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

/** Skip the countdown for tests that exercise active play. */
const begin = (store: TestStore): void => {
  store.dispatch(gameActions.beginPlay({ startedAtMs: 0 }));
};

describe('useGameLoop countdown gate', () => {
  it('keeps the piece frozen during 3-2-1, then unfreezes (ready) at "GO"', () => {
    vi.useFakeTimers();
    try {
      const store = makeStore();
      store.dispatch(gameActions.startGame({ seed: 42 }));
      renderHook(() => useGameLoop(), { wrapper: wrap(store) });

      act(() => vi.advanceTimersByTime(COUNTDOWN_MS - 100));
      expect(store.getState().game.ready).toBe(false); // still counting down
      expect(store.getState().game.current!.y).toBe(store.getState().game.current!.y); // no gravity yet

      act(() => vi.advanceTimersByTime(200)); // past COUNTDOWN_MS → "GO"
      expect(store.getState().game.ready).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('useGameLoop lock delay', () => {
  it('locks a grounded piece after a fixed LOCK_DELAY_MS, not a gravity interval', () => {
    vi.useFakeTimers();
    try {
      const store = makeStore();
      store.dispatch(gameActions.startGame({ seed: 42 }));
      groundPiece(store);
      begin(store); // skip the countdown
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

  it('keeps locking already-grounded pieces with no input until top-out (idle stall fix)', () => {
    vi.useFakeTimers();
    try {
      // Drive seed-42 idle play up to the first piece that spawns ALREADY grounded (#10): hard-drop
      // the first 9 pieces, then let #9 settle with gravity (grounded, not yet locked).
      const store = makeStore();
      store.dispatch(gameActions.startGame({ seed: 42 }));
      store.dispatch(gameActions.beginPlay({ startedAtMs: 0 })); // ready = true
      for (let i = 0; i < 9; i++) store.dispatch(gameActions.hardDrop());
      expect(store.getState().game.pieceIndex).toBe(9);
      expect(store.getState().game.status).toBe('playing');
      groundPiece(store); // gravity-settle #9 without locking it

      renderHook(() => useGameLoop(), { wrapper: wrap(store) });
      // From here ONLY gravity + the lock-delay timer run — no key input. #9 locks, then #10 spawns
      // already-grounded: its lock timer must re-arm per piece (pieceIndex) or the board freezes full.
      for (let i = 0; i < 8 && store.getState().game.status === 'playing'; i++) {
        act(() => vi.advanceTimersByTime(LOCK_DELAY_MS));
      }
      expect(store.getState().game.status).toBe('gameover'); // tops out instead of stalling on #10
    } finally {
      vi.useRealTimers();
    }
  });

  it('a continuously-rotated grounded piece still locks (no infinite floor-kick spin)', () => {
    vi.useFakeTimers();
    try {
      const store = makeStore();
      store.dispatch(gameActions.startGame({ seed: 42 }));
      groundPiece(store); // drop piece #0 to the floor
      begin(store); // skip the countdown
      expect(store.getState().game.pieceIndex).toBe(0);

      renderHook(() => useGameLoop(), { wrapper: wrap(store) });
      // Hold Up: hammer rotate the way OS key-repeat would. Each rotation wall-kicks the piece off the
      // floor and back, but the move-reset budget must still drain and lock the piece (not stall forever).
      for (let i = 0; i < 80 && store.getState().game.pieceIndex === 0; i++) {
        act(() => store.dispatch(gameActions.rotateCW()));
        act(() => vi.advanceTimersByTime(40)); // ~25 rotations/sec, well under LOCK_DELAY_MS
      }
      expect(store.getState().game.pieceIndex).toBe(1); // locked despite the continuous spin
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
      begin(store); // skip the countdown
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
