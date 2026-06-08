import { BOARD_HEIGHT, BOARD_WIDTH } from '@red-tetris/shared';
import type { OpponentDTO, PlayerDTO } from '@red-tetris/shared';

// the opponent "spectrum" carries the full 20×10 field (each cell = color id) so rivals render as
// a real mini-board; the spec's column-height view is a subset of this (the topmost filled per col).
const emptyField = (): number[][] =>
  Array.from({ length: BOARD_HEIGHT }, () => new Array<number>(BOARD_WIDTH).fill(0));

/** Per-participant authoritative server state. `id` is a stable UUID; `socketId` is volatile. */
export class Player {
  readonly id: string;
  socketId: string;
  readonly name: string;
  isHost = false;
  alive = true;
  spectrum: number[][] = emptyField();
  currentPieceIndex = 0;
  lastSeen: number;
  connected = true;

  constructor(id: string, socketId: string, name: string) {
    this.id = id;
    this.socketId = socketId;
    this.name = name;
    this.lastSeen = Date.now();
  }

  touch(): void {
    this.lastSeen = Date.now();
  }

  setSpectrum(s: number[][]): void {
    this.spectrum = s.map((row) => [...row]);
  }

  eliminate(): void {
    this.alive = false;
  }

  resetForRound(): void {
    this.alive = true;
    this.spectrum = emptyField();
    this.currentPieceIndex = 0;
  }

  attachSocket(socketId: string): void {
    this.socketId = socketId;
    this.connected = true;
    this.touch();
  }

  detachSocket(): void {
    this.connected = false;
    this.touch();
  }

  toDTO(): PlayerDTO {
    return { id: this.id, name: this.name, isHost: this.isHost, alive: this.alive };
  }

  toOpponentDTO(): OpponentDTO {
    return {
      id: this.id,
      name: this.name,
      alive: this.alive,
      spectrum: this.spectrum.map((row) => [...row]),
    };
  }
}
