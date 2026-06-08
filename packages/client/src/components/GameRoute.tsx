import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { gameActions } from '../store/gameSlice';
import { lobbyActions } from '../store/lobbySlice';
import { opponentsActions } from '../store/opponentsSlice';
import {
  selectConnection,
  selectGameStatus,
  selectJoinError,
  selectRoomStatus,
} from '../store/selectors';
import { GameView } from './GameView';
import { Lobby } from './Lobby';
import styles from './GameRoute.module.css';

export const GameRoute = () => {
  const { room, player } = useParams();
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectRoomStatus);
  const gameStatus = useAppSelector(selectGameStatus);
  const connection = useAppSelector(selectConnection);
  const joinError = useAppSelector(selectJoinError);

  useEffect(() => {
    if (!room || !player) return;
    dispatch(lobbyActions.setIdentity({ room, name: player }));
    // socket leave + disconnect are emitted by the middleware on leaveLobby (socket stays encapsulated)
    return () => {
      dispatch(lobbyActions.leaveLobby());
      dispatch(opponentsActions.clearOpponents());
      dispatch(gameActions.resetGame());
    };
  }, [room, player, dispatch]);

  // after a host relaunch the room returns to 'lobby' while the local game is still 'gameover';
  // reset so the lobby shows again. Guard on 'gameover' ONLY (not 'playing') — otherwise the brief
  // window between game:started (game→playing) and the room:state broadcast (room→playing) would
  // wipe the freshly-started game and leave an empty board.
  useEffect(() => {
    if (status === 'lobby' && gameStatus === 'gameover') dispatch(gameActions.resetGame());
  }, [status, gameStatus, dispatch]);

  if (!room || !player) return <Navigate to="/" replace />;

  if (connection === 'error') {
    return (
      <main className={styles.msg}>
        <div className={styles.box}>
          <div className={styles.err}>CANNOT JOIN “{room}”</div>
          <p className={styles.reason}>{joinError ?? 'connection error'}</p>
          <a className={styles.back} href="/">
            ← back to lobby
          </a>
        </div>
      </main>
    );
  }

  if (connection !== 'connected') {
    return (
      <main className={styles.msg}>
        <div className={styles.box}>
          <div className={styles.dots}>connecting to “{room}”…</div>
        </div>
      </main>
    );
  }

  // Show the board as soon as MY game is live or finished (covers the start race where game:started
  // arrives before room:state). A fresh joiner who lands in a room that has ENDED (their own game
  // still 'idle') sees the lobby and waits for the host to relaunch (eval: "Relaunch a game").
  const inGame =
    gameStatus === 'playing' || gameStatus === 'gameover' || status === 'playing';
  return inGame ? <GameView /> : <Lobby />;
};
