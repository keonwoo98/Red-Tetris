import { describe, it, expect } from 'vitest';
import { BOARD_HEIGHT, BOARD_WIDTH } from '@shared/constants';
import { cellsAt } from '@shared/tetrominoes';
import { pieceAt } from '@shared/rng';
import type { Board, Cell } from '@shared/types';
import { createBoard, cloneBoard, inBounds, emptyRow } from './board';
import { spawnPiece, pieceCells, pieceColor, nextQueue } from './piece';
import { collides } from './collision';
import { moveLeft, moveRight, moveDown, isGrounded } from './movement';
import { rotate } from './rotation';
import { softDrop, hardDrop, ghostPiece } from './drop';

const set = (board: Board, col: number, row: number, v: Cell): Board => {
  const b = cloneBoard(board);
  b[row]![col] = v;
  return b;
};
const allPenalty = (): Board => createBoard().map((r) => r.map(() => 8 as Cell));

describe('board', () => {
  it('createBoard is 20×10 of EMPTY', () => {
    const b = createBoard();
    expect(b).toHaveLength(BOARD_HEIGHT);
    for (const row of b) {
      expect(row).toHaveLength(BOARD_WIDTH);
      expect(row.every((c) => c === 0)).toBe(true);
    }
  });
  it('cloneBoard makes an independent deep copy', () => {
    const a = createBoard();
    const b = cloneBoard(a);
    b[0]![0] = 5;
    expect(a[0]![0]).toBe(0);
  });
  it('emptyRow is length 10 of EMPTY', () => {
    expect(emptyRow()).toEqual(new Array(10).fill(0));
  });
  it('inBounds rejects out-of-range and row<0', () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(9, 19)).toBe(true);
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(10, 0)).toBe(false);
    expect(inBounds(0, 20)).toBe(false);
    expect(inBounds(0, -1)).toBe(false);
  });
});

describe('piece', () => {
  it('spawnPiece is rotation 0 at origin (3,-1)', () => {
    expect(spawnPiece('T')).toEqual({ type: 'T', rotation: 0, x: 3, y: -1 });
  });
  it('pieceCells matches shared cellsAt as {col,row}', () => {
    const p = spawnPiece('I');
    expect(pieceCells(p)).toEqual(cellsAt(p).map(([col, row]) => ({ col, row })));
  });
  it('pieceColor maps I→1, L→7', () => {
    expect(pieceColor('I')).toBe(1);
    expect(pieceColor('L')).toBe(7);
  });
  it('nextQueue derives a run from the seed', () => {
    expect(nextQueue(42, 0, 5)).toEqual([0, 1, 2, 3, 4].map((i) => pieceAt(42, i)));
    expect(nextQueue(42, 3, 2)).toEqual([pieceAt(42, 3), pieceAt(42, 4)]);
  });
});

describe('collision', () => {
  const empty = createBoard();
  it('spawn piece does not collide on an empty board (row<0 allowed)', () => {
    expect(collides(empty, spawnPiece('T'))).toBe(false);
  });
  it('detects left/right wall and floor', () => {
    expect(collides(empty, { type: 'O', rotation: 0, x: -2, y: 5 })).toBe(true);
    expect(collides(empty, { type: 'O', rotation: 0, x: BOARD_WIDTH, y: 5 })).toBe(true);
    expect(collides(empty, { type: 'O', rotation: 0, x: 3, y: BOARD_HEIGHT })).toBe(true);
  });
  it('detects overlap with a settled cell', () => {
    // O at (3,5) occupies cols 4-5 rows 6-7
    const board = set(empty, 4, 6, 1);
    expect(collides(board, { type: 'O', rotation: 0, x: 3, y: 5 })).toBe(true);
  });
});

describe('movement', () => {
  const empty = createBoard();
  it('moveLeft/Right shift one column on open board', () => {
    const p = spawnPiece('T');
    expect(moveLeft(empty, p).x).toBe(p.x - 1);
    expect(moveRight(empty, p).x).toBe(p.x + 1);
  });
  it('returns the SAME piece when blocked by a wall', () => {
    const atLeft = { type: 'O' as const, rotation: 0 as const, x: -1, y: 5 };
    expect(moveLeft(empty, atLeft)).toBe(atLeft);
    // O occupies box cols 1-2, so the rightmost valid x is BOARD_WIDTH-3 (cells in cols 8-9)
    const atRight = { type: 'O' as const, rotation: 0 as const, x: BOARD_WIDTH - 3, y: 5 };
    expect(moveRight(empty, atRight)).toBe(atRight);
  });
  it('moveDown advances, and stops at the floor', () => {
    const p = spawnPiece('T');
    expect(moveDown(empty, p).y).toBe(p.y + 1);
    const landed = hardDrop(empty, p);
    expect(moveDown(empty, landed)).toBe(landed);
  });
  it('isGrounded is false mid-air, true at rest', () => {
    const p = spawnPiece('I');
    expect(isGrounded(empty, p)).toBe(false);
    expect(isGrounded(empty, hardDrop(empty, p))).toBe(true);
  });
});

describe('rotation', () => {
  const empty = createBoard();
  it('O never rotates', () => {
    const o = spawnPiece('O');
    expect(rotate(empty, o)).toBe(o);
  });
  it('T rotates CW to state 1 on open board', () => {
    const t = { type: 'T' as const, rotation: 0 as const, x: 3, y: 5 };
    expect(rotate(empty, t).rotation).toBe(1);
  });
  it('returns the SAME piece when every kick collides', () => {
    let board = allPenalty();
    const p = { type: 'T' as const, rotation: 0 as const, x: 3, y: 5 };
    // carve out exactly the current cells so the piece fits but cannot rotate
    for (const { col, row } of pieceCells(p)) board = set(board, col, row, 0);
    expect(rotate(board, p)).toBe(p);
  });
});

describe('drop', () => {
  const empty = createBoard();
  it('softDrop equals one moveDown', () => {
    const p = spawnPiece('L');
    expect(softDrop(empty, p)).toEqual(moveDown(empty, p));
  });
  it('hardDrop lands the piece grounded; ghost matches', () => {
    const p = spawnPiece('I');
    const landed = hardDrop(empty, p);
    expect(isGrounded(empty, landed)).toBe(true);
    expect(ghostPiece(empty, p)).toEqual(landed);
  });
});
