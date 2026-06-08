import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { opponentsActions } from '../store/opponentsSlice';
import { OpponentSpectrum, OpponentsPanel } from './OpponentsPanel';
import { makeStore, renderWith } from './test-utils';

const emptyField = (): number[][] => Array.from({ length: 20 }, () => new Array<number>(10).fill(0));

describe('<OpponentSpectrum>', () => {
  it('renders the name and a 20×10 mini-board, painting the filled cells', () => {
    const field = emptyField();
    field[19] = [1, 2, 3, 4, 5, 6, 7, 8, 8, 8]; // bottom row: 10 colored/garbage cells
    const { getByText, container } = render(
      <OpponentSpectrum opp={{ id: 'a', name: 'bob', alive: true, spectrum: field, koSeq: 0 }} />,
    );
    expect(getByText('bob')).toBeInTheDocument();
    expect(container.querySelectorAll('[class*="cell"]')).toHaveLength(200); // 20×10 grid
    expect(container.querySelectorAll('[style*="background"]')).toHaveLength(10); // filled cells
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
      opponentsActions.setOpponents([{ id: 'a', name: 'bob', alive: true, spectrum: emptyField() }]),
    );
    const { getByText } = renderWith(<OpponentsPanel />, store);
    expect(getByText('bob')).toBeInTheDocument();
    expect(getByText(/RIVALS · 1/)).toBeInTheDocument();
  });
});
