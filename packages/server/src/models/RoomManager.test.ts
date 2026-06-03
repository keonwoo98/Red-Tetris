import { describe, it, expect } from 'vitest';
import { RoomManager } from './RoomManager.js';

describe('RoomManager', () => {
  it('getOrCreate is idempotent per room and isolates concurrent games', () => {
    const rm = new RoomManager();
    const g1 = rm.getOrCreate('neon');
    expect(rm.getOrCreate('neon')).toBe(g1);
    const other = rm.getOrCreate('disco');
    expect(other).not.toBe(g1);
    g1.addPlayer('a', 'sa', 'alice');
    expect(other.size).toBe(0); // cross-room isolation
    expect(rm.roomCount).toBe(2);
    expect(rm.rooms().sort()).toEqual(['disco', 'neon']);
  });

  it('has / find', () => {
    const rm = new RoomManager();
    expect(rm.has('x')).toBe(false);
    rm.getOrCreate('x');
    expect(rm.has('x')).toBe(true);
    expect(rm.find('x')).toBeDefined();
    expect(rm.find('y')).toBeUndefined();
  });

  it('removeEmpty deletes only empty rooms', () => {
    const rm = new RoomManager();
    const g = rm.getOrCreate('neon');
    g.addPlayer('a', 'sa', 'alice');
    expect(rm.removeEmpty('neon')).toBe(false); // occupied
    g.removePlayer('a');
    expect(rm.removeEmpty('neon')).toBe(true);
    expect(rm.has('neon')).toBe(false);
    expect(rm.removeEmpty('ghost')).toBe(false); // missing room
  });

  it('remove deletes a room outright', () => {
    const rm = new RoomManager();
    rm.getOrCreate('x');
    rm.remove('x');
    expect(rm.has('x')).toBe(false);
  });

  it('findBySocket locates the game+player across rooms', () => {
    const rm = new RoomManager();
    rm.getOrCreate('a').addPlayer('p1', 's1', 'alice');
    rm.getOrCreate('b').addPlayer('p2', 's2', 'bob');
    const hit = rm.findBySocket('s2');
    expect(hit?.playerId).toBe('p2');
    expect(hit?.game.room).toBe('b');
    expect(rm.findBySocket('nope')).toBeUndefined();
  });
});
