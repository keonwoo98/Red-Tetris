import { BOARD_HEIGHT, BOARD_WIDTH, EMPTY } from '@shared/constants';
import type { Board } from '@shared/types';

/**
 * Per-column height = BOARD_HEIGHT − index of the topmost filled cell (0 if the column is empty).
 * Returns an array of length 10, each value 0..20. PURE.
 */
export const computeSpectrum = (board: Board): number[] => {
  const spectrum: number[] = [];
  for (let col = 0; col < BOARD_WIDTH; col++) {
    let height = 0;
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      if (board[row]![col] !== EMPTY) {
        height = BOARD_HEIGHT - row;
        break;
      }
    }
    spectrum.push(height);
  }
  return spectrum;
};
