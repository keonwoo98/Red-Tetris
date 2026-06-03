// Minimal flyd typings (no @types/flyd published). Covers the subset we use.
declare module 'flyd' {
  export interface Stream<T> {
    (): T;
    (value: T): Stream<T>;
    map<U>(fn: (value: T) => U): Stream<U>;
    end: Stream<boolean>;
  }
  export function stream<T>(initial?: T): Stream<T>;
  export function on<T>(fn: (value: T) => void, source: Stream<T>): Stream<undefined>;
  export function map<T, U>(fn: (value: T) => U, source: Stream<T>): Stream<U>;
  interface FlydStatic {
    stream: typeof stream;
    on: typeof on;
    map: typeof map;
  }
  const flyd: FlydStatic;
  export default flyd;
}
