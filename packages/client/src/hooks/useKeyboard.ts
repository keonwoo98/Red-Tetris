import { useEffect } from 'react';
import { gameActions } from '../store/gameSlice';
import { useAppDispatch } from './redux';

/** Arrow keys + Space → game actions. Bound only while `enabled` (alive && playing). */
export const useKeyboard = (enabled: boolean): void => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent): void => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      switch (e.key) {
        case 'ArrowLeft':
          dispatch(gameActions.moveLeft());
          break;
        case 'ArrowRight':
          dispatch(gameActions.moveRight());
          break;
        case 'ArrowUp':
          dispatch(gameActions.rotateCW());
          break;
        case 'ArrowDown':
          dispatch(gameActions.setSoftDrop(true));
          dispatch(gameActions.softDrop());
          break;
        case ' ':
        case 'Spacebar':
          dispatch(gameActions.hardDrop());
          break;
        default:
          return;
      }
      e.preventDefault();
    };

    const onKeyUp = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowDown') dispatch(gameActions.setSoftDrop(false));
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [enabled, dispatch]);
};
