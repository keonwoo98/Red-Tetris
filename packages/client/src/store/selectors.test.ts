import { describe, it, expect } from 'vitest';
import type { RootState } from './index';
import lobbyReducer from './lobbySlice';
import gameReducer from './gameSlice';
import opponentsReducer, { opponentsActions } from './opponentsSlice';
import {
  selectIsHost,
  selectOpponents,
  selectBoard,
  selectGameStatus,
  selectIsAlive,
  selectWinnerId,
  selectMyId,
  selectConnection,
  selectRoomStatus,
  selectPlayers,
  selectJoinError,
  selectCurrent,
  selectNext,
} from './selectors';

const baseState = (): RootState => ({
  lobby: lobbyReducer(undefined, { type: '@@INIT' }),
  game: gameReducer(undefined, { type: '@@INIT' }),
  opponents: opponentsReducer(undefined, { type: '@@INIT' }),
});

describe('selectors', () => {
  it('selectIsHost compares myId to hostId', () => {
    const s = baseState();
    s.lobby = { ...s.lobby, myId: 'a', hostId: 'a' };
    expect(selectIsHost(s)).toBe(true);
    s.lobby = { ...s.lobby, hostId: 'b' };
    expect(selectIsHost(s)).toBe(false);
    s.lobby = { ...s.lobby, myId: null, hostId: null };
    expect(selectIsHost(s)).toBe(false);
  });

  it('selectOpponents maps the id list to DTOs', () => {
    const s = baseState();
    s.opponents = opponentsReducer(
      s.opponents,
      opponentsActions.setOpponents([{ id: 'x', name: 'x', alive: true, spectrum: new Array(10).fill(0) }]),
    );
    expect(selectOpponents(s)).toHaveLength(1);
    expect(selectOpponents(s)[0]!.id).toBe('x');
  });

  it('game selectors read game state', () => {
    const s = baseState();
    expect(selectBoard(s)).toEqual(s.game.board);
    expect(selectGameStatus(s)).toBe('idle');
    expect(selectIsAlive(s)).toBe(true);
    expect(selectWinnerId(s)).toBeNull();
  });

  it('lobby selectors read lobby state', () => {
    const s = baseState();
    expect(selectMyId(s)).toBeNull();
    expect(selectConnection(s)).toBe('idle');
    expect(selectRoomStatus(s)).toBe('lobby');
    expect(selectPlayers(s)).toEqual([]);
    expect(selectJoinError(s)).toBeNull();
    expect(selectCurrent(s)).toBeNull();
    expect(selectNext(s)).toEqual([]);
  });
});
