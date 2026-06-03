import { createSelector } from '@reduxjs/toolkit';
import type { OpponentDTO } from '@shared/protocol';
import type { RootState } from './index';

export const selectIsHost = (s: RootState): boolean =>
  !!s.lobby.myId && s.lobby.myId === s.lobby.hostId;
export const selectMyId = (s: RootState): string | null => s.lobby.myId;
export const selectRoomStatus = (s: RootState) => s.lobby.status;
export const selectPlayers = (s: RootState) => s.lobby.players;
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

export const selectOpponents = createSelector(
  (s: RootState) => s.opponents.ids,
  (s: RootState) => s.opponents.byId,
  (ids, byId): OpponentDTO[] => ids.map((id) => byId[id]).filter((o): o is OpponentDTO => Boolean(o)),
);
