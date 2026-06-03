import { useNavigate } from 'react-router-dom';
import { FEATURES, type GameMode } from '@shared/constants';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { lobbyActions } from '../store/lobbySlice';
import { selectIsHost, selectLobbyMode, selectMyId, selectPlayers } from '../store/selectors';
import { PlayerList } from './PlayerList';
import styles from './Lobby.module.css';

const MODES: GameMode[] = ['classic', 'invisible', 'rising'];

export const Lobby = () => {
  const players = useAppSelector(selectPlayers);
  const isHost = useAppSelector(selectIsHost);
  const myId = useAppSelector(selectMyId);
  const mode = useAppSelector(selectLobbyMode);
  const room = useAppSelector((s) => s.lobby.room);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  return (
    <main className={styles.lobby}>
      <div className={styles.card}>
        <p className={styles.kicker}>LOBBY</p>
        <h2 className={styles.room}>{room}</h2>
        <div className={styles.count}>
          {players.length} pilot{players.length === 1 ? '' : 's'} ready
        </div>
        <PlayerList players={players} myId={myId} />
        {FEATURES.GAME_MODES && (
          <div className={styles.modes}>
            <span className={styles.modeLabel}>MODE</span>
            <div className={styles.modeBtns}>
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={styles.modeBtn}
                  data-active={mode === m}
                  disabled={!isHost}
                  onClick={() => dispatch(lobbyActions.requestSetMode(m))}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}
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
        <button className={styles.leave} type="button" onClick={() => navigate('/')}>
          ← leave room
        </button>
      </div>
    </main>
  );
};
