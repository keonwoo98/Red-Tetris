import { describe, it, expect } from 'vitest';
import { pieceAt } from '@red-tetris/shared';
import { Game } from './Game.js';
import { GameNotStartedError } from './errors.js';

const mk = (): Game => new Game('neon');

describe('Game · roster & host', () => {
  it('first player becomes host, second does not', () => {
    const g = mk();
    const a = g.addPlayer('a', 'sa', 'alice');
    expect(a.isHost).toBe(true);
    expect(g.hostId).toBe('a');
    const b = g.addPlayer('b', 'sb', 'bob');
    expect(b.isHost).toBe(false);
    expect(g.size).toBe(2);
  });

  it('reattaches on duplicate name (case-insensitive) without a new slot', () => {
    const g = mk();
    g.addPlayer('a', 'sa', 'Alice');
    const again = g.addPlayer('zzz', 'sa2', 'alice');
    expect(g.size).toBe(1);
    expect(again.id).toBe('a');
    expect(again.socketId).toBe('sa2');
    expect(again.connected).toBe(true);
  });

  it('migrates host to the next player when the host leaves', () => {
    const g = mk();
    g.addPlayer('a', 'sa', 'alice');
    g.addPlayer('b', 'sb', 'bob');
    g.removePlayer('a');
    expect(g.hostId).toBe('b');
    expect(g.find('b')!.isHost).toBe(true);
  });

  it('host migration on disconnect prefers a still-connected player', () => {
    const g = mk();
    g.addPlayer('a', 'sa', 'alice');
    g.addPlayer('b', 'sb', 'bob');
    g.addPlayer('c', 'sc', 'carol');
    g.handleDisconnect('b'); // b detached (not host)
    g.handleDisconnect('a'); // host a detached → migrate to next connected (c)
    expect(g.hostId).toBe('c');
  });

  it('canJoin: lobby allows new names; playing allows only reconnect', () => {
    const g = mk();
    g.addPlayer('a', 'sa', 'alice');
    expect(g.canJoin('bob')).toBe(true);
    g.start('a');
    expect(g.canJoin('newbie')).toBe(false);
    expect(g.canJoin('alice')).toBe(true);
  });
});

describe('Game · lifecycle', () => {
  it('start: host-only, lobby→playing, picks a seed; rejects when already playing', () => {
    const g = mk();
    g.addPlayer('a', 'sa', 'alice');
    g.addPlayer('b', 'sb', 'bob');
    expect(g.start('b')).toBe(false); // not host
    expect(g.start('a')).toBe(true);
    expect(g.status).toBe('playing');
    expect(typeof g.seed).toBe('number');
    expect(g.start('a')).toBe(false); // already playing
  });

  it('start rejects when the host is disconnected', () => {
    const g = mk();
    g.addPlayer('a', 'sa', 'alice');
    g.handleDisconnect('a'); // host detached, still lobby
    expect(g.start('a')).toBe(false);
  });

  it('start excludes disconnected ghosts from starters and marks them dead', () => {
    const g = mk();
    g.addPlayer('a', 'sa', 'alice');
    g.addPlayer('b', 'sb', 'bob');
    g.handleDisconnect('b'); // b is a ghost
    expect(g.start('a')).toBe(true);
    expect(g.find('b')!.alive).toBe(false);
    expect(g.winner().decided).toBe(false); // a still alive (solo starter set)
  });

  it('restart: playing→lobby, clears seed; rejects from lobby and from non-host', () => {
    const g = mk();
    g.addPlayer('a', 'sa', 'alice');
    g.addPlayer('b', 'sb', 'bob');
    g.start('a');
    expect(g.restart('b')).toBe(false); // not host
    expect(g.restart('a')).toBe(true);
    expect(g.status).toBe('lobby');
    expect(g.seed).toBe(null);
    expect(g.restart('a')).toBe(false); // already lobby
  });

  it('setMode is host-only and lobby-only (bonus)', () => {
    const g = mk();
    g.addPlayer('a', 'sa', 'alice');
    g.addPlayer('b', 'sb', 'bob');
    expect(g.setMode('b', 'invisible')).toBe(false); // not host
    expect(g.setMode('a', 'invisible')).toBe(true);
    expect(g.mode).toBe('invisible');
    expect(g.serializeRoom().mode).toBe('invisible');
    g.start('a');
    expect(g.setMode('a', 'rising')).toBe(false); // not lobby
  });
});

describe('Game · determinism', () => {
  it('pieceForIndex throws before start, is deterministic after', () => {
    const g = mk();
    g.addPlayer('a', 'sa', 'alice');
    expect(() => g.pieceForIndex(0)).toThrow(GameNotStartedError);
    g.start('a');
    const seed = g.seed!;
    expect(g.pieceForIndex(5)).toBe(pieceAt(seed, 5));
    expect(g.pieceObjectForIndex(0).type).toBe(pieceAt(seed, 0));
  });
});

describe('Game · attack & spectrum', () => {
  it('n lines → n-1 penalty to other alive players only; n<=1 → no targets', () => {
    const g = mk();
    g.addPlayer('a', 'sa', 'alice');
    g.addPlayer('b', 'sb', 'bob');
    g.addPlayer('c', 'sc', 'carol');
    g.start('a');
    const d = g.registerLineClear('a', 3);
    expect(d.penaltyCount).toBe(2);
    expect([...d.targets].sort()).toEqual(['b', 'c']);
    expect(g.registerLineClear('a', 1).targets).toEqual([]);
    g.eliminate('b');
    expect(g.registerLineClear('a', 4).targets).toEqual(['c']); // dead b excluded
  });

  it('updateSpectrum stores and returns the opponent DTO; null for unknown id', () => {
    const g = mk();
    g.addPlayer('a', 'sa', 'alice');
    const dto = g.updateSpectrum('a', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(dto).toEqual({
      id: 'a',
      name: 'alice',
      alive: true,
      spectrum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    });
    expect(g.updateSpectrum('nope', [])).toBe(null);
  });

  it('setPieceIndex updates the player index and ignores unknown ids', () => {
    const g = mk();
    g.addPlayer('a', 'sa', 'alice');
    g.setPieceIndex('a', 12);
    expect(g.find('a')!.currentPieceIndex).toBe(12);
    expect(() => g.setPieceIndex('nope', 5)).not.toThrow();
  });
});

describe('Game · win conditions (no draw)', () => {
  it('last-standing when one of many remains', () => {
    const g = mk();
    g.addPlayer('a', 'sa', 'alice');
    g.addPlayer('b', 'sb', 'bob');
    g.start('a');
    const res = g.eliminate('b');
    expect(res).toMatchObject({ decided: true, winnerId: 'a', reason: 'last-standing' });
    expect(g.status).toBe('ended');
  });

  it('eliminate is guarded/idempotent after the game has ended', () => {
    const g = mk();
    g.addPlayer('a', 'sa', 'alice');
    g.addPlayer('b', 'sb', 'bob');
    g.start('a');
    g.eliminate('b'); // a wins → ended
    const again = g.eliminate('a');
    expect(again.decided).toBe(false);
    expect(again.reason).toBe('not-decided');
  });

  it('solo-end when the only starter dies', () => {
    const g = mk();
    g.addPlayer('a', 'sa', 'alice');
    g.start('a');
    const res = g.eliminate('a');
    expect(res).toMatchObject({ decided: true, winnerId: null, reason: 'solo-end' });
  });

  it('winner is not-decided before any start', () => {
    const g = mk();
    g.addPlayer('a', 'sa', 'alice');
    expect(g.winner().reason).toBe('not-decided');
  });

  it('removePlayer mid-game can decide last-standing', () => {
    const g = mk();
    g.addPlayer('a', 'sa', 'alice');
    g.addPlayer('b', 'sb', 'bob');
    g.start('a');
    const res = g.removePlayer('a'); // a leaves → b is last standing
    expect(res).toMatchObject({ decided: true, winnerId: 'b', reason: 'last-standing' });
  });
});

describe('Game · serialization & lookups', () => {
  it('serializeRoom snapshots state; seed hidden in lobby, shown while playing', () => {
    const g = mk();
    g.addPlayer('a', 'sa', 'alice');
    const lobby = g.serializeRoom();
    expect(lobby.status).toBe('lobby');
    expect(lobby.seed).toBe(null);
    expect(lobby.players).toEqual([{ id: 'a', name: 'alice', isHost: true, alive: true }]);
    g.start('a');
    expect(g.serializeRoom().seed).toBe(g.seed);
  });

  it('lookups and getters', () => {
    const g = mk();
    const a = g.addPlayer('a', 'sa', 'alice');
    expect(g.find('a')).toBe(a);
    expect(g.findByName('ALICE')).toBe(a);
    expect(g.findBySocket('sa')).toBe(a);
    expect(g.size).toBe(1);
    expect(g.isEmpty).toBe(false);
    expect(g.connectedCount).toBe(1);
    expect(g.opponentDTOs()).toHaveLength(1);
    g.handleDisconnect('a');
    expect(g.findBySocket('sa')).toBeUndefined();
    expect(g.connectedCount).toBe(0);
  });
});
