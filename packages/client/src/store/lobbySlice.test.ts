import { describe, it, expect } from 'vitest';
import type { RoomState } from '@shared/protocol';
import reducer, { lobbyActions, type LobbyState } from './lobbySlice';

const init = (): LobbyState => reducer(undefined, { type: '@@INIT' });

const room = (over: Partial<RoomState> = {}): RoomState => ({
  room: 'neon',
  status: 'lobby',
  hostId: 'a',
  players: [{ id: 'a', name: 'alice', isHost: true, alive: true }],
  seed: null,
  mode: 'classic',
  ...over,
});

describe('lobbySlice', () => {
  it('setIdentity records room/name and enters connecting', () => {
    const s = reducer(init(), lobbyActions.setIdentity({ room: 'neon', name: 'alice' }));
    expect(s.room).toBe('neon');
    expect(s.myName).toBe('alice');
    expect(s.connection).toBe('connecting');
  });

  it('joined stores myId and applies the room snapshot', () => {
    const s = reducer(init(), lobbyActions.joined({ state: room(), youId: 'a' }));
    expect(s.myId).toBe('a');
    expect(s.connection).toBe('connected');
    expect(s.hostId).toBe('a');
    expect(s.players).toHaveLength(1);
  });

  it('roomState replaces the roster and status', () => {
    const s = reducer(init(), lobbyActions.roomState(room({ status: 'playing', seed: 7 })));
    expect(s.status).toBe('playing');
    expect(s.hostId).toBe('a');
  });

  it('hostChanged updates the host', () => {
    expect(reducer(init(), lobbyActions.hostChanged({ hostId: 'b' })).hostId).toBe('b');
  });

  it('joinRejected / connecting / connectionError set connection state', () => {
    expect(reducer(init(), lobbyActions.joinRejected({ reason: 'taken' })).joinError).toBe('taken');
    expect(reducer(init(), lobbyActions.connecting()).connection).toBe('connecting');
    expect(reducer(init(), lobbyActions.connectionError()).connection).toBe('error');
  });

  it('requestStart/requestRestart are inert triggers; leaveLobby resets', () => {
    expect(reducer(init(), lobbyActions.requestStart())).toEqual(init());
    expect(reducer(init(), lobbyActions.requestRestart())).toEqual(init());
    const joined = reducer(init(), lobbyActions.joined({ state: room(), youId: 'a' }));
    expect(reducer(joined, lobbyActions.leaveLobby())).toEqual(init());
  });

  it('defaults the solo objective to endless and lets requestSetObjective change it locally', () => {
    expect(init().objective).toBe('endless');
    expect(reducer(init(), lobbyActions.requestSetObjective('sprint')).objective).toBe('sprint');
    expect(reducer(init(), lobbyActions.requestSetObjective('marathon')).objective).toBe('marathon');
  });
});
