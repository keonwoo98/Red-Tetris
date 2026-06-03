import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';
import { useGameLoop } from '../hooks/useGameLoop';
import { useKeyboard } from '../hooks/useKeyboard';
import { selectClearFx, selectGameStatus, selectIsAlive, selectOpponents } from '../store/selectors';
import { Board } from './Board';
import { Controls } from './Controls';
import { GameOverOverlay } from './GameOverOverlay';
import { GarbageMeter } from './GarbageMeter';
import { HoldPiece } from './HoldPiece';
import { NextQueue } from './NextQueue';
import { OpponentsPanel } from './OpponentsPanel';
import { ScoreHUD } from './ScoreHUD';
import styles from './GameView.module.css';

export const GameView = () => {
  const status = useAppSelector(selectGameStatus);
  const alive = useAppSelector(selectIsAlive);
  const opponents = useAppSelector(selectOpponents);
  const room = useAppSelector((s) => s.lobby.room);
  const clearFx = useAppSelector(selectClearFx);
  const navigate = useNavigate();

  useGameLoop();
  useKeyboard(alive && status === 'playing');

  const aliveCount = opponents.filter((o) => o.alive).length + (alive ? 1 : 0);
  const total = opponents.length + 1;

  return (
    <main className={styles.view}>
      <header className={styles.bar}>
        <span className={styles.brand}>
          RED<b>TETRIS</b>
        </span>
        <span className={styles.room}>{room}</span>
        {total > 1 && (
          <span className={styles.alive}>
            ALIVE <b>{aliveCount}</b>/{total}
          </span>
        )}
        <span className={styles.state} data-state={status}>
          {status === 'playing' ? '● live' : status === 'gameover' ? '○ over' : '· idle'}
        </span>
        <button className={styles.leave} type="button" onClick={() => navigate('/')}>
          LEAVE
        </button>
      </header>

      <div className={styles.grid}>
        <aside className={styles.leftRail}>
          <HoldPiece />
          <ScoreHUD />
        </aside>
        <section className={styles.center}>
          <GarbageMeter />
          <Board />
          {clearFx && clearFx.lines >= 2 && (
            <div key={clearFx.seq} className={styles.sent}>
              SENT {clearFx.lines - 1} →
            </div>
          )}
        </section>
        <aside className={styles.rightRail}>
          <NextQueue />
          <OpponentsPanel />
        </aside>
      </div>

      <details className={styles.controlsFoot}>
        <summary>CONTROLS</summary>
        <Controls />
      </details>

      {status === 'gameover' && <GameOverOverlay />}
    </main>
  );
};
