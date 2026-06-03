import { describe, it, expect } from 'vitest';
import {
  SHAPES,
  COLORS,
  KICKS_I,
  KICKS_JLSTZ,
  kickKey,
  shapeCells,
  kicksFor,
  cellsAt,
  spawnPiece,
} from './tetrominoes';
import { COLOR_ID } from './constants';
import type { PieceType, RotationState } from './types';

const ALL: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
const ROTS: RotationState[] = [0, 1, 2, 3];

describe('SHAPES', () => {
  it('every piece has 4 rotation states, each with exactly 4 cells', () => {
    for (const t of ALL) {
      expect(SHAPES[t]).toHaveLength(4);
      for (const rot of ROTS) {
        expect(SHAPES[t][rot]).toHaveLength(4);
      }
    }
  });

  it('all box-local coordinates fit the piece bounding box (I/O 4×4, JLSTZ 3×3)', () => {
    for (const t of ALL) {
      const max = t === 'I' || t === 'O' ? 3 : 2;
      for (const rot of ROTS) {
        for (const [c, r] of SHAPES[t][rot]!) {
          expect(c).toBeGreaterThanOrEqual(0);
          expect(r).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThanOrEqual(max);
          expect(r).toBeLessThanOrEqual(max);
        }
      }
    }
  });

  it('O is identical across all rotations', () => {
    expect(SHAPES.O[0]).toEqual(SHAPES.O[1]);
    expect(SHAPES.O[1]).toEqual(SHAPES.O[2]);
    expect(SHAPES.O[2]).toEqual(SHAPES.O[3]);
  });

  it('cells within a rotation are unique', () => {
    for (const t of ALL) {
      for (const rot of ROTS) {
        const keys = SHAPES[t][rot]!.map(([c, r]) => `${c},${r}`);
        expect(new Set(keys).size).toBe(4);
      }
    }
  });
});

describe('COLORS', () => {
  it('matches constants.COLOR_ID exactly', () => {
    expect(COLORS).toEqual(COLOR_ID);
  });
  it('assigns each piece a distinct id 1-7', () => {
    const ids = ALL.map((t) => COLORS[t]);
    expect(new Set(ids).size).toBe(7);
    for (const id of ids) {
      expect(id).toBeGreaterThanOrEqual(1);
      expect(id).toBeLessThanOrEqual(7);
    }
  });
});

describe('kick tables', () => {
  it('have all 8 CW+CCW transition keys, 5 offsets each, first offset [0,0]', () => {
    const keys = ['0>1', '1>0', '1>2', '2>1', '2>3', '3>2', '3>0', '0>3'];
    for (const table of [KICKS_I, KICKS_JLSTZ]) {
      for (const k of keys) {
        expect(table[k]).toBeDefined();
        expect(table[k]).toHaveLength(5);
        expect(table[k]![0]).toEqual([0, 0]);
      }
    }
  });

  it('kickKey builds the transition key', () => {
    expect(kickKey(0, 1)).toBe('0>1');
    expect(kickKey(3, 0)).toBe('3>0');
  });
});

describe('kicksFor', () => {
  it('O never kicks (single [0,0] offset)', () => {
    expect(kicksFor('O', 0, 1)).toEqual([[0, 0]]);
  });
  it('I uses the I table', () => {
    expect(kicksFor('I', 0, 1)).toEqual(KICKS_I['0>1']);
  });
  it('T/S/Z/J/L use the JLSTZ table', () => {
    for (const t of ['T', 'S', 'Z', 'J', 'L'] as PieceType[]) {
      expect(kicksFor(t, 2, 3)).toEqual(KICKS_JLSTZ['2>3']);
    }
  });
});

describe('shapeCells', () => {
  it('returns the table row for a piece+rotation', () => {
    expect(shapeCells('T', 0)).toEqual(SHAPES.T[0]);
  });
});

describe('cellsAt', () => {
  it('translates box-local cells by the piece position', () => {
    const cells = cellsAt({ type: 'I', rotation: 0, x: 3, y: -1 });
    expect(cells).toEqual([
      [3, 0],
      [4, 0],
      [5, 0],
      [6, 0],
    ]);
  });
});

describe('spawnPiece', () => {
  it('spawns each piece at rotation 0, origin (3, -1)', () => {
    for (const t of ALL) {
      const p = spawnPiece(t);
      expect(p).toEqual({ type: t, rotation: 0, x: 3, y: -1 });
    }
  });
});
