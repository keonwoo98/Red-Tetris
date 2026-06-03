import { BOARD_HEIGHT, BOARD_WIDTH, cellsAt, COLORS, EMPTY, spawnPiece } from '@red-tetris/shared';
import type { ActivePiece, Board, PieceType, RotationState } from '@red-tetris/shared';

/** Immutable value object mirroring a falling piece. All transforms return fresh instances. */
export class Piece {
  readonly type: PieceType;
  readonly rotation: RotationState;
  readonly x: number;
  readonly y: number;

  constructor(type: PieceType, rotation: RotationState = 0, x = 3, y = -1) {
    this.type = type;
    this.rotation = rotation;
    this.x = x;
    this.y = y;
  }

  static spawn(type: PieceType): Piece {
    const a = spawnPiece(type);
    return new Piece(a.type, a.rotation, a.x, a.y);
  }

  static fromActive(a: ActivePiece): Piece {
    return new Piece(a.type, a.rotation, a.x, a.y);
  }

  toActive(): ActivePiece {
    return { type: this.type, rotation: this.rotation, x: this.x, y: this.y };
  }

  movedBy(dx: number, dy: number): Piece {
    return new Piece(this.type, this.rotation, this.x + dx, this.y + dy);
  }

  moveDown(): Piece {
    return this.movedBy(0, 1);
  }

  /** O is a strict no-op everywhere; rotation index stays 0. */
  withRotation(r: RotationState): Piece {
    return this.type === 'O' ? this : new Piece(this.type, r, this.x, this.y);
  }

  cells(): Array<[number, number]> {
    return cellsAt(this.toActive()).map(([c, r]) => [c, r] as [number, number]);
  }

  colorId(): number {
    return COLORS[this.type];
  }

  collidesOn(board: Board): boolean {
    for (const [col, row] of this.cells()) {
      if (col < 0 || col >= BOARD_WIDTH) return true;
      if (row >= BOARD_HEIGHT) return true;
      if (row >= 0 && board[row]![col] !== EMPTY) return true;
    }
    return false;
  }
}
