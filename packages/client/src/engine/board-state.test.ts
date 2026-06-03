import { describe, it, expect } from 'vitest';
import type { Board, Cell } from '@shared/types';
import { createBoard, cloneBoard } from './board';
import { spawnPiece } from './piece';
import { ghostPiece } from './drop';
import { computeSpectrum } from './spectrum';
import { isGameOver, isTopOut } from './gameover';
import { overlayForRender } from './render';

const set = (board: Board, col: number, row: number, v: Cell): Board => {
  const b = cloneBoard(board);
  b[row]![col] = v;
  return b;
};

describe('computeSpectrum', () => {
  it('is all zero for an empty board', () => {
    expect(computeSpectrum(createBoard())).toEqual(new Array(10).fill(0));
  });
  it('measures height from the topmost filled cell (holes included)', () => {
    expect(computeSpectrum(set(createBoard(), 0, 19, 1))[0]).toBe(1); // bottom row
    expect(computeSpectrum(set(createBoard(), 3, 0, 1))[3]).toBe(20); // top row
    expect(computeSpectrum(set(createBoard(), 5, 5, 1))[5]).toBe(15); // top block counts
  });
  it('returns a length-10 array', () => {
    expect(computeSpectrum(createBoard())).toHaveLength(10);
  });
});

describe('gameover', () => {
  it('isGameOver is true when a piece collides at its position', () => {
    const board = set(createBoard(), 4, 0, 1);
    // O at (3,-1)→cells cols 4-5 rows 0-1; overlaps (4,0)
    expect(isGameOver(board, { type: 'O', rotation: 0, x: 3, y: -1 })).toBe(true);
  });
  it('isTopOut is false on empty board, true when spawn area is blocked', () => {
    expect(isTopOut(createBoard(), 'I')).toBe(false);
    // I spawn cells are row 0, cols 3-6 → block one
    expect(isTopOut(set(createBoard(), 4, 0, 1), 'I')).toBe(true);
  });
});

describe('overlayForRender', () => {
  it('draws the current piece color onto the grid', () => {
    const grid = overlayForRender(createBoard(), spawnPiece('O'), null);
    // O color id is 2; its cells (cols 4-5 rows 0-1)
    expect(grid[0]![4]).toBe(2);
    expect(grid[1]![5]).toBe(2);
  });
  it('draws the ghost as 9 only on empty cells, never in the authoritative board', () => {
    const board = createBoard();
    const ghost = ghostPiece(board, spawnPiece('I'));
    const grid = overlayForRender(board, null, ghost);
    const flatGhost = grid.flat().filter((c) => c === 9);
    expect(flatGhost.length).toBe(4);
    expect(board.flat().every((c) => c === 0)).toBe(true); // authoritative board untouched (no 9)
  });
  it('current piece takes precedence over the ghost where they overlap', () => {
    const grid = overlayForRender(createBoard(), spawnPiece('O'), ghostPiece(createBoard(), spawnPiece('O')));
    // current O cells should be color 2, not ghost 9
    expect(grid[0]![4]).toBe(2);
  });
});
