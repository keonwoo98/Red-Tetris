const sanitize = (v: string): string => v.trim().replace(/[^A-Za-z0-9_-]/g, '');

/**
 * Parse the legacy hash-based access URL — `#<room>[<player>]` (and the tolerant `#<room>/<player>`).
 * Returns null when there is no joinable room+player. PURE.
 */
export const parseHashRoute = (hash: string): { room: string; player: string } | null => {
  const raw = hash.replace(/^#/, '');
  if (!raw) return null;
  const m = raw.match(/^([^[/]+)(?:\[([^\]]*)\]|\/(.*))$/);
  if (!m) return null;
  const room = sanitize(m[1] ?? '');
  const player = sanitize(m[2] ?? m[3] ?? '');
  if (!room || !player) return null;
  return { room, player };
};
