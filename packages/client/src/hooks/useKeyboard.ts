import { useEffect } from 'react';
import flyd from 'flyd';
import { keyToIntent } from '../frp/streams';
import { gameActions } from '../store/gameSlice';
import { useAppDispatch } from './redux';

/**
 * Keyboard input as flyd streams (FRP bonus). Raw keydown/keyup events feed two flyd streams;
 * `flyd.on` maps each event (via the pure `keyToIntent`) to a dispatched game action.
 * Bound only while `enabled` (alive && playing).
 */
export const useKeyboard = (enabled: boolean): void => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!enabled) return;

    const down$ = flyd.stream<KeyboardEvent>();
    const up$ = flyd.stream<KeyboardEvent>();

    const onKeyDown = (e: KeyboardEvent): void => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (keyToIntent('down', e.key)) {
        e.preventDefault();
        down$(e);
      }
    };
    const onKeyUp = (e: KeyboardEvent): void => {
      if (keyToIntent('up', e.key)) up$(e);
    };

    const downSub = flyd.on((e) => {
      switch (keyToIntent('down', e.key)) {
        case 'left':
          dispatch(gameActions.moveLeft());
          break;
        case 'right':
          dispatch(gameActions.moveRight());
          break;
        case 'rotate':
          dispatch(gameActions.rotateCW());
          break;
        case 'soft-start':
          dispatch(gameActions.setSoftDrop(true));
          dispatch(gameActions.softDrop());
          break;
        case 'hard':
          dispatch(gameActions.hardDrop());
          break;
        default:
          break;
      }
    }, down$);
    const upSub = flyd.on(() => dispatch(gameActions.setSoftDrop(false)), up$);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      downSub.end(true);
      upSub.end(true);
    };
  }, [enabled, dispatch]);
};
