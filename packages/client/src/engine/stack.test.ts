import { describe, it, expect } from 'vitest';
import { BOARD_WIDTH } from '@shared/constants';
import type { Board, Cell } from '@shared/types';
import { createBoard, cloneBoard } from './board';
import { spawnPiece } from './piece';
import { hardDrop } from './drop';
import { lockPiece, lockStep, type LockState } from './lock';
import { clearLines } from './lines';
import { addPenaltyLines } from './penalty';
import { isGrounded } from './movement';

const rowOf = (v: Cell): Cell[] => Array.from({ length: BOARD_WIDTH }, () => v);
const withRow = (board: Board, row: number, v: Cell): Board => {
  const b = cloneBoard(board);
  b[row] = rowOf(v);
  return b;
};

describe('lockPiece', () => {
  it('merges a piece into a new board (original unchanged)', () => {
    const empty = createBoard();
    const landed = hardDrop(empty, spawnPiece('O'));
    const merged = lockPiece(empty, landed);
    expect(merged).not.toBe(empty);
    expect(empty.flat().every((c) => c === 0)).toBe(true);
    expect(merged.flat().filter((c) => c !== 0)).toHaveLength(4);
  });
  it('drops cells with row<0 (above the board)', () => {
    const empty = createBoard();
    // T at y=-1 has one cell at row -1 (above board) → dropped; 3 cells land at row 0
    const merged = lockPiece(empty, { type: 'T', rotation: 0, x: 3, y: -1 });
    expect(merged.flat().filter((c) => c !== 0)).toHaveLength(3);
  });
});

describe('lockStep (one-frame grace)', () => {
  const empty = createBoard();
  const grounded = hardDrop(empty, spawnPiece('I'));
  it('falls and disarms when not grounded', () => {
    const s: LockState = { piece: spawnPiece('I'), wasGroundedLastFrame: false };
    const out = lockStep(empty, s);
    expect(out.kind).toBe('falling');
    if (out.kind === 'falling') {
      expect(out.state.piece.y).toBe(s.piece.y + 1);
      expect(out.state.wasGroundedLastFrame).toBe(false);
    }
  });
  it('arms (grace) on the first grounded frame', () => {
    const out = lockStep(empty, { piece: grounded, wasGroundedLastFrame: false });
    expect(out.kind).toBe('grounded');
    if (out.kind === 'grounded') expect(out.state.wasGroundedLastFrame).toBe(true);
  });
  it('locks when grounded again (was grounded last frame)', () => {
    expect(isGrounded(empty, grounded)).toBe(true);
    expect(lockStep(empty, { piece: grounded, wasGroundedLastFrame: true }).kind).toBe('lock');
  });
});

describe('clearLines', () => {
  it('clears a single full colored line', () => {
    const r = clearLines(withRow(createBoard(), 19, 1));
    expect(r.cleared).toBe(1);
    expect(r.board.flat().every((c) => c === 0)).toBe(true);
  });
  it('clears multiple full lines at once', () => {
    let b = withRow(createBoard(), 19, 1);
    b = withRow(b, 18, 2);
    b = withRow(b, 17, 3);
    expect(clearLines(b).cleared).toBe(3);
  });
  it('never clears an indestructible penalty line', () => {
    expect(clearLines(withRow(createBoard(), 19, 8)).cleared).toBe(0);
  });
  it('clears the colored line above a penalty line, keeping the penalty', () => {
    let b = withRow(createBoard(), 19, 8); // penalty bottom
    b = withRow(b, 18, 1); // full colored line above
    const r = clearLines(b);
    expect(r.cleared).toBe(1);
    expect(r.board[19]!.every((c) => c === 8)).toBe(true);
  });
  it('returns cleared 0 when no line is full', () => {
    const b = cloneBoard(createBoard());
    b[19]![0] = 1; // partial row
    expect(clearLines(b).cleared).toBe(0);
  });
});

describe('addPenaltyLines', () => {
  it('adds n full-width penalty rows at the bottom, pushing the stack up', () => {
    const r = addPenaltyLines(createBoard(), 2);
    expect(r.toppedOut).toBe(false);
    expect(r.board[19]!.every((c) => c === 8)).toBe(true);
    expect(r.board[18]!.every((c) => c === 8)).toBe(true);
    expect(r.board[17]!.every((c) => c === 0)).toBe(true);
  });
  it('reports toppedOut when blocks are shoved off the top', () => {
    const b = cloneBoard(createBoard());
    b[0]![0] = 1; // a block on the very top row
    expect(addPenaltyLines(b, 1).toppedOut).toBe(true);
  });
  it('is a no-op for n<=0', () => {
    const r = addPenaltyLines(createBoard(), 0);
    expect(r.toppedOut).toBe(false);
    expect(r.board.flat().every((c) => c === 0)).toBe(true);
  });
});
