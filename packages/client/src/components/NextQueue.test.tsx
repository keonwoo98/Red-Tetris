import { describe, it, expect } from 'vitest';
import { gameActions } from '../store/gameSlice';
import { NextQueue } from './NextQueue';
import { makeStore, renderWith } from './test-utils';

describe('<NextQueue>', () => {
  it('renders the NEXT label and 5 slots once playing', () => {
    const store = makeStore();
    store.dispatch(gameActions.startGame({ seed: 42 }));
    const { getByText, getAllByTestId } = renderWith(<NextQueue />, store);
    expect(getByText('NEXT')).toBeInTheDocument();
    expect(getAllByTestId('next-slot')).toHaveLength(5);
  });

  it('renders no slots before the game starts', () => {
    const { getByText, queryAllByTestId } = renderWith(<NextQueue />);
    expect(getByText('NEXT')).toBeInTheDocument();
    expect(queryAllByTestId('next-slot')).toHaveLength(0);
  });
});
