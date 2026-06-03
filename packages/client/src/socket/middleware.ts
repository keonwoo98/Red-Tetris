import type { Middleware } from '@reduxjs/toolkit';
import { FEATURES, type GameMode } from '@shared/constants';
import { computeSpectrum } from '../engine';
import type { RootState } from '../store';
import { gameActions } from '../store/gameSlice';
import { lobbyActions } from '../store/lobbySlice';
import { socket } from './socket';

/**
 * Outbound bridge: translates dispatched actions into socket emits.
 * The lock report (`board:locked` + `spectrum:report`) is emitted from EXACTLY ONE place —
 * whenever a reducer leaves a `lockEvent` on game state — so a line clear is reported once.
 */
export const socketMiddleware: Middleware = (api) => (next) => (action) => {
  const before = api.getState() as RootState;
  const result = next(action);
  const after = api.getState() as RootState;
  const a = action as { type: string; payload?: unknown };

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
