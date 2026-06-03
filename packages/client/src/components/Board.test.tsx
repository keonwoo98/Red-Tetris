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
});
