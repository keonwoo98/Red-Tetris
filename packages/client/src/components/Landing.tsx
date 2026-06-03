import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Landing.module.css';

const clean = (v: string): string => v.trim().replace(/[^A-Za-z0-9_-]/g, '');

export const Landing = () => {
  const navigate = useNavigate();
  const [room, setRoom] = useState('');
  const [name, setName] = useState('');
  const ready = clean(room).length > 0 && clean(name).length > 0;

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    if (ready) navigate(`/${clean(room)}/${clean(name)}`);
  };

  return (
    <main className={styles.screen}>
      <div className={styles.glow} aria-hidden />
      <section className={styles.hero}>
        <p className={styles.kicker}>TETRIS NETWORK · RED PELICANS SAUCE</p>
        <h1 className={styles.logo}>
          RED<span className={styles.t}>TETRIS</span>
        </h1>
        <p className={styles.tagline}>
          Disrupt intergalactic gaming sessions. Same pieces, same seed — last pelican flying wins.
        </p>

        <form className={styles.form} onSubmit={submit}>
          <label className={styles.field}>
            <span>ROOM</span>
            <input
              className={styles.input}
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="neon"
              maxLength={16}
              autoFocus
            />
          </label>
          <label className={styles.field}>
            <span>PLAYER</span>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="alice"
              maxLength={16}
            />
          </label>
          <button className={styles.enter} type="submit" disabled={!ready}>
            ENTER ARENA →
          </button>
        </form>
        <p className={styles.hint}>letters · numbers · _ · - &nbsp;(max 16)</p>
      </section>
    </main>
  );
};
