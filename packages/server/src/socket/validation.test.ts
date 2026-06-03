import { describe, it, expect } from 'vitest';
import { validateRoom, validateName } from './validation.js';

describe('validation', () => {
  it('accepts valid values and trims surrounding whitespace', () => {
    expect(validateRoom('neon')).toBe('neon');
    expect(validateRoom('  alice_1  ')).toBe('alice_1');
    expect(validateName('Bob-2')).toBe('Bob-2');
    expect(validateRoom('a'.repeat(16))).toBe('a'.repeat(16)); // max length
  });

  it('rejects invalid values', () => {
    expect(validateRoom('')).toBe(null);
    expect(validateRoom('a b')).toBe(null); // space
    expect(validateRoom('a'.repeat(17))).toBe(null); // too long
    expect(validateRoom('bad!')).toBe(null); // illegal char
    expect(validateRoom(42)).toBe(null); // non-string
    expect(validateRoom(null)).toBe(null);
    expect(validateRoom(undefined)).toBe(null);
  });
});
