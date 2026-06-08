import type { Middleware } from '@reduxjs/toolkit';
import { BOARD_HEIGHT, BOARD_WIDTH, FEATURES, type GameMode } from '@shared/constants';
import type { OpponentDTO, RoomState } from '@shared/protocol';
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

  socket.on('connect', () => {
    const { room, myName, myId } = getState().lobby;
    // reconnect (we already had an identity) → re-join to reattach to our slot and resume the round.
    // Initial connect has no myId yet, so the normal setIdentity→join flow handles the first join.
    if (room && myName && myId) {
      socket.emit('join', { room, name: myName }, (res) => {
        if (res.ok) dispatch(lobbyActions.joined(res.data));
        else dispatch(lobbyActions.joinRejected({ reason: res.error.message }));
      });
    } else {
      dispatch(lobbyActions.connecting());
    }
  });

  socket.on('room:state', (s: RoomState) => {
    dispatch(lobbyActions.roomState(s));
    const myId = getState().lobby.myId;
    const emptyField = (): number[][] =>
      Array.from({ length: BOARD_HEIGHT }, () => new Array<number>(BOARD_WIDTH).fill(0));
    const opponents: OpponentDTO[] = s.players
      .filter((p) => p.id !== myId)
      .map((p) => ({ id: p.id, name: p.name, alive: p.alive, spectrum: emptyField() }));
    dispatch(opponentsActions.setOpponents(opponents));
  });

  socket.on('host:changed', (p) => dispatch(lobbyActions.hostChanged({ hostId: p.hostId })));

  socket.on('game:started', (p) => {
    dispatch(opponentsActions.roundReset()); // clear last round's rival fields before the new game
    dispatch(
      gameActions.startGame({
        seed: p.seed,
        mode: p.mode,
        // objective is client-local (solo win goal); stamp the wall-clock start for the time attack
        objective: getState().lobby.objective,
        startedAtMs: Date.now(),
      }),
    );
  });

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

  // a transient drop (tab throttle/background, blip) → show a reconnecting state, not the fatal
  // error screen; socket.io auto-reconnects and the 'connect' handler above re-joins us.
  socket.on('disconnect', () => dispatch(lobbyActions.connecting()));
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
      socket.emit('spectrum:report', { spectrum: after.game.board }); // full field for rival mini-boards
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
      socket.emit('spectrum:report', { spectrum: after.game.board }); // full field for rival mini-boards
      if (FEATURES.SCORING) socket.emit('score:report', { score: after.game.score });
    }

    // penalty flushed between pieces (no lock) → report the new spectrum
    if (a.type === 'game/applyPenalty' && after.game.status === 'playing' && !after.game.lockEvent) {
      socket.emit('spectrum:report', { spectrum: after.game.board }); // full field for rival mini-boards
    }

    return result;
  };
};
