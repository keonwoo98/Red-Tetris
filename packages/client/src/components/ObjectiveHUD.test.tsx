import { describe, it, expect } from 'vitest';
import type { RoomState } from '@shared/protocol';
import { gameActions } from '../store/gameSlice';
import { lobbyActions } from '../store/lobbySlice';
import { ObjectiveHUD } from './ObjectiveHUD';
import { makeStore, renderWith } from './test-utils';

const twoPlayerRoom: RoomState = {
  room: 'neon',
  status: 'playing',
  hostId: 'a',
  players: [
    { id: 'a', name: 'alice', isHost: true, alive: true },
    { id: 'b', name: 'bob', isHost: false, alive: true },
  ],
  seed: 1,
  mode: 'classic',
};

describe('<ObjectiveHUD>', () => {
  it('shows the Sprint goal and clock in a solo game', () => {
    const store = makeStore();
    store.dispatch(gameActions.startGame({ seed: 42, objective: 'sprint', startedAtMs: 0 }));
    const { getByText } = renderWith(<ObjectiveHUD />, store);
    expect(getByText('SPRINT')).toBeInTheDocument();
    expect(getByText('/ 40')).toBeInTheDocument();
  });

  it('renders nothing in Endless', () => {
    const store = makeStore();
    store.dispatch(gameActions.startGame({ seed: 42 }));
    const { container } = renderWith(<ObjectiveHUD />, store);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing once a rival is present (multiplayer)', () => {
    const store = makeStore();
    store.dispatch(lobbyActions.joined({ state: twoPlayerRoom, youId: 'a' }));
    store.dispatch(gameActions.startGame({ seed: 42, objective: 'sprint', startedAtMs: 0 }));
    const { container } = renderWith(<ObjectiveHUD />, store);
    expect(container).toBeEmptyDOMElement();
  });
});
