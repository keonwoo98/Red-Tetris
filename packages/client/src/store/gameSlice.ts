import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { WritableDraft } from 'immer';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  COMBO_BONUS,
  EMPTY,
  LINES_PER_LEVEL,
  MAX_LOCK_RESETS,
  PERFECT_CLEAR_BONUS,
  PREVIEW_COUNT,
  SCORE_TABLE,
  SOFT_DROP_POINTS,
  type GameMode,
} from '@shared/constants';
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
  lockResets: number; // move/rotate re-arms used since grounding (anti-stall cap)
  lastWasRotation: boolean; // true if the last successful action was a rotation (for T-spin)
  pendingPenalty: number;
  lockEvent: { board: Board; cleared: number; pieceIndex: number } | null;
  softDropActive: boolean;
  alive: boolean;
  winnerId: string | null;
  // bonus: scoring (does not affect the win condition)
  score: number;
  lines: number;
  level: number;
  combo: number;
  b2b: number;
  mode: GameMode;
  // render-only: bumps `seq` each time lines clear so the board can replay a flash
  clearFx: {
    lines: number;
    seq: number;
    combo: number;
    b2b: number;
    perfect: boolean;
    tSpin: boolean;
  } | null;
  // render-only: hard-drop impact (shake amplitude) and freshly-locked cells (flash)
  dropFx: { seq: number; amp: number } | null;
  lockFx: { seq: number; cells: [number, number][] } | null;
  // render-only: the most recent incoming attack (who hit me, how hard)
  lastAttack: { fromId: string | null; fromName: string | null; count: number; seq: number } | null;
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
  lockResets: 0,
  lastWasRotation: false,
  pendingPenalty: 0,
  lockEvent: null,
  softDropActive: false,
  alive: true,
  winnerId: null,
  score: 0,
  lines: 0,
  level: 1,
  combo: 0,
  b2b: 0,
  mode: 'classic',
  clearFx: null,
  dropFx: null,
  lockFx: null,
  lastAttack: null,
  hold: null,
  canHold: true,
});

type Draft = WritableDraft<GameState>;

const playable = (s: Draft): boolean => s.status === 'playing' && s.alive && s.current !== null;

/**
 * After a move/rotate: if the piece floated free, re-arm and clear the reset budget.
 * If it's still grounded, a move/rotate also re-arms the one-tick grace (up to MAX_LOCK_RESETS)
 * so players can tuck pieces and spin into gaps near the floor — modern lock-delay feel.
 */
const reArm = (s: Draft): void => {
  if (!s.current) return;
  if (!isGrounded(s.board as Board, s.current as ActivePiece)) {
    s.wasGroundedLastFrame = false;
    s.lockResets = 0;
  } else if (s.wasGroundedLastFrame && s.lockResets < MAX_LOCK_RESETS) {
    s.wasGroundedLastFrame = false;
    s.lockResets += 1;
  }
};

const topOut = (s: Draft): void => {
  s.status = 'gameover';
  s.alive = false;
  s.current = null;
};

/** A corner counts as "filled" for the T-spin rule if it holds a block or is a wall/floor; open sky does not. */
const cornerFilled = (board: Board, x: number, y: number): boolean => {
  if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) return true;
  if (y < 0) return false;
  return (board[y]?.[x] ?? EMPTY) !== EMPTY;
};

/** 3-corner rule: a T with ≥3 of its bounding-box corners occupied. Pair with `lastWasRotation` at the call site. */
const isTSpin = (board: Board, p: ActivePiece): boolean => {
  if (p.type !== 'T') return false;
  const corners: [number, number][] = [
    [p.x, p.y],
    [p.x + 2, p.y],
    [p.x, p.y + 2],
    [p.x + 2, p.y + 2],
  ];
  return corners.filter(([x, y]) => cornerFilled(board, x, y)).length >= 3;
};

/** Bonus points for a T-spin by lines cleared (index 0..3), multiplied by the current level. */
const TSPIN_SCORE = [400, 800, 1200, 1600] as const;

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

  // 2. recognise a T-spin against the resting stack (the last action must have been a real rotation)
  const tSpin = s.lastWasRotation && isTSpin(s.board as Board, s.current as ActivePiece);

  // 3. lock + clear
  const lockedCells: [number, number][] = cellsAt(s.current as ActivePiece)
    .filter(([, r]) => r >= 0)
    .map(([c, r]) => [c, r]);
  const locked = lockPiece(s.board as Board, s.current as ActivePiece);
  const { board: cleared, cleared: n } = clearLines(locked);
  s.board = cleared;
  s.lockFx = { seq: (s.lockFx?.seq ?? 0) + 1, cells: lockedCells };
  if (n > 0) {
    s.combo += 1;
    if (n >= 4 || tSpin) s.b2b += 1; // tetrises and T-spin clears sustain the back-to-back chain
    else s.b2b = 0;
    const perfect = cleared.every((row) => row.every((c) => c === 0));
    const base = tSpin ? (TSPIN_SCORE[n] ?? 0) : (SCORE_TABLE[n] ?? 0);
    s.score += base * s.level;
    if (s.combo > 1) s.score += COMBO_BONUS * (s.combo - 1) * s.level; // consecutive-clear chain bonus
    if (perfect) s.score += PERFECT_CLEAR_BONUS * s.level; // all-clear (perfect clear) bonus
    s.lines += n;
    s.level = Math.floor(s.lines / LINES_PER_LEVEL) + 1;
    s.clearFx = {
      lines: n,
      seq: (s.clearFx?.seq ?? 0) + 1,
      combo: s.combo,
      b2b: s.b2b,
      perfect,
      tSpin,
    };
  } else if (tSpin) {
    // a T-spin with no line clear still scores and pops, and leaves the combo/b2b chain intact
    s.score += TSPIN_SCORE[0] * s.level;
    s.clearFx = {
      lines: 0,
      seq: (s.clearFx?.seq ?? 0) + 1,
      combo: s.combo,
      b2b: s.b2b,
      perfect: false,
      tSpin: true,
    };
  } else {
    s.combo = 0;
  }
  s.pieceIndex += 1;
  s.lockEvent = { board: cleared, cleared: n, pieceIndex: s.pieceIndex };

  // 4. spawn the next piece (deterministic); top out if it cannot enter
  const nextPiece = spawnPiece(pieceAt(s.seed, s.pieceIndex));
  s.next = nextQueue(s.seed, s.pieceIndex + 1, PREVIEW_COUNT);
  if (collides(cleared, nextPiece)) {
    topOut(s);
    return;
  }
  s.current = nextPiece;
  s.wasGroundedLastFrame = false;
  s.lockResets = 0;
  s.lastWasRotation = false;
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
        s.lastWasRotation = false;
        reArm(s);
      }
    },
    moveRight(s) {
      if (playable(s)) {
        s.current = engineMoveRight(s.board as Board, s.current as ActivePiece);
        s.lastWasRotation = false;
        reArm(s);
      }
    },
    rotateCW(s) {
      if (playable(s)) {
        const prev = s.current as ActivePiece;
        const rotated = rotate(s.board as Board, prev);
        s.current = rotated;
        s.lastWasRotation = rotated !== prev; // true only if it actually turned
        reArm(s);
      }
    },
    softDrop(s) {
      if (playable(s)) {
        const before = (s.current as ActivePiece).y;
        s.current = moveDown(s.board as Board, s.current as ActivePiece);
        if ((s.current as ActivePiece).y > before) s.score += SOFT_DROP_POINTS;
        s.lastWasRotation = false;
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
        // a hard drop that travels was a translation, not a spin; a 0-cell drop keeps a prior rotation (T-spin)
        if (dist > 0) s.lastWasRotation = false;
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
      s.lockResets = 0;
      s.lastWasRotation = false;
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
        if (out.kind === 'falling') {
          // a natural gravity fall clears the T-spin flag; only a rotation right before lock counts
          s.lastWasRotation = false;
          if (s.softDropActive) s.score += SOFT_DROP_POINTS; // soft-drop cells score while held
        }
        s.current = out.state.piece;
        s.wasGroundedLastFrame = out.state.wasGroundedLastFrame;
      }
    },
    applyPenalty(s, a: PayloadAction<{ n: number; fromId?: string; fromName?: string }>) {
      if (s.status !== 'playing') return;
      s.pendingPenalty += a.payload.n;
      s.lastAttack = {
        fromId: a.payload.fromId ?? null,
        fromName: a.payload.fromName ?? null,
        count: a.payload.n,
        seq: (s.lastAttack?.seq ?? 0) + 1,
      };
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
