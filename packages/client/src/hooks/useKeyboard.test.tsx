import { describe, it, expect } from 'vitest';
import { fireEvent, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { ReactNode } from 'react';
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
});
