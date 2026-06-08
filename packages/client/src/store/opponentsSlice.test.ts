import { describe, it, expect } from 'vitest';
import type { OpponentDTO } from '@shared/protocol';
import reducer, { opponentsActions, type OpponentsState } from './opponentsSlice';

const init = (): OpponentsState => reducer(undefined, { type: '@@INIT' });
const emptyField = (): number[][] => Array.from({ length: 20 }, () => new Array<number>(10).fill(0));
const fieldWith = (cell: number): number[][] => {
  const f = emptyField();
  f[19]![0] = cell;
  return f;
};
const opp = (id: string, spectrum = emptyField()): OpponentDTO => ({
  id,
  name: id,
  alive: true,
  spectrum,
});

describe('opponentsSlice', () => {
  it('setOpponents builds the roster', () => {
    const s = reducer(init(), opponentsActions.setOpponents([opp('a'), opp('b')]));
    expect(s.ids).toEqual(['a', 'b']);
    expect(s.byId.a!.name).toBe('a');
  });

  it('setOpponents preserves an existing field', () => {
    let s = reducer(init(), opponentsActions.spectrumUpdate({ id: 'a', name: 'a', spectrum: fieldWith(5) }));
    s = reducer(s, opponentsActions.setOpponents([opp('a')]));
    expect(s.byId.a!.spectrum[19]![0]).toBe(5);
  });

  it('spectrumUpdate upserts a missing opponent', () => {
    const s = reducer(init(), opponentsActions.spectrumUpdate({ id: 'z', name: 'zed', spectrum: fieldWith(7) }));
    expect(s.ids).toContain('z');
    expect(s.byId.z!.spectrum[19]![0]).toBe(7);
  });

  it('roundReset wipes each rival field and revives them', () => {
    let s = reducer(init(), opponentsActions.spectrumUpdate({ id: 'a', name: 'a', spectrum: fieldWith(5) }));
    s = reducer(s, opponentsActions.opponentGameOver({ id: 'a' }));
    s = reducer(s, opponentsActions.roundReset());
    expect(s.byId.a!.alive).toBe(true);
    expect(s.byId.a!.spectrum[19]![0]).toBe(0);
    expect(s.placementOrder).toEqual([]);
  });

  it('opponentGameOver flips alive, bumps koSeq, records placement', () => {
    let s = reducer(init(), opponentsActions.setOpponents([opp('a')]));
    s = reducer(s, opponentsActions.opponentGameOver({ id: 'a' }));
    expect(s.byId.a!.alive).toBe(false);
    expect(s.byId.a!.koSeq).toBe(1);
    expect(s.placementOrder).toEqual(['a']);
  });

  it('opponentLeft removes and clearOpponents resets', () => {
    let s = reducer(init(), opponentsActions.setOpponents([opp('a'), opp('b')]));
    s = reducer(s, opponentsActions.opponentLeft({ id: 'a' }));
    expect(s.ids).toEqual(['b']);
    expect(s.byId.a).toBeUndefined();
    expect(reducer(s, opponentsActions.clearOpponents())).toEqual(init());
  });
});
