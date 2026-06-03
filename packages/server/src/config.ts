// Loads .env (optional) then reads runtime config from the environment. Bootstrap glue.
try {
  process.loadEnvFile();
} catch {
  // .env is optional (CI / tests run without one)
}

export const PORT = Number(process.env.PORT ?? 3000);
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
export const isDev = process.env.NODE_ENV !== 'production';

// bonus: leaderboard persistence (off by default; mandatory build runs without it)
export const FEATURE_PERSISTENCE = process.env.FEATURE_PERSISTENCE === 'true';
export const SCORE_DB_PATH = process.env.SCORE_DB_PATH ?? './scores.json';
