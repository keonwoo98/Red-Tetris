import { useNavigate } from 'react-router-dom';
import { FEATURES, type GameMode, type SoloObjective } from '@shared/constants';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { lobbyActions } from '../store/lobbySlice';
import { selectIsHost, selectLobbyMode, selectMyId, selectPlayers } from '../store/selectors';
import { PlayerList } from './PlayerList';
import styles from './Lobby.module.css';

const MODES: GameMode[] = ['classic', 'invisible', 'rising'];
const OBJECTIVES: SoloObjective[] = ['endless', 'sprint', 'marathon'];

export const Lobby = () => {
  const players = useAppSelector(selectPlayers);
  const isHost = useAppSelector(selectIsHost);
  const myId = useAppSelector(selectMyId);
  const mode = useAppSelector(selectLobbyMode);
  const objective = useAppSelector((s) => s.lobby.objective);
  const room = useAppSelector((s) => s.lobby.room);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const solo = players.length <= 1; // solo objectives are meaningless once a rival joins

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
        {solo && (
          <div className={styles.modes}>
            <span className={styles.modeLabel}>SOLO GOAL</span>
            <div className={styles.modeBtns}>
              {OBJECTIVES.map((o) => (
                <button
                  key={o}
                  type="button"
                  className={styles.modeBtn}
                  data-active={objective === o}
                  onClick={() => dispatch(lobbyActions.requestSetObjective(o))}
                >
                  {o}
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
