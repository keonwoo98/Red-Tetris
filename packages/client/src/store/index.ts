import { configureStore } from '@reduxjs/toolkit';
import { socketMiddleware } from '../socket/middleware';
import gameReducer from './gameSlice';
import lobbyReducer from './lobbySlice';
import opponentsReducer from './opponentsSlice';

export const store = configureStore({
  reducer: {
    lobby: lobbyReducer,
    game: gameReducer,
    opponents: opponentsReducer,
  },
  // boards/pieces are plain data but large; the serializable check adds no value here
  middleware: (getDefault) => getDefault({ serializableCheck: false }).concat(socketMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
