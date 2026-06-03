import { describe, it, expect } from 'vitest';
import { gameActions } from '../store/gameSlice';
import { NextPiece } from './NextPiece';
import { makeStore, renderWith } from './test-utils';

describe('<NextPiece>', () => {
  it('renders a 16-cell preview labelled NEXT', () => {
    const { getByText, container } = renderWith(<NextPiece />);
    expect(getByText('NEXT')).toBeInTheDocument();
    const grid = container.querySelector('[class*="grid"]');
    expect(grid?.children).toHaveLength(16);
  });

  it('highlights cells once a next piece exists', () => {
    const store = makeStore();
    store.dispatch(gameActions.startGame({ seed: 42 }));
    const { container } = renderWith(<NextPiece />, store);
    const styled = [...container.querySelectorAll('div')].filter((d) => d.getAttribute('style'));
    expect(styled.length).toBeGreaterThan(0);
  });
});
