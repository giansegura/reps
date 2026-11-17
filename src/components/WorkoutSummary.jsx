import { useEffect, useState } from 'react';
import { formatLongDate, formatWeight } from '../lib/format.js';
import { doneSets } from '../lib/history.js';
import { latestExerciseEntry } from '../lib/session.js';
import { formatElapsed } from '../lib/workout.js';
import { Icon } from './Icon.jsx';
import { SetsText } from './SetsText.jsx';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const maxWeight = (sets) => {
  const weights = sets.map(set => parseFloat(String(set.weight ?? '').replace(',', '.'))).filter(w => !Number.isNaN(w));
  return weights.length > 0 ? Math.max(...weights) : null;
};

const gain = (sets, last) => {
  const now = maxWeight(sets);
  const before = last ? maxWeight(doneSets(last.sets)) : null;
  return now !== null && before !== null && now > before ? `+${formatWeight(now - before)}` : null;
};

const useElapsed = (startedAt) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return Math.max(0, Math.floor((now - startedAt) / 1000));
};

export function WorkoutSummary({ day, workout, sessions, planId, startedAt, completed, total, onBack, onSave }) {
  const elapsed = useElapsed(startedAt);
  const left = total - completed;
  const rows = day.exercises
    .map(exercise => ({ exercise, sets: doneSets(workout[exercise.id]) }))
    .filter(row => row.sets.length > 0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="workout summary" style={{ '--accent': day.color }}>
      <header className="page-top">
        <button className="back-btn" onClick={onBack}>
          <Icon name="back" size={20} />
          Seguir entrenando
        </button>
      </header>
      <main className="workout-main">
        <div>
          <p className="kicker accent">{day.label} · {formatLongDate(new Date())}</p>
          <h1 className="summary-title">
            {left === 0 ? 'Entreno completo' : `Te ${left === 1 ? 'queda' : 'quedan'} ${plural(left, 'serie', 'series')}`}
          </h1>
        </div>
        <div className="tiles">
          <div className="tile">
            <span className="tile-value">{completed}/{total}</span>
            <span className="tile-label">series hechas</span>
          </div>
          <div className="tile">
            <span className="tile-value" role="timer" aria-label="Tiempo total">{formatElapsed(elapsed)}</span>
            <span className="tile-label">tiempo total</span>
          </div>
        </div>
        {rows.length > 0 ? (
          <section className="summary-list">
            <h2 className="kicker">Lo que has hecho</h2>
            {rows.map(({ exercise, sets }) => {
              const up = gain(sets, latestExerciseEntry(sessions, planId, exercise.id, { onlyDone: true }));
              return (
                <div key={exercise.id} className="summary-row">
                  <span className="summary-head">
                    <span className="summary-name">{exercise.name}</span>
                    {up && <span className="badge outline">{up}</span>}
                  </span>
                  <span className="summary-sets"><SetsText sets={sets} /></span>
                </div>
              );
            })}
          </section>
        ) : (
          <p className="empty-text">Aún no has marcado ninguna serie.</p>
        )}
      </main>
      <footer className="workout-foot">
        <button
          className="btn primary big"
          aria-label={`Guardar entreno, ${completed} de ${total} series`}
          disabled={completed === 0}
          onClick={onSave}
        >
          Guardar entreno
        </button>
      </footer>
    </div>
  );
}
