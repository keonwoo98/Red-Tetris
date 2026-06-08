import { describe, it, expect } from 'vitest';
import { parseHashRoute } from './hashRoute';

describe('parseHashRoute', () => {
  it('parses the spec bracket form #room[player]', () => {
    expect(parseHashRoute('#neon[alice]')).toEqual({ room: 'neon', player: 'alice' });
  });

  it('also tolerates #room/player', () => {
    expect(parseHashRoute('#neon/bob')).toEqual({ room: 'neon', player: 'bob' });
  });

  it('sanitizes illegal characters', () => {
    expect(parseHashRoute('#ne!on[al ice]')).toEqual({ room: 'neon', player: 'alice' });
  });

  it('returns null when room or player is missing', () => {
    expect(parseHashRoute('#neon')).toBeNull();
    expect(parseHashRoute('#neon[]')).toBeNull();
    expect(parseHashRoute('#')).toBeNull();
    expect(parseHashRoute('')).toBeNull();
  });
});
