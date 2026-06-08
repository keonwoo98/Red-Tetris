import { describe, it, expect } from 'vitest';
import { act, render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { RoomState } from '@shared/protocol';
import { gameActions } from '../store/gameSlice';
import { lobbyActions } from '../store/lobbySlice';
import { GameRoute } from './GameRoute';
import { makeStore, type TestStore } from './test-utils';

const lobbyRoom: RoomState = {
  room: 'neon',
  status: 'lobby',
  hostId: 'a',
  players: [{ id: 'a', name: 'alice', isHost: true, alive: true }],
  seed: null,
  mode: 'classic',
};

const renderRoute = (store: TestStore) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/neon/alice']}>
        <Routes>
          <Route path="/:room/:player" element={<GameRoute />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );

describe('<GameRoute> start-race guard', () => {
  it('does NOT wipe a freshly started game when game:started lands before room:state', () => {
    const store = makeStore();
    renderRoute(store);
    // connected + in the lobby
    act(() => store.dispatch(lobbyActions.joined({ state: lobbyRoom, youId: 'a' })));
    // game:started arrives first (game → playing, piece spawned) while the room is still 'lobby'
    act(() => store.dispatch(gameActions.startGame({ seed: 42 })));
    // the reset effect must not fire in this window
    expect(store.getState().game.status).toBe('playing');
    expect(store.getState().game.current).not.toBeNull();
  });

  it('DOES reset a stale game-over once the room returns to the lobby (relaunch)', () => {
    const store = makeStore();
    renderRoute(store);
    act(() => store.dispatch(lobbyActions.joined({ state: lobbyRoom, youId: 'a' })));
    act(() => store.dispatch(gameActions.startGame({ seed: 42 })));
    act(() => store.dispatch(gameActions.gameOver({ winnerId: 'a' }))); // game → gameover
    // host relaunch returns the room to 'lobby'; the stale game-over should be cleared
    act(() => store.dispatch(lobbyActions.roomState(lobbyRoom)));
    expect(store.getState().game.status).toBe('idle');
  });
});
