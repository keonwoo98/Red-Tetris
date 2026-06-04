import { useEffect } from 'react';
import flyd from 'flyd';
import { ARR_MS, DAS_MS } from '@shared/constants';
import { keyToIntent } from '../frp/streams';
import { gameActions } from '../store/gameSlice';
import { useAppDispatch } from './redux';

/**
 * Keyboard input as flyd streams (FRP bonus). Raw keydown/keyup events feed two flyd streams;
 * `flyd.on` maps each event (via the pure `keyToIntent`) to a dispatched game action.
 *
 * Horizontal movement uses DAS/ARR (delayed auto shift / auto repeat rate) instead of the OS
 * key-repeat: a press steps once immediately, holding past DAS_MS auto-repeats every ARR_MS, and
 * the still-held opposite key takes over on release. OS auto-repeat (`e.repeat`) is ignored so the
 * feel matches modern Tetris (TETR.IO/Jstris). Bound only while `enabled` (alive && playing).
 */
export const useKeyboard = (enabled: boolean): void => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!enabled) return;

    const down$ = flyd.stream<KeyboardEvent>();
    const up$ = flyd.stream<KeyboardEvent>();

    // --- DAS/ARR horizontal auto-shift state (closure-local; no `this`) ---
    const held = { left: false, right: false };
    let activeDir: 'left' | 'right' | null = null;
    let dasId: ReturnType<typeof setTimeout> | null = null;
    let arrId: ReturnType<typeof setInterval> | null = null;

    const stepDir = (dir: 'left' | 'right'): void => {
      dispatch(dir === 'left' ? gameActions.moveLeft() : gameActions.moveRight());
    };
    const clearAuto = (): void => {
      if (dasId !== null) {
        clearTimeout(dasId);
        dasId = null;
      }
      if (arrId !== null) {
        clearInterval(arrId);
        arrId = null;
      }
    };
    const startAuto = (dir: 'left' | 'right'): void => {
      clearAuto();
      activeDir = dir;
      stepDir(dir); // immediate response on press
      dasId = setTimeout(() => {
        dasId = null;
        arrId = setInterval(() => stepDir(dir), ARR_MS);
      }, DAS_MS);
    };
    const releaseDir = (dir: 'left' | 'right'): void => {
      held[dir] = false;
      if (activeDir !== dir) return; // releasing a non-active key: nothing running for it
      clearAuto();
      activeDir = null;
      const other = dir === 'left' ? 'right' : 'left';
      if (held[other]) startAuto(other); // hand auto-shift back to the still-held key
    };

    const onKeyDown = (e: KeyboardEvent): void => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.repeat) return; // DAS/ARR owns repeat; drop the OS auto-repeat stream
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
          held.left = true;
          startAuto('left');
          break;
        case 'right':
          held.right = true;
          startAuto('right');
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
        case 'hold':
          dispatch(gameActions.holdPiece());
          break;
        default:
          break;
      }
    }, down$);
    const upSub = flyd.on((e) => {
      switch (keyToIntent('up', e.key)) {
        case 'soft-end':
          dispatch(gameActions.setSoftDrop(false));
          break;
        case 'left-up':
          releaseDir('left');
          break;
        case 'right-up':
          releaseDir('right');
          break;
        default:
          break;
      }
    }, up$);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      clearAuto();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      downSub.end(true);
      upSub.end(true);
    };
  }, [enabled, dispatch]);
};
