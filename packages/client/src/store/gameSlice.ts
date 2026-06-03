import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { WritableDraft } from 'immer';
import { LINES_PER_LEVEL, PREVIEW_COUNT, SCORE_TABLE, type GameMode } from '@shared/constants';
import { pieceAt } from '@shared/rng';
import { cellsAt } from '@shared/tetrominoes';
import type { ActivePiece, Board, PieceType } from '@shared/types';
import {
  addPenaltyLines,
  clearLines,
  collides,
  createBoard,
  hardDrop as engineHardDrop,
  isGrounded,
  lockPiece,
  lockStep,
  moveDown,
  moveLeft as engineMoveLeft,
  moveRight as engineMoveRight,
  nextQueue,
  rotate,
  spawnPiece,
} from '../engine';

export interface GameState {
  seed: number | null;
  board: Board;
  current: ActivePiece | null;
  pieceIndex: number;
  next: PieceType[];
  status: 'idle' | 'playing' | 'gameover';
  wasGroundedLastFrame: boolean;
  pendingPenalty: number;
  lockEvent: { board: Board; cleared: number; pieceIndex: number } | null;
  softDropActive: boolean;
  alive: boolean;
  winnerId: string | null;
  // bonus: scoring (does not affect the win condition)
  score: number;
  lines: number;
  level: number;
  mode: GameMode;
  // render-only: bumps `seq` each time lines clear so the board can replay a flash
  clearFx: { lines: number; seq: number } | null;
  // render-only: hard-drop impact (shake amplitude) and freshly-locked cells (flash)
  dropFx: { seq: number; amp: number } | null;
  lockFx: { seq: number; cells: [number, number][] } | null;
  // hold slot: stash a piece; one hold per drop (re-armed on lock)
  hold: PieceType | null;
  canHold: boolean;
}

const freshState = (): GameState => ({
  seed: null,
  board: createBoard(),
  current: null,
  pieceIndex: 0,
  next: [],
  status: 'idle',
  wasGroundedLastFrame: false,
  pendingPenalty: 0,
  lockEvent: null,
  softDropActive: false,
  alive: true,
  winnerId: null,
  score: 0,
  lines: 0,
  level: 1,
  mode: 'classic',
  clearFx: null,
  dropFx: null,
  lockFx: null,
  hold: null,
  canHold: true,
});

type Draft = WritableDraft<GameState>;

const playable = (s: Draft): boolean => s.status === 'playing' && s.alive && s.current !== null;

/** After a move/rotate, re-arm the lock delay if the piece is no longer grounded. */
const reArm = (s: Draft): void => {
  if (s.current && !isGrounded(s.board as Board, s.current as ActivePiece)) {
    s.wasGroundedLastFrame = false;
  }
};

const topOut = (s: Draft): void => {
  s.status = 'gameover';
  s.alive = false;
  s.current = null;
};

/** Lock the current piece into the board, flushing pending penalty first, then spawn the next. */
const commitLock = (s: Draft): void => {
  if (s.current === null || s.seed === null) return;

  // 1. flush queued penalty BEFORE locking so the piece sees the shifted stack
  if (s.pendingPenalty > 0) {
    const { board, toppedOut } = addPenaltyLines(s.board as Board, s.pendingPenalty);
    s.board = board;
    s.pendingPenalty = 0;
    if (toppedOut || collides(board, s.current as ActivePiece)) {
      s.lockEvent = { board, cleared: 0, pieceIndex: s.pieceIndex };
      topOut(s);
      return;
    }
  }

  // 2. lock + clear
  const lockedCells: [number, number][] = cellsAt(s.current as ActivePiece)
    .filter(([, r]) => r >= 0)
    .map(([c, r]) => [c, r]);
  const locked = lockPiece(s.board as Board, s.current as ActivePiece);
  const { board: cleared, cleared: n } = clearLines(locked);
  s.board = cleared;
  s.lockFx = { seq: (s.lockFx?.seq ?? 0) + 1, cells: lockedCells };
  if (n > 0) {
    s.score += (SCORE_TABLE[n] ?? 0) * s.level;
    s.lines += n;
    s.level = Math.floor(s.lines / LINES_PER_LEVEL) + 1;
    s.clearFx = { lines: n, seq: (s.clearFx?.seq ?? 0) + 1 };
  }
  s.pieceIndex += 1;
  s.lockEvent = { board: cleared, cleared: n, pieceIndex: s.pieceIndex };

  // 3. spawn the next piece (deterministic); top out if it cannot enter
  const nextPiece = spawnPiece(pieceAt(s.seed, s.pieceIndex));
  s.next = nextQueue(s.seed, s.pieceIndex + 1, PREVIEW_COUNT);
  if (collides(cleared, nextPiece)) {
    topOut(s);
    return;
  }
  s.current = nextPiece;
  s.wasGroundedLastFrame = false;
  s.canHold = true; // re-arm hold for the new piece
};

const gameSlice = createSlice({
  name: 'game',
  initialState: freshState(),
  reducers: {
    startGame(s, a: PayloadAction<{ seed: number; mode?: GameMode }>) {
      const fresh = freshState();
      Object.assign(s, fresh);
      s.seed = a.payload.seed;
      s.mode = a.payload.mode ?? 'classic';
      s.status = 'playing';
      s.current = spawnPiece(pieceAt(a.payload.seed, 0));
      s.next = nextQueue(a.payload.seed, 1, PREVIEW_COUNT);
      if (collides(s.board as Board, s.current as ActivePiece)) topOut(s);
    },
    moveLeft(s) {
      if (playable(s)) {
        s.current = engineMoveLeft(s.board as Board, s.current as ActivePiece);
        reArm(s);
      }
    },
    moveRight(s) {
      if (playable(s)) {
        s.current = engineMoveRight(s.board as Board, s.current as ActivePiece);
        reArm(s);
      }
    },
    rotateCW(s) {
      if (playable(s)) {
        s.current = rotate(s.board as Board, s.current as ActivePiece);
        reArm(s);
      }
    },
    softDrop(s) {
      if (playable(s)) {
        s.current = moveDown(s.board as Board, s.current as ActivePiece);
        reArm(s);
      }
    },
    hardDrop(s) {
      if (playable(s)) {
        const prev = s.current as ActivePiece;
        const landed = engineHardDrop(s.board as Board, prev);
        const dist = landed.y - prev.y;
        s.score += Math.max(0, dist); // 1 point per cell hard-dropped
        s.dropFx = { seq: (s.dropFx?.seq ?? 0) + 1, amp: Math.min(6, 1 + Math.floor(dist / 4)) };
        s.current = landed;
        commitLock(s);
      }
    },
    setSoftDrop(s, a: PayloadAction<boolean>) {
      s.softDropActive = a.payload;
    },
    holdPiece(s) {
      if (!playable(s) || !s.canHold || s.seed === null) return;
      const currentType = (s.current as ActivePiece).type;
      if (s.hold === null) {
        // stash current, pull the next piece from the deterministic stream
        s.hold = currentType;
        s.pieceIndex += 1;
        const nextPiece = spawnPiece(pieceAt(s.seed, s.pieceIndex));
        s.next = nextQueue(s.seed, s.pieceIndex + 1, PREVIEW_COUNT);
        if (collides(s.board as Board, nextPiece)) {
          topOut(s);
          return;
        }
        s.current = nextPiece;
      } else {
        // swap current with the held piece (no stream advance)
        const swapped = spawnPiece(s.hold);
        if (collides(s.board as Board, swapped)) return; // blocked — keep current
        s.hold = currentType;
        s.current = swapped;
      }
      s.canHold = false;
      s.wasGroundedLastFrame = false;
    },
    tick(s) {
      if (!playable(s)) return;
      const out = lockStep(s.board as Board, {
        piece: s.current as ActivePiece,
        wasGroundedLastFrame: s.wasGroundedLastFrame,
      });
      if (out.kind === 'lock') {
        commitLock(s);
      } else {
        s.current = out.state.piece;
        s.wasGroundedLastFrame = out.state.wasGroundedLastFrame;
      }
    },
    applyPenalty(s, a: PayloadAction<{ n: number }>) {
      if (s.status !== 'playing') return;
      s.pendingPenalty += a.payload.n;
      // flush immediately if we are between pieces (no current to lock against)
      if (s.current === null) {
        const { board, toppedOut } = addPenaltyLines(s.board as Board, s.pendingPenalty);
        s.board = board;
        s.pendingPenalty = 0;
        if (toppedOut) topOut(s);
      }
    },
    clearLockEvent(s) {
      s.lockEvent = null;
    },
    topOut(s) {
      topOut(s);
    },
    gameOver(s, a: PayloadAction<{ winnerId: string | null }>) {
      s.winnerId = a.payload.winnerId;
      s.status = 'gameover';
    },
    resetGame() {
      return freshState();
    },
  },
});

export const gameActions = gameSlice.actions;
export default gameSlice.reducer;
