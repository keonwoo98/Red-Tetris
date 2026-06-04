/** Format a millisecond duration as `m:ss.cs` (minutes:seconds.centiseconds), e.g. 83450 → "1:23.45". */
export const formatTime = (ms: number): string => {
  const clamped = Math.max(0, Math.floor(ms));
  const cs = Math.floor(clamped / 10) % 100;
  const s = Math.floor(clamped / 1000) % 60;
  const m = Math.floor(clamped / 60000);
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
};
