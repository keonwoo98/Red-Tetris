import { kicksFor } from '@shared/tetrominoes';
import type { ActivePiece, Board, RotationState } from '@shared/types';
import { collides } from './collision';

/**
 * SRS clockwise rotation with wall kicks. O never rotates. The first collision-free
 * kick offset wins; if all 5 fail, the piece is returned unchanged. PURE.
 */
export const rotate = (board: Board, p: ActivePiece): ActivePiece => {
  if (p.type === 'O') return p;
  const to = ((p.rotation + 1) & 3) as RotationState;
  for (const [dx, dy] of kicksFor(p.type, p.rotation, to)) {
    const candidate: ActivePiece = { ...p, rotation: to, x: p.x + dx, y: p.y + dy };
    if (!collides(board, candidate)) return candidate;
  }
  return p;
};
