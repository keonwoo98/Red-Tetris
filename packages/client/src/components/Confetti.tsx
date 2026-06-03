import type { CSSProperties } from 'react';
import styles from './Confetti.module.css';

const BITS = Array.from({ length: 28 }, (_, i) => i);

/** ~28 CSS confetti bits for the victory screen. Deterministic positions (index-derived). */
export const Confetti = () => (
  <div className={styles.field} aria-hidden>
    {BITS.map((i) => (
      <div
        key={i}
        className={styles.bit}
        style={
          {
            left: `${(i * 37) % 100}%`,
            '--delay': `${(i % 8) * 110}ms`,
            '--hue': `${(i * 53) % 360}`,
            '--rot': `${(i * 47) % 360}deg`,
            '--dur': `${1300 + ((i * 67) % 900)}ms`,
          } as CSSProperties
        }
      />
    ))}
  </div>
);
