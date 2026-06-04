import { createSelector } from '@reduxjs/toolkit';
import { computeSpectrum, isGrounded } from '../engine';
import type { RootState } from './index';
import type { OpponentView } from './opponentsSlice';

export const selectIsHost = (s: RootState): boolean =>
  !!s.lobby.myId && s.lobby.myId === s.lobby.hostId;
export const selectMyId = (s: RootState): string | null => s.lobby.myId;
export const selectRoomStatus = (s: RootState) => s.lobby.status;
export const selectPlayers = (s: RootState) => s.lobby.players;
export const selectLobbyMode = (s: RootState) => s.lobby.mode;
export const selectConnection = (s: RootState) => s.lobby.connection;
export const selectJoinError = (s: RootState): string | null => s.lobby.joinError;

export const selectBoard = (s: RootState) => s.game.board;
export const selectCurrent = (s: RootState) => s.game.current;
export const selectNext = (s: RootState) => s.game.next;
export const selectGameStatus = (s: RootState) => s.game.status;
export const selectIsAlive = (s: RootState): boolean => s.game.alive;
export const selectWinnerId = (s: RootState): string | null => s.game.winnerId;
export const selectScore = (s: RootState): number => s.game.score;
export const selectLines = (s: RootState): number => s.game.lines;
export const selectLevel = (s: RootState): number => s.game.level;
export const selectGameMode = (s: RootState) => s.game.mode;
export const selectHold = (s: RootState) => s.game.hold;
export const selectCanHold = (s: RootState): boolean => s.game.canHold;
export const selectDropFx = (s: RootState) => s.game.dropFx;
export const selectLockFx = (s: RootState) => s.game.lockFx;
export const selectClearFx = (s: RootState) => s.game.clearFx;
export const selectNearTopOut = createSelector(
  (s: RootState) => s.game.board,
  (board) => Math.max(0, ...computeSpectrum(board)) >= 16,
);
export const selectPendingPenalty = (s: RootState): number => s.game.pendingPenalty;
export const selectLastAttack = (s: RootState) => s.game.lastAttack;
export const selectPlacementOrder = (s: RootState) => s.opponents.placementOrder;
export const selectCombo = (s: RootState): number => s.game.combo;
export const selectB2B = (s: RootState): number => s.game.b2b;

export const selectOpponents = createSelector(
  (s: RootState) => s.opponents.ids,
  (s: RootState) => s.opponents.byId,
  (ids, byId): OpponentView[] => ids.map((id) => byId[id]).filter((o): o is OpponentView => Boolean(o)),
);

/** True when the active piece is resting on the stack/floor — arms the fixed lock-delay timer. */
export const selectIsGrounded = createSelector(
  (s: RootState) => s.game.board,
  (s: RootState) => s.game.current,
  (board, current) => current !== null && isGrounded(board, current),
);

/** Re-arm counter; each bump (a grounded move/rotate) restarts the lock-delay timer in the loop. */
export const selectLockResets = (s: RootState): number => s.game.lockResets;
