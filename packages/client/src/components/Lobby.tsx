import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { lobbyActions } from '../store/lobbySlice';
import { selectIsHost, selectMyId, selectPlayers } from '../store/selectors';
import { PlayerList } from './PlayerList';
import styles from './Lobby.module.css';

export const Lobby = () => {
  const players = useAppSelector(selectPlayers);
  const isHost = useAppSelector(selectIsHost);
  const myId = useAppSelector(selectMyId);
  const room = useAppSelector((s) => s.lobby.room);
  const dispatch = useAppDispatch();

  return (
    <main className={styles.lobby}>
      <div className={styles.card}>
        <p className={styles.kicker}>LOBBY</p>
        <h2 className={styles.room}>{room}</h2>
        <div className={styles.count}>
          {players.length} pilot{players.length === 1 ? '' : 's'} ready
        </div>
        <PlayerList players={players} myId={myId} />
        {isHost ? (
          <button className={styles.start} onClick={() => dispatch(lobbyActions.requestStart())}>
            START GAME →
          </button>
        ) : (
          <div className={styles.waiting}>
            <span className={styles.pulse} />
            waiting for the host to start…
          </div>
        )}
      </div>
    </main>
  );
};
