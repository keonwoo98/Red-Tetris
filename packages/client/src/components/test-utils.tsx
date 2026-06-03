import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Provider } from 'react-redux';
import gameReducer from '../store/gameSlice';
import lobbyReducer from '../store/lobbySlice';
import opponentsReducer from '../store/opponentsSlice';

/** A store WITHOUT the socket middleware — components render in isolation. */
export const makeStore = () =>
  configureStore({
    reducer: { lobby: lobbyReducer, game: gameReducer, opponents: opponentsReducer },
    middleware: (getDefault) => getDefault({ serializableCheck: false }),
  });

export type TestStore = ReturnType<typeof makeStore>;

export const renderWith = (ui: ReactElement, store: TestStore = makeStore()) => ({
  store,
  ...render(<Provider store={store}>{ui}</Provider>),
});
