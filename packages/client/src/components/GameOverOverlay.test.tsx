import { describe, it, expect } from 'vitest';
import { gameActions } from '../store/gameSlice';
import { lobbyActions } from '../store/lobbySlice';
import { GameOverOverlay } from './GameOverOverlay';
import { makeStore, renderWith, type TestStore } from './test-utils';

const finish = (store: TestStore, youId: string, hostId: string, winnerId: string | null): void => {
  store.dispatch(
    lobbyActions.joined({
      state: {
        room: 'neon',
        status: 'playing',
        hostId,
        players: [{ id: youId, name: 'me', isHost: youId === hostId, alive: true }],
        seed: 1,
      },
      youId,
    }),
  );
  store.dispatch(gameActions.gameOver({ winnerId }));
};

describe('<GameOverOverlay>', () => {
  it('shows VICTORY to the winner, with a NEW ROUND button for a host', () => {
    const store = makeStore();
    finish(store, 'a', 'a', 'a');
    const { getByText, getByRole } = renderWith(<GameOverOverlay />, store);
    expect(getByText('VICTORY')).toBeInTheDocument();
    expect(getByRole('button', { name: /NEW ROUND/i })).toBeInTheDocument();
  });

  it('shows DEFEAT when another player wins', () => {
    const store = makeStore();
    finish(store, 'b', 'a', 'a');
    const { getByText } = renderWith(<GameOverOverlay />, store);
    expect(getByText('DEFEAT')).toBeInTheDocument();
  });

  it('shows GAME OVER when there is no winner (solo end)', () => {
    const store = makeStore();
    finish(store, 'a', 'a', null);
    const { getByText } = renderWith(<GameOverOverlay />, store);
    expect(getByText('GAME OVER')).toBeInTheDocument();
  });
});
