import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { LeaderboardEntry } from '@red-tetris/shared';

export interface ScoreEntry extends LeaderboardEntry {
  ts: number;
}

export interface ScoreStore {
  record(name: string, score: number, now: number): void;
  top(limit: number): LeaderboardEntry[];
}

const MAX_KEEP = 200;

/** File-backed leaderboard (zero deps, works on every Node). Gated behind FEATURE_PERSISTENCE. */
export const createFileScoreStore = (path: string): ScoreStore => {
  const load = (): ScoreEntry[] => {
    try {
      if (!existsSync(path)) return [];
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown;
      return Array.isArray(parsed) ? (parsed as ScoreEntry[]) : [];
    } catch {
      return [];
    }
  };

  return {
    record(name, score, now) {
      if (!Number.isFinite(score) || score <= 0) return;
      const entries = load();
      entries.push({ name, score: Math.floor(score), ts: now });
      entries.sort((a, b) => b.score - a.score);
      writeFileSync(path, JSON.stringify(entries.slice(0, MAX_KEEP)));
    },
    top(limit) {
      return load()
        .slice(0, Math.max(0, limit))
        .map((e) => ({ name: e.name, score: e.score }));
    },
  };
};

/** No-op store used when persistence is disabled (the mandatory build runs with this). */
export const createNoopScoreStore = (): ScoreStore => ({
  record() {},
  top() {
    return [];
  },
});
