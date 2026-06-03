import { Game } from './Game.js';

/** Owns all concurrent games keyed by room. Per-game state lives only on its Game (cross-room isolation). */
export class RoomManager {
  private games = new Map<string, Game>();

  getOrCreate(room: string): Game {
    let g = this.games.get(room);
    if (!g) {
      g = new Game(room);
      this.games.set(room, g);
    }
    return g;
  }

  find(room: string): Game | undefined {
    return this.games.get(room);
  }

  has(room: string): boolean {
    return this.games.has(room);
  }

  /** Delete the room iff it has no players. Called after every leave/disconnect. */
  removeEmpty(room: string): boolean {
    const g = this.games.get(room);
    if (g && g.isEmpty) {
      this.games.delete(room);
      return true;
    }
    return false;
  }

  remove(room: string): void {
    this.games.delete(room);
  }

  get roomCount(): number {
    return this.games.size;
  }

  rooms(): string[] {
    return [...this.games.keys()];
  }

  findBySocket(socketId: string): { game: Game; playerId: string } | undefined {
    for (const game of this.games.values()) {
      const p = game.findBySocket(socketId);
      if (p) return { game, playerId: p.id };
    }
    return undefined;
  }
}
