import { describe, it, expect } from 'vitest';
import type { PlayerDTO } from '@shared/protocol';
import { lobbyActions } from '../store/lobbySlice';
import { Lobby } from './Lobby';
import { makeStore, renderWith, type TestStore } from './test-utils';

const joinAs = (store: TestStore, youId: string, hostId: string, players: PlayerDTO[]): void => {
  store.dispatch(
    lobbyActions.joined({
      state: { room: 'neon', status: 'lobby', hostId, players, seed: null },
      youId,
    }),
  );
};

describe('<Lobby>', () => {
  it('shows the room and a START button to the host', () => {
    const store = makeStore();
    joinAs(store, 'a', 'a', [{ id: 'a', name: 'alice', isHost: true, alive: true }]);
    const { getByText, getByRole } = renderWith(<Lobby />, store);
    expect(getByText('neon')).toBeInTheDocument();
    expect(getByRole('button', { name: /START GAME/i })).toBeInTheDocument();
  });

  it('shows a waiting message to non-hosts', () => {
    const store = makeStore();
    joinAs(store, 'b', 'a', [
      { id: 'a', name: 'alice', isHost: true, alive: true },
      { id: 'b', name: 'bob', isHost: false, alive: true },
    ]);
    const { getByText, queryByRole } = renderWith(<Lobby />, store);
    expect(getByText(/waiting for the host/i)).toBeInTheDocument();
    expect(queryByRole('button', { name: /START/i })).toBeNull();
  });
});
