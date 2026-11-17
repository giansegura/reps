import { useState } from 'react';
import { formatDayAgo, formatLongDate, formatWeight } from '../lib/format.js';
import { latestExerciseEntry, latestSession } from '../lib/session.js';
import { groupExercises } from '../lib/superset.js';
import { suggestDay } from '../lib/today.js';
import { Icon } from './Icon.jsx';
import { InstallHint } from './InstallHint.jsx';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const totalSets = (day) => day.exercises.reduce((sum, ex) => sum + ex.sets, 0);

const lastDone = (sessions, planId, day, now) => {
  const last = latestSession(sessions, planId, day.id);
  return last ? formatDayAgo(last.date, now) : null;
};

const dayMeta = (sessions, planId, day, now) => {
  const last = lastDone(sessions, planId, day, now);
  return [
    plural(day.exercises.length, 'ejercicio', 'ejercicios'),
    plural(totalSets(day), 'serie', 'series'),
    ...(last ? [`última vez ${last}`] : []),
  ].join(' · ');
};

function ExerciseList({ day, planId, sessions }) {
  const row = (ex) => {
    const weight = formatWeight(latestExerciseEntry(sessions, planId, ex.id)?.sets?.[1]?.weight);
    return (
      <li key={ex.id} className="hero-ex">
        <span className="hero-ex-main">
          <span className="hero-ex-name">{ex.name}</span>
          <span className="hero-ex-target">{ex.sets} × {ex.reps}</span>
        </span>
        {weight && <span className="hero-ex-last">{weight}</span>}
      </li>
    );
  };

  return (
    <ol className="hero-list">
      {groupExercises(day.exercises).map(group => (group.superset ? (
        <li key={group.exercises[0].id} className="hero-superset">
          <span className="kicker">Superserie</span>
          <ol className="hero-list">{group.exercises.map(row)}</ol>
        </li>
      ) : row(group.exercises[0])))}
    </ol>
  );
}

function OtherDay({ day, text, onPick }) {
  const empty = day.exercises.length === 0;
  return (
    <button className="day-row" disabled={empty} onClick={() => onPick(day)}>
      <span className="dot" style={{ background: day.color }} />
      <span className="day-row-label">{day.label}</span>
      <span className="day-row-meta">{empty ? 'sin ejercicios' : text}</span>
      {!empty && <Icon name="right" size={18} />}
    </button>
  );
}

export function Home({ plan, planId, planName, sessions, now = new Date(), onStartWorkout, onOpenPlans, onOpenPlan }) {
  const [chosenId, setChosenId] = useState(null);
  const { doneToday, next } = suggestDay(plan, sessions, planId, now);
  const chosen = plan.find(d => d.id === chosenId && d.exercises.length > 0) ?? null;
  const done = chosen ? null : doneToday;
  const hero = chosen ?? done ?? next;
  const upcoming = done && next && next.id !== done.id ? next : null;
  const others = plan.filter(d => d.id !== hero?.id && d.id !== upcoming?.id);
  const today = formatLongDate(now);

  const pick = (day) => {
    setChosenId(day.id);
    window.scrollTo(0, 0);
  };

  const otherText = (day) => {
    if (day.id === next?.id && !done) return 'te toca';
    const last = lastDone(sessions, planId, day, now);
    if (!last) return 'sin entrenos';
    return last === 'hoy' || last === 'ayer' ? `hecho ${last}` : last;
  };

  return (
    <>
      <header className="home-top">
        <button className="plan-switcher" onClick={onOpenPlans}>
          <span>{planName}</span>
          <Icon name="down" size={18} />
        </button>
        <p className="brand" translate="no">Reps</p>
      </header>
      <h1 className="sr-only">Hoy</h1>
      <InstallHint />
      {!hero ? (
        <div className="empty">
          <p className="empty-text">
            {plan.length === 0
              ? 'No tienes días en tu plan. Crea el primero para empezar.'
              : 'Tus días aún no tienen ejercicios. Añade alguno para empezar.'}
          </p>
          <button className="btn" onClick={onOpenPlan}>Editar plan</button>
        </div>
      ) : (
        <section className="hero" style={{ '--accent': hero.color }}>
          <p className="kicker accent">
            {done && <Icon name="check" size={18} strokeWidth={3.5} />}
            {done ? 'Hecho hoy' : chosen ? 'Día elegido' : 'Te toca hoy'} · {today}
          </p>
          <h2 className={`hero-title${done ? ' small' : ''}`}>{hero.label}</h2>
          {done && (
            <button className="btn quiet start" onClick={() => onStartWorkout(hero)}>Repetir este día</button>
          )}
          {!done && (
            <>
              <p className="hero-meta">{dayMeta(sessions, planId, hero, now)}</p>
              <ExerciseList day={hero} planId={planId} sessions={sessions} />
              <button className="btn primary big" onClick={() => onStartWorkout(hero)}>Empezar entreno</button>
            </>
          )}
        </section>
      )}
      {upcoming && (
        <section className="upcoming" style={{ '--accent': upcoming.color }}>
          <h2 className="kicker">Siguiente</h2>
          <p className="upcoming-title">
            <span className="dot big" style={{ background: upcoming.color }} />
            {upcoming.label}
          </p>
          <ExerciseList day={upcoming} planId={planId} sessions={sessions} />
          <button className="btn outline" onClick={() => onStartWorkout(upcoming)}>Empezar {upcoming.label}</button>
        </section>
      )}
      {hero && others.length > 0 && (
        <section className="others">
          <h2 className="kicker">Otros días</h2>
          {others.map(day => <OtherDay key={day.id} day={day} text={otherText(day)} onPick={pick} />)}
        </section>
      )}
    </>
  );
}
