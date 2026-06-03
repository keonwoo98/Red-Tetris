import { describe, it, expect } from 'vitest';
import { makeRng, shuffleBag, nextBag, pieceAt, PIECE_ORDER } from './rng';
import type { PieceType } from './types';

const seq = (seed: number, n: number): string =>
  Array.from({ length: n }, (_, i) => pieceAt(seed, i)).join('');

describe('makeRng (mulberry32)', () => {
  it('is deterministic: same seed yields the same sequence', () => {
    const a = makeRng(12345);
    const b = makeRng(12345);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces floats in [0, 1)', () => {
    const r = makeRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds diverge', () => {
    expect(makeRng(1)()).not.toEqual(makeRng(2)());
  });

  it('handles seed 0 and large seeds without throwing', () => {
    expect(typeof makeRng(0)()).toBe('number');
    expect(typeof makeRng(0xffffffff)()).toBe('number');
  });
});

describe('shuffleBag', () => {
  it('returns all 7 distinct pieces', () => {
    const bag = shuffleBag(makeRng(99));
    expect(bag).toHaveLength(7);
    expect(new Set(bag).size).toBe(7);
    for (const p of PIECE_ORDER) expect(bag).toContain(p);
  });

  it('does not mutate PIECE_ORDER', () => {
    const before = [...PIECE_ORDER];
    shuffleBag(makeRng(1));
    expect([...PIECE_ORDER]).toEqual(before);
  });

  it('nextBag is an alias of shuffleBag (same generator → same bag)', () => {
    expect(nextBag(makeRng(5))).toEqual(shuffleBag(makeRng(5)));
  });
});

describe('pieceAt — determinism guarantee', () => {
  it('is stable for the same (seed, index)', () => {
    expect(pieceAt(42, 13)).toBe(pieceAt(42, 13));
  });

  it('two independent clients derive identical sequences from one seed', () => {
    const seed = 0xdeadbeef >>> 0;
    const clientA = Array.from({ length: 70 }, (_, i) => pieceAt(seed, i));
    const clientB = Array.from({ length: 70 }, (_, i) => pieceAt(seed, i));
    expect(clientA).toEqual(clientB);
  });

  it('each 7-index bag contains all 7 piece types exactly once', () => {
    const seed = 123456;
    for (let bag = 0; bag < 6; bag++) {
      const slice: PieceType[] = [];
      for (let i = 0; i < 7; i++) slice.push(pieceAt(seed, bag * 7 + i));
      expect(new Set(slice).size).toBe(7);
    }
  });

  it('different seeds produce different first bags', () => {
    expect(seq(1, 7)).toBe('OJLSTIZ');
    expect(seq(2, 7)).toBe('IZSTLOJ');
    expect(seq(1, 7)).not.toBe(seq(2, 7));
  });

  it('throws RangeError on negative or non-integer index', () => {
    expect(() => pieceAt(1, -1)).toThrow(RangeError);
    expect(() => pieceAt(1, 1.5)).toThrow(RangeError);
    expect(() => pieceAt(1, Number.NaN)).toThrow(RangeError);
  });

  it('golden sequence for seed 42 (regression lock)', () => {
    expect(seq(42, 14)).toBe('SOIJLTZJLTZOIS');
  });
});
