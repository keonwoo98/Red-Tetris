import { createBoard, ghostPiece, overlayForRender } from '../engine';
import { useAppSelector } from '../hooks/redux';
import { Cell } from './Cell';
import styles from './Board.module.css';

/** The player's 10×20 field rendered as a CSS grid of 200 div cells (no canvas/svg/table). */
export const Board = () => {
  const board = useAppSelector((s) => s.game.board);
  const current = useAppSelector((s) => s.game.current);
  const mode = useAppSelector((s) => s.game.mode);
  // bonus: invisible mode hides the settled pile and the ghost — you must remember the stack
  const invisible = mode === 'invisible';
  const shownBoard = invisible ? createBoard() : board;
  const ghost = current && !invisible ? ghostPiece(board, current) : null;
  const grid = overlayForRender(shownBoard, current, ghost);

  return (
    <div className={styles.frame}>
      <div className={styles.board} role="grid" aria-label="Your field">
        {grid.flatMap((row, r) => row.map((value, c) => <Cell key={`${r}-${c}`} value={value} />))}
      </div>
    </div>
  );
};
