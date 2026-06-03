import { describe, it, expect, vi } from 'vitest';
import { intervalStream, keyToIntent, runGravityLoop } from './streams';

describe('keyToIntent', () => {
  it('maps keydown keys to input intents', () => {
    expect(keyToIntent('down', 'ArrowLeft')).toBe('left');
    expect(keyToIntent('down', 'ArrowRight')).toBe('right');
    expect(keyToIntent('down', 'ArrowUp')).toBe('rotate');
    expect(keyToIntent('down', 'ArrowDown')).toBe('soft-start');
    expect(keyToIntent('down', ' ')).toBe('hard');
    expect(keyToIntent('down', 'Spacebar')).toBe('hard');
    expect(keyToIntent('down', 'k')).toBeNull();
  });

  it('maps ArrowDown keyup to soft-end and ignores other keyups', () => {
    expect(keyToIntent('up', 'ArrowDown')).toBe('soft-end');
    expect(keyToIntent('up', 'ArrowLeft')).toBeNull();
  });
});

describe('intervalStream', () => {
  it('pushes an increasing tick count onto the flyd stream over time', () => {
    vi.useFakeTimers();
    const seen: number[] = [];
    const { stream, stop } = intervalStream(100);
    stream.map((n) => {
      seen.push(n);
      return n;
    });
    vi.advanceTimersByTime(350);
    expect(seen).toEqual([1, 2, 3]);
    stop();
    vi.useRealTimers();
  });
});

describe('runGravityLoop', () => {
  it('calls onTick once per interval until stopped', () => {
    vi.useFakeTimers();
    let ticks = 0;
    const stop = runGravityLoop(100, () => {
      ticks += 1;
    });
    vi.advanceTimersByTime(300);
    expect(ticks).toBe(3);
    stop();
    vi.advanceTimersByTime(300);
    expect(ticks).toBe(3); // no more ticks after stop
    vi.useRealTimers();
  });
});
