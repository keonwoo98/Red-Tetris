import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { ReactNode } from 'react';
import type { PlayerDTO } from '@shared/protocol';
import gameReducer, { type GameState } from '../store/gameSlice';
import lobbyReducer, { type LobbyState } from '../store/lobbySlice';
import opponentsReducer from '../store/opponentsSlice';
import { useSoloObjective } from './useSoloObjective';

const freshGame = gameReducer(undefined, { type: '@@INIT' });
const freshLobby = lobbyReducer(undefined, { type: '@@INIT' });

const makeStore = (game: Partial<GameState>, lobby: Partial<LobbyState>) =>
  configureStore({
    reducer: { game: gameReducer, lobby: lobbyReducer, opponents: opponentsReducer },
    middleware: (d) => d({ serializableCheck: false }),
    preloadedState: { game: { ...freshGame, ...game }, lobby: { ...freshLobby, ...lobby } },
  });

type Store = ReturnType<typeof makeStore>;
const wrap = (store: Store) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };

const rival: PlayerDTO = { id: 'b', name: 'bob', isHost: false, alive: true };

describe('useSoloObjective', () => {
  it('completes a solo Sprint the moment the line goal is reached', () => {
    const store = makeStore(
      { status: 'playing', objective: 'sprint', lines: 40, startedAtMs: 0, score: 1234, level: 5 },
      { players: [] },
    );
    renderHook(() => useSoloObjective(), { wrapper: wrap(store) });
    const g = store.getState().game;
    expect(g.status).toBe('gameover');
    expect(g.objectiveResult).toMatchObject({ kind: 'sprint', lines: 40, score: 1234, level: 5 });
    expect(typeof g.objectiveResult!.timeMs).toBe('number');
  });

  it('does not fire before the goal', () => {
    const store = makeStore({ status: 'playing', objective: 'sprint', lines: 39 }, { players: [] });
    renderHook(() => useSoloObjective(), { wrapper: wrap(store) });
    expect(store.getState().game.status).toBe('playing');
  });

  it('is inert in Endless', () => {
    const store = makeStore(
      { status: 'playing', objective: 'endless', lines: 999 },
      { players: [] },
    );
    renderHook(() => useSoloObjective(), { wrapper: wrap(store) });
    expect(store.getState().game.status).toBe('playing');
  });

  it('does not apply in multiplayer (rival present)', () => {
    const store = makeStore(
      { status: 'playing', objective: 'sprint', lines: 40 },
      { players: [rival, rival] },
    );
    renderHook(() => useSoloObjective(), { wrapper: wrap(store) });
    expect(store.getState().game.status).toBe('playing');
  });
});
