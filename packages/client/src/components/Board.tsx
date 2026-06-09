import { useEffect, useRef } from 'react';
import { createBoard, ghostPiece, overlayForRender } from '../engine';
import { useAppSelector } from '../hooks/redux';
import { selectClearFx, selectDropFx, selectLockFx, selectNearTopOut } from '../store/selectors';
import { Cell } from './Cell';
import styles from './Board.module.css';

/** The player's 10×20 field rendered as a CSS grid of 200 div cells (no canvas/svg/table). */
export const Board = () => {
  const board = useAppSelector((s) => s.game.board);
  const current = useAppSelector((s) => s.game.current);
  const mode = useAppSelector((s) => s.game.mode);
  const status = useAppSelector((s) => s.game.status);
  const clearFx = useAppSelector(selectClearFx);
  const dropFx = useAppSelector(selectDropFx);
  const lockFx = useAppSelector(selectLockFx);
  const danger = useAppSelector(selectNearTopOut);
  const boardRef = useRef<HTMLDivElement>(null);

  // invisible mode hides the locked stack only WHILE PLAYING; once the round ends (top-out) we reveal
  // the final board so the player can see how it actually stacked up.
  const invisible = mode === 'invisible' && status === 'playing';
  const shownBoard = invisible ? createBoard() : board;
  const ghost = current && !invisible ? ghostPiece(board, current) : null;
  const grid = overlayForRender(shownBoard, current, ghost);

  const lockedSet = new Set<string>();
  if (lockFx) for (const [c, r] of lockFx.cells) lockedSet.add(`${r}-${c}`);

  // hard-drop shake: restart the keyframe via reflow (no 200-cell remount)
  const dropSeq = dropFx?.seq;
  const dropAmp = dropFx?.amp;
  useEffect(() => {
    const el = boardRef.current;
    const shakeClass = styles.shaking;
    if (!el || dropSeq === undefined || !shakeClass) return;
    el.style.setProperty('--amp', String(dropAmp ?? 2));
    el.classList.remove(shakeClass);
    void el.offsetWidth;
    el.classList.add(shakeClass);
  }, [dropSeq, dropAmp]);

  return (
    <div className={styles.frame} data-danger={danger ? '' : undefined}>
      {clearFx && (
        <div
          key={clearFx.seq}
          className={`${styles.flash} ${clearFx.lines >= 4 ? styles.tetris : ''}`}
          aria-hidden
        />
      )}
      <div ref={boardRef} className={styles.board} role="grid" aria-label="Your field">
        {grid.flatMap((row, r) =>
          row.map((value, c) => (
            <Cell key={`${r}-${c}`} value={value} justLocked={lockedSet.has(`${r}-${c}`)} />
          )),
        )}
      </div>
      {danger && <div className={styles.vignette} aria-hidden />}
    </div>
  );
};
