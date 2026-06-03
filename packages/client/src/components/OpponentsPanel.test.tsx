import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { opponentsActions } from '../store/opponentsSlice';
import { OpponentSpectrum, OpponentsPanel } from './OpponentsPanel';
import { makeStore, renderWith } from './test-utils';

describe('<OpponentSpectrum>', () => {
  it('renders the name and 10 spectrum bars', () => {
    const { getByText, container } = render(
      <OpponentSpectrum
        opp={{ id: 'a', name: 'bob', alive: true, spectrum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], koSeq: 0 }}
      />,
    );
    expect(getByText('bob')).toBeInTheDocument();
    const cols = container.querySelectorAll('[data-zone]');
    expect(cols).toHaveLength(10);
  });
});

describe('<OpponentsPanel>', () => {
  it('shows a solo message with no opponents', () => {
    const { getByText } = renderWith(<OpponentsPanel />);
    expect(getByText(/solo run/i)).toBeInTheDocument();
  });

  it('lists opponents from the store', () => {
    const store = makeStore();
    store.dispatch(
      opponentsActions.setOpponents([
        { id: 'a', name: 'bob', alive: true, spectrum: new Array(10).fill(0) },
      ]),
    );
    const { getByText } = renderWith(<OpponentsPanel />, store);
    expect(getByText('bob')).toBeInTheDocument();
    expect(getByText(/RIVALS · 1/)).toBeInTheDocument();
  });
});
