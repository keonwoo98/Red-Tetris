import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './createHttpApp.js';

let server: Server | undefined;

afterEach(async () => {
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
  server = undefined;
});

const listen = (): Promise<number> => {
  const app = buildApp('/tmp/red-tetris-nonexistent-dist');
  server = createServer(app);
  return new Promise((resolve) => {
    server!.listen(0, () => resolve((server!.address() as AddressInfo).port));
  });
};

describe('http app', () => {
  it('serves /health as JSON', async () => {
    const port = await listen();
    const res = await fetch(`http://localhost:${port}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; uptime: number };
    expect(body.status).toBe('ok');
    expect(typeof body.uptime).toBe('number');
  });
});
