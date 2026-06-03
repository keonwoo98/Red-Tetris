import { ghostPiece, overlayForRender } from '../engine';
import { useAppSelector } from '../hooks/redux';
import { Cell } from './Cell';
import styles from './Board.module.css';

/** The player's 10×20 field rendered as a CSS grid of 200 div cells (no canvas/svg/table). */
export const Board = () => {
  const board = useAppSelector((s) => s.game.board);
  const current = useAppSelector((s) => s.game.current);
  const ghost = current ? ghostPiece(board, current) : null;
  const grid = overlayForRender(board, current, ghost);

  return (
    <div className={styles.frame}>
      <div className={styles.board} role="grid" aria-label="Your field">
        {grid.flatMap((row, r) => row.map((value, c) => <Cell key={`${r}-${c}`} value={value} />))}
      </div>
    </div>
  );
};
