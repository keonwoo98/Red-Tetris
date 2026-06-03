import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';
import { useGameLoop } from '../hooks/useGameLoop';
import { useKeyboard } from '../hooks/useKeyboard';
import { selectGameStatus, selectIsAlive } from '../store/selectors';
import { Board } from './Board';
import { Controls } from './Controls';
import { GameOverOverlay } from './GameOverOverlay';
import { HoldPiece } from './HoldPiece';
import { NextQueue } from './NextQueue';
import { OpponentsPanel } from './OpponentsPanel';
import { ScoreHUD } from './ScoreHUD';
import styles from './GameView.module.css';

export const GameView = () => {
  const status = useAppSelector(selectGameStatus);
  const alive = useAppSelector(selectIsAlive);
  const room = useAppSelector((s) => s.lobby.room);
  const navigate = useNavigate();

  useGameLoop();
  useKeyboard(alive && status === 'playing');

  return (
    <main className={styles.view}>
      <header className={styles.bar}>
        <span className={styles.brand}>
          RED<b>TETRIS</b>
        </span>
        <span className={styles.room}>{room}</span>
        <span className={styles.state} data-state={status}>
          {status === 'playing' ? '● live' : status === 'gameover' ? '○ over' : '· idle'}
        </span>
        <button className={styles.leave} type="button" onClick={() => navigate('/')}>
          LEAVE
        </button>
      </header>
      <div className={styles.grid}>
        <section className={styles.stage}>
          <Board />
        </section>
        <aside className={styles.side}>
          <ScoreHUD />
          <div className={styles.pieces}>
            <HoldPiece />
            <NextQueue />
          </div>
          <Controls />
          <OpponentsPanel />
        </aside>
      </div>
      {status === 'gameover' && <GameOverOverlay />}
    </main>
  );
};
