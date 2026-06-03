// Room and player-name validation. Same rules for both; name uniqueness is checked
// case-insensitively inside Game. Returns the trimmed value or null if invalid.
const RE = /^[A-Za-z0-9_-]{1,16}$/;

export const validateRoom = (s: unknown): string | null =>
  typeof s === 'string' && RE.test(s.trim()) ? s.trim() : null;

export const validateName = validateRoom;
