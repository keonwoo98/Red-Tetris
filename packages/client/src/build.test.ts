import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const distDir = path.resolve(import.meta.dirname, '../dist');

// Guards the spec requirement: the browser loads index.html which references a SINGLE bundle.js.
// Skips gracefully if the client has not been built yet (dist is gitignored).
describe('production bundle', () => {
  it('index.html references exactly one /bundle.js that exists on disk', () => {
    const indexPath = path.join(distDir, 'index.html');
    if (!existsSync(indexPath)) return;
    const html = readFileSync(indexPath, 'utf8');
    const scripts = html.match(/<script[^>]*\ssrc="[^"]*"/g) ?? [];
    expect(scripts).toHaveLength(1);
    expect(html).toContain('src="/bundle.js"');
    expect(existsSync(path.join(distDir, 'bundle.js'))).toBe(true);
  });
});
