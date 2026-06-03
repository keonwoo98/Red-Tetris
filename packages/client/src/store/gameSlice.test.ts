import { describe, it, expect } from 'vitest';
import { pieceAt } from '@shared/rng';
import { spawnPiece } from '@shared/tetrominoes';
import type { Cell } from '@shared/types';
import reducer, { gameActions, type GameState } from './gameSlice';
import { createBoard, hardDrop as engineHardDrop } from '../engine';

const init = (): GameState => reducer(undefined, { type: '@@INIT' });

const playing = (over: Partial<GameState> = {}): GameState => ({
  ...init(),
  seed: 42,
  status: 'playing',
  board: createBoard(),
  current: spawnPiece(pieceAt(42, 0)),
  pieceIndex: 0,
  next: [pieceAt(42, 1)],
  alive: true,
  ...over,
});

describe('startGame', () => {
  it('initialises a deterministic round from the seed', () => {
    const s = reducer(init(), gameActions.startGame({ seed: 42 }));
    expect(s.status).toBe('playing');
    expect(s.seed).toBe(42);
    expect(s.current).toEqual(spawnPiece(pieceAt(42, 0)));
    expect(s.next).toEqual([pieceAt(42, 1)]);
    expect(s.alive).toBe(true);
  });
});

describe('movement reducers', () => {
  it('move/rotate/softDrop only act while playable', () => {
    const s = playing();
    expect(reducer(s, gameActions.moveLeft()).current!.x).toBe(s.current!.x - 1);
    expect(reducer(s, gameActions.moveRight()).current!.x).toBe(s.current!.x + 1);
    expect(reducer(s, gameActions.softDrop()).current!.y).toBe(s.current!.y + 1);
    expect(reducer(s, gameActions.rotateCW()).current!.rotation).toBe(1);
  });

  it('ignores input when not playing', () => {
    expect(reducer(init(), gameActions.moveLeft())).toEqual(init());
  });

  it('keeps the lock armed when a grounded move stays grounded', () => {
    const landed = engineHardDrop(createBoard(), spawnPiece('O'));
    const s = playing({ current: landed, wasGroundedLastFrame: true });
    expect(reducer(s, gameActions.moveLeft()).wasGroundedLastFrame).toBe(true);
  });
});

describe('hardDrop + commitLock', () => {
  it('locks, advances the index, spawns the next piece, and sets a single lockEvent', () => {
    const after = reducer(playing(), gameActions.hardDrop());
    expect(after.pieceIndex).toBe(1);
    expect(after.current).toEqual(spawnPiece(pieceAt(42, 1)));
    expect(after.lockEvent).not.toBeNull();
    expect(after.lockEvent!.pieceIndex).toBe(1);
    expect(after.lockEvent!.cleared).toBe(0);
  });

  it('clears a completed line on lock', () => {
    const board = createBoard();
    for (let c = 0; c < 10; c++) if (c < 3 || c > 6) board[19]![c] = 1 as Cell;
    const after = reducer(
      playing({ board, current: spawnPiece('I'), pieceIndex: 0 }),
      gameActions.hardDrop(),
    );
    expect(after.lockEvent!.cleared).toBe(1);
  });

  it('clearLockEvent consumes the event exactly once', () => {
    const locked = reducer(playing(), gameActions.hardDrop());
    expect(locked.lockEvent).not.toBeNull();
    expect(reducer(locked, gameActions.clearLockEvent()).lockEvent).toBeNull();
  });

  it('flushes pending penalty before locking and tops out on overlap', () => {
    const after = reducer(
      playing({ pendingPenalty: 3, current: spawnPiece('I') }),
      gameActions.hardDrop(),
    );
    expect(after.status).toBe('gameover');
    expect(after.lockEvent).not.toBeNull();
    expect(after.lockEvent!.cleared).toBe(0);
  });
});

describe('tick (gravity + lock delay)', () => {
  it('falls one row when airborne', () => {
    const s = playing();
    expect(reducer(s, gameActions.tick()).current!.y).toBe(s.current!.y + 1);
  });

  it('arms the grace on first grounded frame, locks on the next', () => {
    const landed = engineHardDrop(createBoard(), spawnPiece('S'));
    const armed = reducer(
      playing({ current: landed, wasGroundedLastFrame: false }),
      gameActions.tick(),
    );
    expect(armed.wasGroundedLastFrame).toBe(true);
    expect(armed.pieceIndex).toBe(0);
    const locked = reducer(
      playing({ current: landed, wasGroundedLastFrame: true }),
      gameActions.tick(),
    );
    expect(locked.pieceIndex).toBe(1);
  });
});

describe('applyPenalty', () => {
  it('queues penalty while a piece is active', () => {
    expect(reducer(playing(), gameActions.applyPenalty({ n: 2 })).pendingPenalty).toBe(2);
  });

  it('flushes immediately between pieces', () => {
    const after = reducer(playing({ current: null }), gameActions.applyPenalty({ n: 2 }));
    expect(after.pendingPenalty).toBe(0);
    expect(after.board[19]!.every((c) => c === 8)).toBe(true);
    expect(after.board[18]!.every((c) => c === 8)).toBe(true);
  });

  it('tops out if an immediate flush overflows', () => {
    const board = createBoard();
    board[0]![0] = 1 as Cell; // a block on the very top row
    const after = reducer(
      playing({ current: null, board }),
      gameActions.applyPenalty({ n: 1 }),
    );
    expect(after.status).toBe('gameover');
  });

  it('ignores penalty when not playing', () => {
    expect(reducer(init(), gameActions.applyPenalty({ n: 2 })).pendingPenalty).toBe(0);
  });
});

describe('terminal + misc reducers', () => {
  it('topOut / gameOver / resetGame / setSoftDrop', () => {
    expect(reducer(playing(), gameActions.topOut()).status).toBe('gameover');
    expect(reducer(playing(), gameActions.gameOver({ winnerId: 'x' })).winnerId).toBe('x');
    expect(reducer(playing(), gameActions.resetGame()).status).toBe('idle');
    expect(reducer(playing(), gameActions.setSoftDrop(true)).softDropActive).toBe(true);
  });
});

describe('scoring (bonus)', () => {
  it('awards points and counts lines on a clear', () => {
    const board = createBoard();
    for (let c = 0; c < 10; c++) if (c < 3 || c > 6) board[19]![c] = 1 as Cell;
    const after = reducer(playing({ board, current: spawnPiece('I') }), gameActions.hardDrop());
    expect(after.lines).toBe(1);
    expect(after.score).toBeGreaterThanOrEqual(100); // single (100 × level 1) + drop bonus
    expect(after.clearFx?.lines).toBe(1); // render flash signal
  });

  it('awards a hard-drop bonus even without a clear', () => {
    expect(reducer(playing(), gameActions.hardDrop()).score).toBeGreaterThan(0);
  });

  it('raises the level every 10 lines', () => {
    const board = createBoard();
    for (let c = 0; c < 10; c++) if (c < 3 || c > 6) board[19]![c] = 1 as Cell;
    const after = reducer(playing({ board, current: spawnPiece('I'), lines: 9 }), gameActions.hardDrop());
    expect(after.lines).toBe(10);
    expect(after.level).toBe(2);
  });

  it('startGame resets score, lines and level', () => {
    const s = reducer(playing({ score: 999, lines: 5, level: 3 }), gameActions.startGame({ seed: 1 }));
    expect([s.score, s.lines, s.level]).toEqual([0, 0, 1]);
  });
});

describe('game modes (bonus)', () => {
  it('startGame applies the broadcast mode, defaulting to classic', () => {
    expect(reducer(init(), gameActions.startGame({ seed: 1, mode: 'rising' })).mode).toBe('rising');
    expect(reducer(init(), gameActions.startGame({ seed: 1, mode: 'invisible' })).mode).toBe('invisible');
    expect(reducer(init(), gameActions.startGame({ seed: 1 })).mode).toBe('classic');
  });
});

describe('hold', () => {
  it('stashes the current piece and advances to the next when empty', () => {
    const after = reducer(playing(), gameActions.holdPiece());
    expect(after.hold).toBe(pieceAt(42, 0));
    expect(after.current!.type).toBe(pieceAt(42, 1));
    expect(after.canHold).toBe(false);
  });

  it('cannot hold twice before a lock', () => {
    const once = reducer(playing(), gameActions.holdPiece());
    const twice = reducer(once, gameActions.holdPiece());
    expect(twice.current).toEqual(once.current);
  });

  it('re-arms hold after a lock', () => {
    expect(reducer(playing(), gameActions.hardDrop()).canHold).toBe(true);
  });

  it('startGame resets the hold slot', () => {
    const held = reducer(playing(), gameActions.holdPiece());
    const fresh = reducer(held, gameActions.startGame({ seed: 1 }));
    expect(fresh.hold).toBeNull();
    expect(fresh.canHold).toBe(true);
  });
});
