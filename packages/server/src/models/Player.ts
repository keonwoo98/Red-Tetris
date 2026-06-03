import { SPECTRUM_LENGTH } from '@red-tetris/shared';
import type { OpponentDTO, PlayerDTO, Spectrum } from '@red-tetris/shared';

const emptySpectrum = (): number[] => new Array<number>(SPECTRUM_LENGTH).fill(0);

/** Per-participant authoritative server state. `id` is a stable UUID; `socketId` is volatile. */
export class Player {
  readonly id: string;
  socketId: string;
  readonly name: string;
  isHost = false;
  alive = true;
  spectrum: number[] = emptySpectrum();
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

  setSpectrum(s: Spectrum): void {
    this.spectrum = [...s];
  }

  eliminate(): void {
    this.alive = false;
  }

  resetForRound(): void {
    this.alive = true;
    this.spectrum = emptySpectrum();
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
    return { id: this.id, name: this.name, alive: this.alive, spectrum: [...this.spectrum] };
  }
}
