import { describe, it, expect } from 'vitest';
import type { OpponentDTO } from '@shared/protocol';
import reducer, { opponentsActions, type OpponentsState } from './opponentsSlice';

const init = (): OpponentsState => reducer(undefined, { type: '@@INIT' });
const opp = (id: string, spectrum = new Array(10).fill(0)): OpponentDTO => ({
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

  it('setOpponents preserves an existing spectrum', () => {
    let s = reducer(init(), opponentsActions.spectrumUpdate({ id: 'a', name: 'a', spectrum: [5, 0, 0, 0, 0, 0, 0, 0, 0, 0] }));
    s = reducer(s, opponentsActions.setOpponents([opp('a')]));
    expect(s.byId.a!.spectrum[0]).toBe(5);
  });

  it('spectrumUpdate upserts a missing opponent', () => {
    const s = reducer(init(), opponentsActions.spectrumUpdate({ id: 'z', name: 'zed', spectrum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }));
    expect(s.ids).toContain('z');
    expect(s.byId.z!.spectrum[9]).toBe(10);
  });

  it('opponentGameOver flips alive', () => {
    let s = reducer(init(), opponentsActions.setOpponents([opp('a')]));
    s = reducer(s, opponentsActions.opponentGameOver({ id: 'a' }));
    expect(s.byId.a!.alive).toBe(false);
  });

  it('opponentLeft removes and clearOpponents resets', () => {
    let s = reducer(init(), opponentsActions.setOpponents([opp('a'), opp('b')]));
    s = reducer(s, opponentsActions.opponentLeft({ id: 'a' }));
    expect(s.ids).toEqual(['b']);
    expect(s.byId.a).toBeUndefined();
    expect(reducer(s, opponentsActions.clearOpponents())).toEqual(init());
  });
});
