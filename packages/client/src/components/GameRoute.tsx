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

  // after a host relaunch the room returns to 'lobby'; drop a stale game-over so the lobby shows
  useEffect(() => {
    if (status === 'lobby' && gameStatus !== 'idle') dispatch(gameActions.resetGame());
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

  // Show the board while playing or to a finished player (game-over overlay). A fresh joiner who
  // lands in a room that has ENDED (status 'ended', their own game still 'idle') sees the lobby and
  // waits for the host to relaunch — so new players can join between rounds (eval: "Relaunch a game").
  const inGame = status === 'playing' || gameStatus === 'gameover';
  return inGame ? <GameView /> : <Lobby />;
};
