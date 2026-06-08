import { pieceAt } from '@red-tetris/shared';
import type { GameMode, GameStatus, OpponentDTO, PieceType, RoomState } from '@red-tetris/shared';
import { GameNotStartedError } from './errors.js';
import { Piece } from './Piece.js';
import { Player } from './Player.js';

export interface PenaltyDistribution {
  from: string; // attacker playerId
  linesCleared: number; // n
  penaltyCount: number; // max(0, n-1)
  targets: string[]; // alive opponents who must apply addPenaltyLines(board, n-1)
}

export interface WinResult {
  decided: boolean;
  winnerId: string | null;
  winnerName: string | null;
  reason: 'last-standing' | 'solo-end' | 'everyone-left' | 'not-decided';
}

const NOT_DECIDED: WinResult = {
  decided: false,
  winnerId: null,
  winnerName: null,
  reason: 'not-decided',
};

/** One room. io-agnostic: methods return data; the socket layer emits. */
export class Game {
  readonly room: string;
  private players: Player[] = []; // insertion-ordered (host election + win logic rely on order)
  seed: number | null = null;
  status: GameStatus = 'lobby';
  hostId: string | null = null;
  startedAt: number | null = null;
  mode: GameMode = 'classic'; // bonus: host-selected game mode
  private starterIds = new Set<string>();

  constructor(room: string) {
    this.room = room;
  }

  // ---- roster ----------------------------------------------------------
  /** Add a new player, or reattach an existing one (case-insensitive name). First player = host. */
  addPlayer(id: string, socketId: string, name: string): Player {
    const existing = this.findByName(name);
    if (existing) {
      existing.attachSocket(socketId);
      return existing;
    }
    const p = new Player(id, socketId, name);
    this.players.push(p);
    if (this.players.length === 1) {
      p.isHost = true;
      this.hostId = p.id;
    }
    return p;
  }

  /**
   * A NEW name may join while in the lobby OR after a game has ended (between rounds, before the host
   * relaunches). Only mid-game ('playing') is locked, where an existing name may merely reconnect.
   */
  canJoin(name: string): boolean {
    if (this.status !== 'playing') return true;
    return this.findByName(name) !== undefined;
  }

  removePlayer(playerId: string): WinResult {
    const wasHost = this.hostId === playerId;
    this.players = this.players.filter((p) => p.id !== playerId);
    if (wasHost) this.electHost();
    return this.status === 'playing' ? this.checkWinAfterChange() : NOT_DECIDED;
  }

  /** Soft disconnect: keep the slot for reconnect; mid-game it also eliminates so the round can resolve. */
  handleDisconnect(playerId: string): WinResult {
    const p = this.find(playerId);
    if (!p) return NOT_DECIDED;
    p.detachSocket();
    let res: WinResult = NOT_DECIDED;
    if (this.status === 'playing') {
      p.eliminate();
      res = this.checkWinAfterChange();
    }
    if (this.hostId === playerId) this.electHost();
    return res;
  }

  /**
   * Soft disconnect WITHOUT eliminating — the socket layer waits a grace window for the player to
   * reconnect before calling `eliminate()`, so a transient drop (tab throttle, refresh, blip) does
   * not end the round. Host migrates immediately so control is never stuck on a gone player.
   */
  markDisconnected(playerId: string): { migrated: boolean } {
    const p = this.find(playerId);
    if (!p) return { migrated: false };
    p.detachSocket();
    const wasHost = this.hostId === playerId;
    if (wasHost) this.electHost();
    return { migrated: wasHost };
  }

  // ---- host election ---------------------------------------------------
  /** Promote the earliest-joined still-connected player (falls back to first). Idempotent. */
  electHost(): string | null {
    const next = this.players.find((p) => p.connected) ?? this.players[0];
    this.players.forEach((p) => (p.isHost = false));
    if (next) {
      next.isHost = true;
      this.hostId = next.id;
    } else {
      this.hostId = null;
    }
    return this.hostId;
  }

  isHost(playerId: string): boolean {
    return this.hostId === playerId;
  }

  /** HOST-ONLY, lobby only. Select the game mode (bonus). */
  setMode(byPlayerId: string, mode: GameMode): boolean {
    if (!this.isHost(byPlayerId)) return false;
    if (this.status !== 'lobby') return false;
    this.mode = mode;
    return true;
  }

  // ---- lifecycle -------------------------------------------------------
  /** HOST-ONLY, from lobby. Rejects if host disconnected or no connected players. */
  start(byPlayerId: string): boolean {
    if (!this.isHost(byPlayerId)) return false;
    if (this.status === 'playing') return false;
    const host = this.find(byPlayerId);
    if (!host || !host.connected) return false;
    const connected = this.players.filter((p) => p.connected);
    if (connected.length === 0) return false;
    this.seed = (Math.random() * 0x1_0000_0000) >>> 0; // the ONLY entropy in the whole game
    this.players.forEach((p) => p.resetForRound());
    this.players.forEach((p) => {
      if (!p.connected) p.eliminate(); // disconnected ghosts never block the win condition
    });
    this.starterIds = new Set(connected.map((p) => p.id));
    this.status = 'playing';
    this.startedAt = Date.now();
    return true;
  }

  /** HOST-ONLY. Force back to lobby, reset players, clear seed, re-open joins. */
  restart(byPlayerId: string): boolean {
    if (!this.isHost(byPlayerId)) return false;
    if (this.status === 'lobby') return false;
    this.status = 'lobby';
    this.players.forEach((p) => p.resetForRound());
    this.seed = null;
    this.startedAt = null;
    this.starterIds = new Set();
    return true;
  }

  // ---- determinism -----------------------------------------------------
  pieceForIndex(index: number): PieceType {
    if (this.seed === null) throw new GameNotStartedError(this.room);
    return pieceAt(this.seed, index);
  }

  pieceObjectForIndex(index: number): Piece {
    return Piece.spawn(this.pieceForIndex(index));
  }

  // ---- attack (penalty routing) ----------------------------------------
  /** Player cleared n lines → n-1 penalty to every OTHER alive player. Pure routing; n<=1 → no targets. */
  registerLineClear(playerId: string, n: number): PenaltyDistribution {
    const penaltyCount = Math.max(0, n - 1);
    const targets =
      penaltyCount === 0
        ? []
        : this.players.filter((p) => p.id !== playerId && p.alive).map((p) => p.id);
    return { from: playerId, linesCleared: n, penaltyCount, targets };
  }

  // ---- spectrum --------------------------------------------------------
  updateSpectrum(playerId: string, spectrum: number[][]): OpponentDTO | null {
    const p = this.find(playerId);
    if (!p) return null;
    p.setSpectrum(spectrum);
    p.touch();
    return p.toOpponentDTO();
  }

  setPieceIndex(playerId: string, idx: number): void {
    const p = this.find(playerId);
    if (p) p.currentPieceIndex = idx;
  }

  // ---- elimination & win (idempotent) ----------------------------------
  eliminate(playerId: string): WinResult {
    const p = this.find(playerId);
    if (!p || !p.alive || this.status !== 'playing') return NOT_DECIDED;
    p.eliminate();
    return this.checkWinAfterChange();
  }

  private alivePlayers(): Player[] {
    return this.players.filter((p) => p.alive);
  }

  /** Evaluate the win condition. No `draw`: sequential elimination resolves last-standing. */
  winner(): WinResult {
    if (this.status !== 'playing') return NOT_DECIDED;
    const starters = this.starterIds.size;
    const alive = this.alivePlayers();
    if (starters >= 2) {
      if (alive.length === 1) {
        const w = alive[0]!;
        return { decided: true, winnerId: w.id, winnerName: w.name, reason: 'last-standing' };
      }
      if (alive.length === 0) {
        return { decided: true, winnerId: null, winnerName: null, reason: 'everyone-left' };
      }
      return NOT_DECIDED;
    }
    if (starters === 1) {
      if (alive.length === 0) {
        return { decided: true, winnerId: null, winnerName: null, reason: 'solo-end' };
      }
      return NOT_DECIDED;
    }
    return NOT_DECIDED;
  }

  private checkWinAfterChange(): WinResult {
    const res = this.winner();
    if (res.decided) this.status = 'ended';
    return res;
  }

  // ---- serialization & lookups -----------------------------------------
  serializeRoom(): RoomState {
    return {
      room: this.room,
      status: this.status,
      hostId: this.hostId,
      players: this.players.map((p) => p.toDTO()),
      seed: this.status === 'playing' ? this.seed : null,
      mode: this.mode,
    };
  }

  opponentDTOs(): OpponentDTO[] {
    return this.players.map((p) => p.toOpponentDTO());
  }

  find(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }

  findByName(name: string): Player | undefined {
    const lower = name.toLowerCase();
    return this.players.find((p) => p.name.toLowerCase() === lower);
  }

  findBySocket(socketId: string): Player | undefined {
    return this.players.find((p) => p.socketId === socketId && p.connected);
  }

  get size(): number {
    return this.players.length;
  }

  get isEmpty(): boolean {
    return this.players.length === 0;
  }

  get connectedCount(): number {
    return this.players.filter((p) => p.connected).length;
  }
}
