import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { gameActions } from '../store/gameSlice';
import { lobbyActions } from '../store/lobbySlice';
import { opponentsActions } from '../store/opponentsSlice';
import { selectConnection, selectJoinError, selectRoomStatus } from '../store/selectors';
import { socket } from '../socket/socket';
import { GameView } from './GameView';
import { Lobby } from './Lobby';
import styles from './GameRoute.module.css';

export const GameRoute = () => {
  const { room, player } = useParams();
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectRoomStatus);
  const connection = useAppSelector(selectConnection);
  const joinError = useAppSelector(selectJoinError);

  useEffect(() => {
    if (!room || !player) return;
    dispatch(lobbyActions.setIdentity({ room, name: player }));
    return () => {
      socket.emit('leave');
      socket.disconnect();
      dispatch(lobbyActions.leaveLobby());
      dispatch(opponentsActions.clearOpponents());
      dispatch(gameActions.resetGame());
    };
  }, [room, player, dispatch]);

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

  return status === 'lobby' ? <Lobby /> : <GameView />;
};
