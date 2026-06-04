import { describe, it, expect } from 'vitest';
import { formatTime } from './format';

describe('formatTime', () => {
  it('formats as m:ss.cs', () => {
    expect(formatTime(0)).toBe('0:00.00');
    expect(formatTime(1500)).toBe('0:01.50');
    expect(formatTime(83450)).toBe('1:23.45');
    expect(formatTime(605000)).toBe('10:05.00');
  });

  it('clamps negatives to zero', () => {
    expect(formatTime(-1234)).toBe('0:00.00');
  });
});
