import { describe, it, expect } from 'vitest';
import type { Board } from '@red-tetris/shared';
import { Piece } from './Piece.js';

const emptyBoard = (): Board =>
  Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => 0)) as Board;

describe('Piece', () => {
  it('spawn creates rotation 0 at origin (3,-1)', () => {
    const p = Piece.spawn('T');
    expect([p.type, p.rotation, p.x, p.y]).toEqual(['T', 0, 3, -1]);
  });

  it('fromActive / toActive round-trip', () => {
    const a = { type: 'L' as const, rotation: 2 as const, x: 4, y: 5 };
    expect(Piece.fromActive(a).toActive()).toEqual(a);
  });

  it('movedBy / moveDown return fresh instances', () => {
    const p = Piece.spawn('I');
    const m = p.movedBy(1, 2);
    expect([m.x, m.y]).toEqual([4, 1]);
    expect(p.moveDown().y).toBe(0);
    expect(m).not.toBe(p);
  });

  it('withRotation rotates non-O; O is a no-op (same instance)', () => {
    expect(Piece.spawn('T').withRotation(1).rotation).toBe(1);
    const o = Piece.spawn('O');
    expect(o.withRotation(2)).toBe(o);
  });

  it('cells and colorId', () => {
    expect(Piece.spawn('O').colorId()).toBe(2);
    expect(Piece.spawn('I').cells()).toEqual([
      [3, 0],
      [4, 0],
      [5, 0],
      [6, 0],
    ]);
  });

  it('collidesOn detects walls, floor, overlap; allows row<0', () => {
    const b = emptyBoard();
    expect(Piece.spawn('T').collidesOn(b)).toBe(false); // row<0 cell allowed
    expect(new Piece('O', 0, -2, 5).collidesOn(b)).toBe(true); // left wall
    expect(new Piece('O', 0, 9, 5).collidesOn(b)).toBe(true); // right wall (cols 10,11)
    expect(new Piece('O', 0, 3, 20).collidesOn(b)).toBe(true); // floor
    const b2 = emptyBoard();
    b2[6]![4] = 1;
    expect(new Piece('O', 0, 3, 5).collidesOn(b2)).toBe(true); // overlap settled cell
  });
});
