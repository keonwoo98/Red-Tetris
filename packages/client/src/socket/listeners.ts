import { SPECTRUM_LENGTH } from '@shared/constants';
import type { OpponentDTO, RoomState } from '@shared/protocol';
import type { AppDispatch, RootState } from '../store';
import { gameActions } from '../store/gameSlice';
import { lobbyActions } from '../store/lobbySlice';
import { opponentsActions } from '../store/opponentsSlice';
import { socket } from './socket';

/** Inbound bridge: registers socket listeners that dispatch actions. Call once at startup. */
export const bindSocketListeners = (dispatch: AppDispatch, getState: () => RootState): void => {
  socket.on('connect', () => dispatch(lobbyActions.connecting()));

  socket.on('room:state', (s: RoomState) => {
    dispatch(lobbyActions.roomState(s));
    const myId = getState().lobby.myId;
    const opponents: OpponentDTO[] = s.players
      .filter((p) => p.id !== myId)
      .map((p) => ({
        id: p.id,
        name: p.name,
        alive: p.alive,
        spectrum: new Array<number>(SPECTRUM_LENGTH).fill(0),
      }));
    dispatch(opponentsActions.setOpponents(opponents));
  });

  socket.on('host:changed', (p) => dispatch(lobbyActions.hostChanged({ hostId: p.hostId })));
  socket.on('game:started', (p) => dispatch(gameActions.startGame({ seed: p.seed, mode: p.mode })));
  socket.on('penalty:apply', (p) =>
    dispatch(gameActions.applyPenalty({ n: p.count, fromId: p.fromId, fromName: p.fromName })),
  );
  socket.on('spectrum:update', (p) => dispatch(opponentsActions.spectrumUpdate(p)));

  socket.on('player:gameover', (p) => {
    const myId = getState().lobby.myId;
    if (p.playerId === myId) dispatch(gameActions.topOut());
    else dispatch(opponentsActions.opponentGameOver({ id: p.playerId }));
  });

  socket.on('game:over', (p) => dispatch(gameActions.gameOver({ winnerId: p.winnerId })));
  socket.on('server:error', (e) => {
    if (e.fatal) dispatch(lobbyActions.joinRejected({ reason: e.message }));
  });
  socket.on('disconnect', () => dispatch(lobbyActions.connectionError()));
};
