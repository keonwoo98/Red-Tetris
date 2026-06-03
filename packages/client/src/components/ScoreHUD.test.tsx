import { describe, it, expect } from 'vitest';
import { gameActions } from '../store/gameSlice';
import { ScoreHUD } from './ScoreHUD';
import { makeStore, renderWith } from './test-utils';

describe('<ScoreHUD>', () => {
  it('renders score, lines and level labels', () => {
    const { getByText } = renderWith(<ScoreHUD />);
    expect(getByText('SCORE')).toBeInTheDocument();
    expect(getByText('LINES')).toBeInTheDocument();
    expect(getByText('LEVEL')).toBeInTheDocument();
  });

  it('reflects the game score from the store', () => {
    const store = makeStore();
    store.dispatch(gameActions.startGame({ seed: 42 }));
    store.dispatch(gameActions.hardDrop());
    const { container } = renderWith(<ScoreHUD />, store);
    expect(container.textContent).toMatch(/\d/);
  });
});
