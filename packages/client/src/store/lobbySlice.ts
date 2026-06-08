import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { GameMode, SoloObjective } from '@shared/constants';
import type { GameStatus, LeaderboardEntry, PlayerDTO, RoomState } from '@shared/protocol';

export interface LobbyState {
  room: string | null;
  myId: string | null; // = server-assigned youId (NOT socket.id)
  myName: string | null;
  hostId: string | null;
  players: PlayerDTO[];
  status: GameStatus;
  mode: GameMode;
  objective: SoloObjective; // client-local solo win goal; ignored in multiplayer (last-standing wins)
  leaderboard: LeaderboardEntry[]; // persisted high scores (bonus); fetched via the socket middleware
  connection: 'idle' | 'connecting' | 'connected' | 'error';
  joinError: string | null;
}

const initialState: LobbyState = {
  room: null,
  myId: null,
  myName: null,
  hostId: null,
  players: [],
  status: 'lobby',
  mode: 'classic',
  objective: 'endless',
  leaderboard: [],
  connection: 'idle',
  joinError: null,
};

const applyRoom = (s: LobbyState, r: RoomState): void => {
  s.room = r.room;
  s.hostId = r.hostId;
  s.players = r.players;
  s.status = r.status;
  s.mode = r.mode;
};

const lobbySlice = createSlice({
  name: 'lobby',
  initialState,
  reducers: {
    setIdentity(s, a: PayloadAction<{ room: string; name: string }>) {
      s.room = a.payload.room;
      s.myName = a.payload.name;
      s.connection = 'connecting';
      s.joinError = null;
    },
    connecting(s) {
      s.connection = 'connecting';
    },
    joined(s, a: PayloadAction<{ state: RoomState; youId: string }>) {
      s.myId = a.payload.youId;
      s.connection = 'connected';
      s.joinError = null;
      applyRoom(s, a.payload.state);
    },
    roomState(s, a: PayloadAction<RoomState>) {
      applyRoom(s, a.payload);
    },
    hostChanged(s, a: PayloadAction<{ hostId: string }>) {
      s.hostId = a.payload.hostId;
    },
    joinRejected(s, a: PayloadAction<{ reason: string }>) {
      s.connection = 'error';
      s.joinError = a.payload.reason;
    },
    // middleware-only triggers (no state change)
    requestStart() {},
    requestRestart() {},
    requestSetMode(_s, _a: PayloadAction<GameMode>) {},
    // client-local solo objective (no socket round-trip — solo is a single player's own choice)
    requestSetObjective(s, a: PayloadAction<SoloObjective>) {
      s.objective = a.payload;
    },
    // leaderboard: requestLeaderboard is a middleware trigger; leaderboardLoaded stores the reply
    requestLeaderboard() {},
    leaderboardLoaded(s, a: PayloadAction<LeaderboardEntry[]>) {
      s.leaderboard = a.payload;
    },
    connectionError(s) {
      s.connection = 'error';
    },
    leaveLobby() {
      return initialState;
    },
  },
});

export const lobbyActions = lobbySlice.actions;
export default lobbySlice.reducer;
export type { GameStatus };
