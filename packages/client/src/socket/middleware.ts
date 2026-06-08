import type { Middleware } from '@reduxjs/toolkit';
import { FEATURES, SPECTRUM_LENGTH, type GameMode } from '@shared/constants';
import type { OpponentDTO, RoomState } from '@shared/protocol';
import { computeSpectrum } from '../engine';
import type { AppDispatch, RootState } from '../store';
import { gameActions } from '../store/gameSlice';
import { lobbyActions } from '../store/lobbySlice';
import { opponentsActions } from '../store/opponentsSlice';
import { socket } from './socket';

/**
 * THE single boundary for socket.io — the whole library is encapsulated here in the Redux
 * middleware. Nothing else (component, hook, reducer) touches `socket`:
 * - inbound: `bindInbound` registers `socket.on(...)` once at store creation, mapping every server
 *   event to a dispatched action.
 * - outbound: dispatched actions are translated to `socket.emit(...)` below.
 */
let bound = false;
const bindInbound = (dispatch: AppDispatch, getState: () => RootState): void => {
  if (bound) return; // store is created once; guard against accidental re-binding (HMR)
  bound = true;

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

  socket.on('game:started', (p) =>
    dispatch(
      gameActions.startGame({
        seed: p.seed,
        mode: p.mode,
        // objective is client-local (solo win goal); stamp the wall-clock start for the time attack
        objective: getState().lobby.objective,
        startedAtMs: Date.now(),
      }),
    ),
  );

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

export const socketMiddleware: Middleware = (api) => {
  bindInbound(api.dispatch as AppDispatch, api.getState as () => RootState);

  return (next) => (action) => {
    const before = api.getState() as RootState;
    const result = next(action);
    const after = api.getState() as RootState;
    const a = action as { type: string; payload?: unknown };

    // outbound: dispatched action → socket emit
    switch (a.type) {
      case 'lobby/setIdentity': {
        const { room, name } = a.payload as { room: string; name: string };
        if (!socket.connected) socket.connect();
        socket.emit('join', { room, name }, (res) => {
          if (res.ok) api.dispatch(lobbyActions.joined(res.data));
          else api.dispatch(lobbyActions.joinRejected({ reason: res.error.message }));
        });
        break;
      }
      case 'lobby/requestStart':
        socket.emit('start', (res) => {
          if (!res.ok) api.dispatch(lobbyActions.joinRejected({ reason: res.error.message }));
        });
        break;
      case 'lobby/requestRestart':
        socket.emit('restart', () => undefined);
        break;
      case 'lobby/requestSetMode':
        socket.emit('set-mode', a.payload as GameMode);
        break;
      case 'lobby/requestLeaderboard':
        socket.emit('leaderboard', (entries) =>
          api.dispatch(lobbyActions.leaderboardLoaded(entries)),
        );
        break;
      case 'lobby/leaveLobby':
        socket.emit('leave');
        socket.disconnect();
        break;
      default:
        break;
    }

    // single lock-report path
    if (after.game.lockEvent) {
      const le = after.game.lockEvent;
      socket.emit('board:locked', {
        board: le.board,
        pieceIndex: le.pieceIndex,
        linesCleared: le.cleared,
      });
      socket.emit('spectrum:report', { spectrum: computeSpectrum(after.game.board) });
      api.dispatch(gameActions.clearLockEvent());
    }

    // local top-out (not a server echo or server win) → report it once
    if (
      before.game.status === 'playing' &&
      after.game.status === 'gameover' &&
      a.type !== 'game/gameOver' &&
      a.type !== 'game/topOut'
    ) {
      socket.emit('player:topout', { atPieceIndex: after.game.pieceIndex });
      socket.emit('spectrum:report', { spectrum: computeSpectrum(after.game.board) });
      if (FEATURES.SCORING) socket.emit('score:report', { score: after.game.score });
    }

    // penalty flushed between pieces (no lock) → report the new spectrum
    if (a.type === 'game/applyPenalty' && after.game.status === 'playing' && !after.game.lockEvent) {
      socket.emit('spectrum:report', { spectrum: computeSpectrum(after.game.board) });
    }

    return result;
  };
};
