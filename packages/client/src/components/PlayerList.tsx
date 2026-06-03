import type { PlayerDTO } from '@shared/protocol';
import styles from './Lobby.module.css';

export const PlayerList = ({ players, myId }: { players: PlayerDTO[]; myId: string | null }) => (
  <ul className={styles.players}>
    {players.map((p) => (
      <li key={p.id} className={styles.player} data-me={p.id === myId}>
        <span className={styles.pdot} data-alive={p.alive} />
        <span className={styles.pname}>{p.name}</span>
        {p.id === myId && <span className={styles.you}>you</span>}
        {p.isHost && <span className={styles.host}>HOST</span>}
      </li>
    ))}
  </ul>
);
