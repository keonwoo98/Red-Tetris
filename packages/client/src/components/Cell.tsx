import type { RenderCell } from '@shared/types';
import styles from './Cell.module.css';

const CLASS: Record<number, string> = {
  0: styles.empty!,
  1: styles.c1!,
  2: styles.c2!,
  3: styles.c3!,
  4: styles.c4!,
  5: styles.c5!,
  6: styles.c6!,
  7: styles.c7!,
  8: styles.penalty!,
  9: styles.ghost!,
};

export const Cell = ({ value }: { value: RenderCell }) => (
  <div className={`${styles.cell} ${CLASS[value] ?? styles.empty}`} data-cell={value} />
);
