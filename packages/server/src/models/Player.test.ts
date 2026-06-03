import { describe, it, expect } from 'vitest';
import { Player } from './Player.js';

const zeros = (): number[] => new Array(10).fill(0);

describe('Player', () => {
  it('starts alive, not host, connected, empty spectrum', () => {
    const p = new Player('id1', 'sock1', 'alice');
    expect(p.alive).toBe(true);
    expect(p.isHost).toBe(false);
    expect(p.connected).toBe(true);
    expect(p.currentPieceIndex).toBe(0);
    expect(p.spectrum).toEqual(zeros());
  });

  it('setSpectrum stores a copy', () => {
    const p = new Player('1', 's', 'a');
    const s = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    p.setSpectrum(s);
    expect(p.spectrum).toEqual(s);
    expect(p.spectrum).not.toBe(s);
  });

  it('eliminate then resetForRound restores round state', () => {
    const p = new Player('1', 's', 'a');
    p.eliminate();
    p.setSpectrum([5, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    p.currentPieceIndex = 9;
    expect(p.alive).toBe(false);
    p.resetForRound();
    expect(p.alive).toBe(true);
    expect(p.currentPieceIndex).toBe(0);
    expect(p.spectrum).toEqual(zeros());
  });

  it('attach/detach socket toggles connected', () => {
    const p = new Player('1', 's1', 'a');
    p.detachSocket();
    expect(p.connected).toBe(false);
    p.attachSocket('s2');
    expect(p.connected).toBe(true);
    expect(p.socketId).toBe('s2');
  });

  it('touch keeps lastSeen monotonic and numeric', () => {
    const p = new Player('1', 's', 'a');
    const before = p.lastSeen;
    p.touch();
    expect(typeof p.lastSeen).toBe('number');
    expect(p.lastSeen).toBeGreaterThanOrEqual(before);
  });

  it('produces DTOs', () => {
    const p = new Player('1', 's', 'a');
    p.isHost = true;
    expect(p.toDTO()).toEqual({ id: '1', name: 'a', isHost: true, alive: true });
    expect(p.toOpponentDTO()).toEqual({ id: '1', name: 'a', alive: true, spectrum: zeros() });
  });
});
