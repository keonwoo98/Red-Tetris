import { describe, it, expect } from 'vitest';
import { MAX_LOCK_RESETS } from '@shared/constants';
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
    expect(s.next).toEqual([1, 2, 3, 4, 5].map((i) => pieceAt(42, i)));
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

  it('bumps lockResets when a grounded move stays grounded (restarts the lock timer → tuck window)', () => {
    const landed = engineHardDrop(createBoard(), spawnPiece('O'));
    const after = reducer(playing({ current: landed, lockResets: 0 }), gameActions.moveLeft());
    expect(after.lockResets).toBe(1);
  });

  it('stops bumping lockResets once the reset budget is spent (anti-stall)', () => {
    const landed = engineHardDrop(createBoard(), spawnPiece('O'));
    const after = reducer(
      playing({ current: landed, lockResets: MAX_LOCK_RESETS }),
      gameActions.moveLeft(),
    );
    expect(after.lockResets).toBe(MAX_LOCK_RESETS);
  });

  it('clears the reset budget when a move leaves the piece airborne', () => {
    expect(reducer(playing({ lockResets: 5 }), gameActions.moveLeft()).lockResets).toBe(0);
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

describe('gravity tick + lock delay', () => {
  it('falls one row when airborne', () => {
    const s = playing();
    expect(reducer(s, gameActions.tick()).current!.y).toBe(s.current!.y + 1);
  });

  it('does not move or lock a grounded piece on a gravity tick (lock is the timer’s job)', () => {
    const landed = engineHardDrop(createBoard(), spawnPiece('S'));
    const after = reducer(playing({ current: landed }), gameActions.tick());
    expect(after.current!.y).toBe(landed.y); // stays put
    expect(after.pieceIndex).toBe(0); // not locked by gravity
  });

  it('lockDown locks a grounded piece and spawns the next', () => {
    const landed = engineHardDrop(createBoard(), spawnPiece('S'));
    const after = reducer(playing({ current: landed }), gameActions.lockDown());
    expect(after.pieceIndex).toBe(1);
    expect(after.lockEvent).not.toBeNull();
  });

  it('lockDown is a no-op when the piece is still airborne (stale timer)', () => {
    const s = playing(); // spawn piece is airborne
    const after = reducer(s, gameActions.lockDown());
    expect(after.pieceIndex).toBe(0);
    expect(after.current).toEqual(s.current);
  });
});

describe('applyPenalty', () => {
  it('queues penalty while a piece is active', () => {
    expect(reducer(playing(), gameActions.applyPenalty({ n: 2 })).pendingPenalty).toBe(2);
  });

  it('records the incoming attacker in lastAttack', () => {
    const after = reducer(
      playing(),
      gameActions.applyPenalty({ n: 2, fromId: 'x', fromName: 'rook' }),
    );
    expect(after.lastAttack).toMatchObject({ fromId: 'x', fromName: 'rook', count: 2 });
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

describe('combo & back-to-back', () => {
  it('combo increments on a clear and is carried in clearFx', () => {
    const board = createBoard();
    for (let c = 0; c < 10; c++) if (c < 3 || c > 6) board[19]![c] = 1 as Cell;
    const after = reducer(
      playing({ board, current: spawnPiece('I'), combo: 0 }),
      gameActions.hardDrop(),
    );
    expect(after.combo).toBe(1);
    expect(after.clearFx?.combo).toBe(1);
  });

  it('combo resets to 0 on a non-clearing lock', () => {
    expect(reducer(playing({ combo: 4 }), gameActions.hardDrop()).combo).toBe(0);
  });

  it('adds a combo chain bonus that scales with the combo count', () => {
    const run = (combo: number): GameState => {
      const board = createBoard();
      for (let c = 0; c < 10; c++) if (c < 3 || c > 6) board[19]![c] = 1 as Cell;
      return reducer(playing({ board, current: spawnPiece('I'), combo }), gameActions.hardDrop());
    };
    const first = run(0); // becomes combo 1 → no chain bonus
    const chained = run(3); // becomes combo 4 → 50 × (4-1) × level 1
    expect(chained.score - first.score).toBe(50 * 3);
  });
});

describe('soft-drop & perfect-clear scoring (bonus)', () => {
  it('awards a point per cell on an active soft drop', () => {
    expect(reducer(playing(), gameActions.softDrop()).score).toBe(1);
  });

  it('scores soft-drop cells on a gravity tick while soft drop is held', () => {
    expect(reducer(playing({ softDropActive: true }), gameActions.tick()).score).toBe(1);
  });

  it('does not score gravity ticks when soft drop is not held', () => {
    expect(reducer(playing({ softDropActive: false }), gameActions.tick()).score).toBe(0);
  });

  it('awards a perfect-clear (all-clear) bonus when the board ends empty', () => {
    const board = createBoard();
    for (let c = 0; c < 10; c++) if (c < 3 || c > 6) board[19]![c] = 1 as Cell;
    const after = reducer(playing({ board, current: spawnPiece('I') }), gameActions.hardDrop());
    expect(after.clearFx?.perfect).toBe(true);
    expect(after.score).toBeGreaterThanOrEqual(3500); // perfect-clear bonus dominates the line score
  });
});

describe('T-spin (bonus)', () => {
  // a down-pointing T resting in a notch with 3 of its box corners walled in
  const tSpinBoard = () => {
    const board = createBoard();
    board[17]![0] = 1 as Cell; // top-left corner
    board[17]![2] = 1 as Cell; // top-right corner
    board[19]![0] = 1 as Cell; // bottom-left corner
    return board;
  };
  const downT = { type: 'T' as const, rotation: 2 as const, x: 0, y: 17 };

  it('recognises a rotated T-spin: awards the bonus and flags the popup', () => {
    const after = reducer(
      playing({ board: tSpinBoard(), current: downT, lastWasRotation: true }),
      gameActions.hardDrop(),
    );
    expect(after.clearFx?.tSpin).toBe(true);
    expect(after.score).toBeGreaterThanOrEqual(400); // T-spin no-line bonus (400 × level 1)
  });

  it('does not flag a T-spin when the last action was a translation', () => {
    const after = reducer(
      playing({ board: tSpinBoard(), current: downT, lastWasRotation: false }),
      gameActions.hardDrop(),
    );
    expect(after.clearFx?.tSpin ?? false).toBe(false);
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
