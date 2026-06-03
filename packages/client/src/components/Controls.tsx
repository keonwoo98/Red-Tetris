import styles from './Controls.module.css';

export const Controls = () => (
  <div className={styles.wrap}>
    <div className={styles.title}>CONTROLS</div>
    <ul className={styles.keys}>
      <li>
        <span className={styles.combo}>
          <kbd>←</kbd>
          <kbd>→</kbd>
        </span>
        <span className={styles.act}>move</span>
      </li>
      <li>
        <kbd>↑</kbd>
        <span className={styles.act}>rotate</span>
      </li>
      <li>
        <kbd>↓</kbd>
        <span className={styles.act}>soft drop</span>
      </li>
      <li>
        <kbd className={styles.space}>space</kbd>
        <span className={styles.act}>hard drop</span>
      </li>
      <li>
        <kbd>C</kbd>
        <span className={styles.act}>hold</span>
      </li>
    </ul>
  </div>
);
