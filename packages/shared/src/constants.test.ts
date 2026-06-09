import { describe, it, expect } from 'vitest';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  SPECTRUM_LENGTH,
  EMPTY,
  PENALTY,
  GHOST,
  GRAVITY_MS,
  SOFT_DROP_FACTOR,
  SOFT_DROP_MS,
  SPAWN,
  COLOR_ID,
  COLOR_HEX,
  RISING_GRAVITY_MIN_MS,
  risingGravityMs,
} from './constants';
import type { PieceType } from './types';

const ALL: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

describe('board dimensions', () => {
  it('is a 10×20 field with a length-10 spectrum', () => {
    expect(BOARD_WIDTH).toBe(10);
    expect(BOARD_HEIGHT).toBe(20);
    expect(SPECTRUM_LENGTH).toBe(10);
  });
});

describe('cell sentinels', () => {
  it('reserves 0 empty, 8 penalty, 9 ghost', () => {
    expect(EMPTY).toBe(0);
    expect(PENALTY).toBe(8);
    expect(GHOST).toBe(9);
  });
});

describe('timing', () => {
  it('keeps soft drop consistent with gravity', () => {
    expect(GRAVITY_MS).toBe(1000);
    expect(SOFT_DROP_MS).toBe(GRAVITY_MS / SOFT_DROP_FACTOR);
  });

  it('rising gravity drops a big step per level, faster than classic, clamped at the floor', () => {
    expect(risingGravityMs(1)).toBe(800); // level 1 — already faster than classic 1000
    expect(risingGravityMs(1)).toBeLessThan(GRAVITY_MS);
    expect(risingGravityMs(2)).toBe(600); // −200 ms per level (every 10 lines)
    expect(risingGravityMs(3)).toBe(400);
    expect(risingGravityMs(4)).toBe(200);
    expect(risingGravityMs(5)).toBe(RISING_GRAVITY_MIN_MS); // 80 (floor) by level 5
    expect(risingGravityMs(99)).toBe(RISING_GRAVITY_MIN_MS); // clamped, never goes lower
    expect(risingGravityMs(5)).toBeGreaterThanOrEqual(SOFT_DROP_MS); // never beats a manual soft drop
  });
});

describe('SPAWN', () => {
  it('defines a spawn origin for every piece', () => {
    for (const t of ALL) {
      expect(SPAWN[t]).toEqual({ x: 3, y: -1 });
    }
  });
});

describe('colors', () => {
  it('maps every piece to a distinct color id', () => {
    expect(new Set(ALL.map((t) => COLOR_ID[t])).size).toBe(7);
  });
  it('provides a hex for every cell id 0-9', () => {
    for (let id = 0; id <= 9; id++) {
      expect(COLOR_HEX[id]).toBeTypeOf('string');
    }
  });
});
