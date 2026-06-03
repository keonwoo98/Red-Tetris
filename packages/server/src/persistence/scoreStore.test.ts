import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { createFileScoreStore, createNoopScoreStore } from './scoreStore.js';

const TMP = '/tmp/rt-scorestore-unit.json';
afterEach(() => {
  if (existsSync(TMP)) rmSync(TMP);
});

describe('createFileScoreStore', () => {
  it('records and returns top scores sorted descending', () => {
    const s = createFileScoreStore(TMP);
    s.record('alice', 500, 1);
    s.record('bob', 1200, 2);
    s.record('carol', 300, 3);
    expect(s.top(2).map((e) => e.name)).toEqual(['bob', 'alice']);
    expect(s.top(10)).toHaveLength(3);
    expect(s.top(2)[0]).toEqual({ name: 'bob', score: 1200 });
  });

  it('ignores non-positive or non-finite scores', () => {
    const s = createFileScoreStore(TMP);
    s.record('x', 0, 1);
    s.record('y', -5, 2);
    s.record('z', Number.NaN, 3);
    expect(s.top(10)).toEqual([]);
  });

  it('returns empty for a corrupt file', () => {
    writeFileSync(TMP, 'not json at all');
    expect(createFileScoreStore(TMP).top(10)).toEqual([]);
  });
});

describe('createNoopScoreStore', () => {
  it('records nothing and returns no entries', () => {
    const s = createNoopScoreStore();
    s.record('a', 100, 1);
    expect(s.top(10)).toEqual([]);
  });
});
