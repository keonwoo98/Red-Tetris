import type { PieceType } from './types.js';

/** Base order used to seed each 7-bag before shuffling. */
export const PIECE_ORDER = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const;

const BAG_SIZE = 7;
const GOLDEN = 0x9e3779b1; // golden-ratio offset to de-correlate per-bag seeds

/**
 * mulberry32 PRNG. Deterministic across conformant JS engines (only Math.imul + integer ops).
 * Returns a stateful generator yielding floats in [0, 1).
 */
export const makeRng = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Fisher-Yates shuffle of a fresh 7-bag using the given generator. PURE w.r.t. inputs. */
export const shuffleBag = (rng: () => number): PieceType[] => {
  const bag: PieceType[] = [...PIECE_ORDER];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = bag[i]!;
    bag[i] = bag[j]!;
    bag[j] = tmp;
  }
  return bag;
};

/** Alias for streaming/test usage. Never mix with `pieceAt` for the live sequence. */
export const nextBag = (rng: () => number): PieceType[] => shuffleBag(rng);

/**
 * The SOLE authoritative piece accessor. Stateless, idempotent, order-independent:
 * identical `seed` ⇒ identical `pieceAt(seed, i)` for every player, at any time.
 * Throws RangeError on non-integer / negative index.
 */
export const pieceAt = (seed: number, index: number): PieceType => {
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError(`pieceAt: index must be a non-negative integer, got ${index}`);
  }
  const bagIndex = Math.floor(index / BAG_SIZE);
  const inBag = index % BAG_SIZE;
  const bagSeed = (seed + Math.imul(bagIndex, GOLDEN)) >>> 0;
  const piece = shuffleBag(makeRng(bagSeed))[inBag];
  if (piece === undefined) throw new RangeError(`pieceAt: derived undefined at ${index}`);
  return piece;
};
