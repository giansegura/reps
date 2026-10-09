import { formatDate, formatWeight, getLastWeight } from '../lib/format.js';
import { InstallHint } from './InstallHint.jsx';

export function Home({ plan, planName, sessions, onStartWorkout, onOpenPlans, onOpenPlan }) {
  return (
    <>
      <header className="header">
        <p className="brand" translate="no">Reps</p>
        <h1 className="title">Hoy</h1>
        <p className="subtitle">Elige tu entrenamiento</p>
      </header>
      <InstallHint />
      <button className="plan-switcher" onClick={onOpenPlans}>
        <span>{planName}</span>
        <span className="plan-switcher-caret" aria-hidden="true">▾</span>
      </button>
      {plan.length === 0 ? (
        <p className="empty-text">No tienes días en tu plan. Crea el primero para empezar.</p>
      ) : (
        <div className="day-cards">
          {plan.map(day => {
            const lastSession = sessions.find(s => s.dayId === day.id);
            const empty = day.exercises.length === 0;
            return (
              <button
                key={day.id}
                className="day-card"
                disabled={empty}
                onClick={() => onStartWorkout(day)}
              >
                <span className="day-card-header">
                  <span className="day-id">
                    <span className="dot" style={{ background: day.color }} />
                    <span className="day-label">{day.label}</span>
                  </span>
                  <span className="ex-count">
                    {empty ? 'Sin ejercicios' : `${day.exercises.length} ${day.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}`}
                  </span>
                </span>
                {day.exercises.map((ex, i) => {
                  const lastWeight = formatWeight(getLastWeight(lastSession, ex.id));
                  return (
                    <span key={ex.id} className="exercise-row">
                      <span className="name">
                        <span className="ex-num">{i + 1}</span>{ex.name}
                      </span>
                      <span className="meta">
                        {ex.sets}×{ex.reps}
                        {lastWeight && <span className="last-w"> · {lastWeight}</span>}
                      </span>
                    </span>
                  );
                })}
                {lastSession && (
                  <span className="last-session">Último · {formatDate(lastSession.date)}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      <button className="ghost-btn" onClick={onOpenPlan}>Editar plan</button>
    </>
  );
}
