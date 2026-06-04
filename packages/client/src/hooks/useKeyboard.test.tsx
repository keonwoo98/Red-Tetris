import { describe, it, expect, vi } from 'vitest';
import { fireEvent, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { ReactNode } from 'react';
import { ARR_MS, DAS_MS } from '@shared/constants';
import { gameActions } from '../store/gameSlice';
import { makeStore, type TestStore } from '../components/test-utils';
import { useKeyboard } from './useKeyboard';

const wrap = (store: TestStore) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };

describe('useKeyboard', () => {
  it('dispatches movement on arrow keys when enabled', () => {
    const store = makeStore();
    store.dispatch(gameActions.startGame({ seed: 42 }));
    const x0 = store.getState().game.current!.x;
    renderHook(() => useKeyboard(true), { wrapper: wrap(store) });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(store.getState().game.current!.x).toBe(x0 - 1);
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(store.getState().game.current!.rotation).not.toBe(0);
  });

  it('does nothing when disabled', () => {
    const store = makeStore();
    store.dispatch(gameActions.startGame({ seed: 42 }));
    const x0 = store.getState().game.current!.x;
    renderHook(() => useKeyboard(false), { wrapper: wrap(store) });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(store.getState().game.current!.x).toBe(x0);
  });

  it('ignores OS auto-repeat (e.repeat) so DAS/ARR owns horizontal repeat', () => {
    const store = makeStore();
    store.dispatch(gameActions.startGame({ seed: 42 }));
    const x0 = store.getState().game.current!.x;
    renderHook(() => useKeyboard(true), { wrapper: wrap(store) });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowLeft', repeat: true }); // OS repeat — must be dropped
    expect(store.getState().game.current!.x).toBe(x0 - 1); // only the initial press stepped
  });

  it('auto-shifts after DAS then repeats at ARR while held, and stops on release', () => {
    vi.useFakeTimers();
    try {
      const store = makeStore();
      store.dispatch(gameActions.startGame({ seed: 42 }));
      const x0 = store.getState().game.current!.x;
      renderHook(() => useKeyboard(true), { wrapper: wrap(store) });

      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(store.getState().game.current!.x).toBe(x0 - 1); // immediate step on press

      vi.advanceTimersByTime(DAS_MS + ARR_MS * 2); // DAS elapses, then two ARR ticks
      const xAuto = store.getState().game.current!.x;
      expect(xAuto).toBeLessThan(x0 - 1); // auto-shift moved it further left

      fireEvent.keyUp(window, { key: 'ArrowLeft' });
      vi.advanceTimersByTime(ARR_MS * 5);
      expect(store.getState().game.current!.x).toBe(xAuto); // repeat stops after release
    } finally {
      vi.useRealTimers();
    }
  });
});
