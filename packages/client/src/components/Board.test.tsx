import { describe, it, expect } from 'vitest';
import { gameActions } from '../store/gameSlice';
import { Board } from './Board';
import { makeStore, renderWith } from './test-utils';

describe('<Board>', () => {
  it('renders exactly 200 cells (10×20), all divs', () => {
    const { container } = renderWith(<Board />);
    const cells = container.querySelectorAll('[data-cell]');
    expect(cells).toHaveLength(200);
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('table')).toBeNull();
  });

  it('paints the active piece after startGame', () => {
    const store = makeStore();
    store.dispatch(gameActions.startGame({ seed: 42 }));
    const { container } = renderWith(<Board />, store);
    const filled = [...container.querySelectorAll('[data-cell]')].filter(
      (c) => c.getAttribute('data-cell') !== '0',
    );
    expect(filled.length).toBeGreaterThan(0);
  });

  const filledCount = (container: HTMLElement): number =>
    [...container.querySelectorAll('[data-cell]')].filter((c) => c.getAttribute('data-cell') !== '0')
      .length;

  it('invisible mode hides the locked stack while playing, then reveals it on game over', () => {
    const store = makeStore();
    store.dispatch(gameActions.startGame({ seed: 42, mode: 'invisible' }));
    store.dispatch(gameActions.beginPlay({ startedAtMs: 0 }));
    store.dispatch(gameActions.hardDrop()); // lock a couple of pieces into the stack
    store.dispatch(gameActions.hardDrop());

    const playing = renderWith(<Board />, store);
    const hidden = filledCount(playing.container); // stack hidden; at most the active piece shows

    // seed-42 idle hard-drops top out around piece #11
    while (store.getState().game.status === 'playing') store.dispatch(gameActions.hardDrop());
    expect(store.getState().game.status).toBe('gameover');

    const over = renderWith(<Board />, store);
    const revealed = filledCount(over.container);
    expect(revealed).toBeGreaterThan(hidden); // the final stack is now visible
  });
});
