import flyd, { type Stream } from 'flyd';

// Functional Reactive Programming (bonus): model input + gravity as flyd streams.
// The pure game engine is untouched — these streams only feed it.

export type InputIntent =
  | 'left'
  | 'right'
  | 'rotate'
  | 'soft-start'
  | 'soft-end'
  | 'hard'
  | 'hold'
  | 'left-up'
  | 'right-up';

/** PURE: map a key event phase + key to an input intent (or null). */
export const keyToIntent = (phase: 'down' | 'up', key: string): InputIntent | null => {
  if (phase === 'down') {
    switch (key) {
      case 'ArrowLeft':
        return 'left';
      case 'ArrowRight':
        return 'right';
      case 'ArrowUp':
        return 'rotate';
      case 'ArrowDown':
        return 'soft-start';
      case ' ':
      case 'Spacebar':
        return 'hard';
      case 'c':
      case 'C':
      case 'Shift':
        return 'hold';
      default:
        return null;
    }
  }
  switch (key) {
    case 'ArrowDown':
      return 'soft-end';
    case 'ArrowLeft':
      return 'left-up';
    case 'ArrowRight':
      return 'right-up';
    default:
      return null;
  }
};

export interface IntervalStream {
  stream: Stream<number>;
  stop: () => void;
}

/** A flyd stream that emits an increasing tick count every `ms`. */
export const intervalStream = (ms: number): IntervalStream => {
  const s = flyd.stream<number>();
  let n = 0;
  const id = setInterval(() => {
    n += 1;
    s(n);
  }, ms);
  return { stream: s, stop: () => clearInterval(id) };
};

/**
 * Drive `onTick` from a flyd interval stream and return a stop function.
 * Encapsulates flyd inside the FRP layer so consumers stay flyd-agnostic.
 */
export const runGravityLoop = (ms: number, onTick: () => void): (() => void) => {
  const s = flyd.stream<number>();
  let n = 0;
  const id = setInterval(() => {
    n += 1;
    s(n);
  }, ms);
  const sub = flyd.on(onTick, s);
  return () => {
    clearInterval(id);
    sub.end(true);
  };
};
