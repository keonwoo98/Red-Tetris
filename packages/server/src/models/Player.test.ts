import { describe, it, expect } from 'vitest';
import { Player } from './Player.js';

const zeros = (): number[][] => Array.from({ length: 20 }, () => new Array<number>(10).fill(0));
const sampleField = (): number[][] => {
  const f = zeros();
  f[19] = [1, 2, 3, 4, 5, 6, 7, 0, 0, 0]; // a few cells on the bottom row
  return f;
};

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
    const s = sampleField();
    p.setSpectrum(s);
    expect(p.spectrum).toEqual(s);
    expect(p.spectrum).not.toBe(s);
    expect(p.spectrum[19]).not.toBe(s[19]); // rows are copied too
  });

  it('eliminate then resetForRound restores round state', () => {
    const p = new Player('1', 's', 'a');
    p.eliminate();
    p.setSpectrum(sampleField());
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
