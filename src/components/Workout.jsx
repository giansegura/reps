import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatRest, formatSet } from '../lib/format.js';
import { restOf } from '../lib/plan.js';
import { latestExerciseEntry } from '../lib/session.js';
import { groupExercises, groupSteps, restAfterStep } from '../lib/superset.js';
import { countDone, formatElapsed, isDone, nextGroupIndex, pendingStep, stepReps, stepWeight } from '../lib/workout.js';
import { ConfirmSheet } from './ConfirmSheet.jsx';
import { ExerciseNoteEditor } from './ExerciseNoteEditor.jsx';
import { Icon } from './Icon.jsx';
import { ProgressSheet } from './ProgressSheet.jsx';
import { WorkoutIndex } from './WorkoutIndex.jsx';
import { WorkoutSummary } from './WorkoutSummary.jsx';

let audioCtx = null;

const primeAudio = () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
};

const playAlert = () => {
  if (!audioCtx) return;
  [0, 0.28, 0.56].forEach((offset) => {
    const at = audioCtx.currentTime + offset;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.35, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(at);
    osc.stop(at + 0.24);
  });
};

const INTERACTIVE = 'input, textarea, select, button, a, [contenteditable="true"], [role="dialog"], [role="alertdialog"]';

const isInteractive = (target) => target instanceof Element && !!target.closest(INTERACTIVE);

const isModalOpen = () => !!document.querySelector('[aria-modal="true"]');

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const sameStep = (a, b) => !!a && !!b && a.exercise.id === b.exercise.id && a.set === b.set;

const useSecondsSince = (start, interval) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (start === null) return undefined;
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [start, interval]);

  return start === null ? 0 : Math.max(0, Math.floor((now - start) / 1000));
};

const RestTimer = ({ startedAt, alertSeconds, onRestart }) => {
  const elapsed = useSecondsSince(startedAt, 250);
  const alertedFor = useRef(null);
  const running = startedAt !== null;
  const over = running && alertSeconds !== null && elapsed >= alertSeconds;
  const filled = running && alertSeconds !== null ? Math.min(100, (elapsed / alertSeconds) * 100) : 0;

  useEffect(() => {
    if (!over || alertedFor.current === startedAt) return;
    alertedFor.current = startedAt;
    playAlert();
  }, [over, startedAt]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code !== 'Space' || e.repeat || isInteractive(e.target) || isModalOpen()) return;
      e.preventDefault();
      onRestart();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onRestart]);

  return (
    <div className={`rest${running ? '' : ' idle'}${over ? ' over' : ''}`}>
      <span className="rest-label">Descanso</span>
      <span role="timer" aria-label="Descanso" className="rest-time">{formatElapsed(elapsed)}</span>
      <span className="rest-track" aria-hidden="true">
        <span className="rest-fill" style={{ width: `${filled}%` }} />
      </span>
      <span className="rest-alert">{alertSeconds === null ? 'sin descanso' : `aviso ${formatRest(alertSeconds)}`}</span>
      <button className="rest-restart" aria-label="Reiniciar descanso" onClick={onRestart}>
        <Icon name="restart" />
      </button>
    </div>
  );
};

const WorkoutTimer = ({ startedAt }) => {
  const elapsed = useSecondsSince(startedAt, 1000);

  return (
    <span className="workout-total">
      Total <span role="timer" aria-label="Tiempo total" className="workout-timer">{formatElapsed(elapsed)}</span>
    </span>
  );
};

const Segments = ({ exercises, workout, current }) => (
  <span className="segments" aria-hidden="true">
    {exercises.map(ex => (
      <span key={ex.id} className="segment-group" style={{ flexGrow: ex.sets }}>
        {Array.from({ length: ex.sets }, (_, i) => i + 1).map(set => {
          const done = !!workout[ex.id]?.[set]?.done;
          const now = current?.exercise.id === ex.id && current.set === set;
          return <span key={set} className={`segment${done ? ' done' : ''}${now && !done ? ' now' : ''}`} />;
        })}
      </span>
    ))}
  </span>
);

const Stepper = ({ unit, children, onDecrease, onIncrease, decreaseLabel, increaseLabel, disabled }) => (
  <div className="stepper">
    <button className="stepper-btn" aria-label={decreaseLabel} disabled={disabled} onClick={onDecrease}>
      <Icon name="minus" size={24} strokeWidth={3} />
    </button>
    <div className="stepper-value">
      {children}
      {unit && <span className="stepper-unit">{unit}</span>}
    </div>
    <button className="stepper-btn" aria-label={increaseLabel} disabled={disabled} onClick={onIncrease}>
      <Icon name="plus" size={24} strokeWidth={3} />
    </button>
  </div>
);

export function Workout({
  activeDay,
  currentWorkout,
  currentNotes,
  startedAt,
  restStartedAt,
  restAlert = null,
  onRestartRest,
  sessions,
  planId,
  progressPeriod,
  progressMetric,
  onProgressPeriodChange,
  onProgressMetricChange,
  onSaveField,
  onSaveNote,
  onTogglePC,
  onToggleDone,
  onFinish,
  onExit,
}) {
  const groups = useMemo(() => groupExercises(activeDay.exercises), [activeDay]);
  const [groupIndex, setGroupIndex] = useState(() => {
    const first = groups.findIndex(group => pendingStep(group, currentWorkout));
    return first === -1 ? 0 : first;
  });
  const [selected, setSelected] = useState(null);
  const [finishing, setFinishing] = useState(false);
  const [exitOpener, setExitOpener] = useState(null);
  const [indexOpener, setIndexOpener] = useState(null);
  const [noteEditor, setNoteEditor] = useState(null);
  const [progressSheet, setProgressSheet] = useState(null);
  const noteButton = useRef(null);
  const closeExit = useCallback(() => setExitOpener(null), []);
  const closeIndex = useCallback(() => setIndexOpener(null), []);
  const closeNoteEditor = useCallback(() => setNoteEditor(null), []);
  const closeProgress = useCallback(() => setProgressSheet(null), []);

  useEffect(() => {
    window.addEventListener('pointerdown', primeAudio);
    window.addEventListener('keydown', primeAudio);
    return () => {
      window.removeEventListener('pointerdown', primeAudio);
      window.removeEventListener('keydown', primeAudio);
    };
  }, []);

  const exercises = activeDay.exercises;
  const total = exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const completed = exercises.reduce((sum, ex) => sum + countDone(currentWorkout, ex), 0);
  const group = groups[groupIndex];
  const steps = groupSteps(group);
  const pending = pendingStep(group, currentWorkout);
  const current = (selected && steps.find(step => sameStep(step, selected))) || pending;
  const exercise = current?.exercise ?? group.exercises[0];
  const set = current ? currentWorkout[exercise.id]?.[current.set] ?? {} : {};
  const currentDone = !!current && isDone(currentWorkout, current);
  const isBW = set.weight === 'PC';
  const position = exercises.findIndex(ex => ex.id === exercise.id) + 1;
  const sessionNote = currentNotes[exercise.id] || '';
  const lastSet = current ? latestExerciseEntry(sessions, planId, exercise.id)?.sets?.[current.set] : null;
  const upcomingGroup = nextGroupIndex(groups, currentWorkout, groupIndex);
  const nextInRound = current && !currentDone && group.superset
    ? steps.slice(steps.findIndex(step => sameStep(step, current)) + 1)
      .find(step => step.set === current.set && !isDone(currentWorkout, step))
    : null;
  const idleAlert = restOf(exercise);
  const restart = useCallback(() => onRestartRest(idleAlert), [onRestartRest, idleAlert]);

  const goToGroup = (index) => {
    setGroupIndex(index);
    setSelected(null);
  };

  const markDone = () => {
    const after = {
      ...currentWorkout,
      [exercise.id]: { ...currentWorkout[exercise.id], [current.set]: { ...set, done: true } },
    };
    onToggleDone(exercise.id, current.set, restAfterStep(group, current));
    setSelected(null);
    if (pendingStep(group, after)) return;
    const next = nextGroupIndex(groups, after, groupIndex);
    if (next !== null) setGroupIndex(next);
  };

  if (finishing) {
    return (
      <WorkoutSummary
        day={activeDay}
        workout={currentWorkout}
        sessions={sessions}
        planId={planId}
        startedAt={startedAt}
        completed={completed}
        total={total}
        onBack={() => setFinishing(false)}
        onSave={onFinish}
      />
    );
  }

  const kicker = group.superset
    ? `Superserie · ejercicio ${position} de ${exercises.length}`
    : `Ejercicio ${position} de ${exercises.length}`;
  const setTitle = current && (group.superset
    ? `Ronda ${current.set} de ${Math.max(...group.exercises.map(e => e.sets))}`
    : `Serie ${current.set} de ${exercise.sets}`);
  const doneSteps = steps.filter(step => isDone(currentWorkout, step) && !sameStep(step, current));

  return (
    <div className="workout" style={{ '--accent': activeDay.color }}>
      <header className="workout-top">
        <div className="workout-bar">
          <button className="round-btn" aria-label="Salir sin guardar" onClick={(e) => setExitOpener(e.currentTarget)}>
            <Icon name="close" />
          </button>
          <div className="workout-title">
            <span className="workout-day">{activeDay.label}</span>
            <WorkoutTimer startedAt={startedAt} />
          </div>
          <button className="pill-btn" onClick={() => setFinishing(true)}>Terminar</button>
        </div>
        <button
          className="segments-btn"
          aria-label={`${completed} de ${total} series hechas. Ver todos los ejercicios`}
          onClick={(e) => setIndexOpener(e.currentTarget)}
        >
          <Segments exercises={exercises} workout={currentWorkout} current={current} />
        </button>
        <span className="sr-only" aria-live="polite">{completed} de {total} series hechas</span>
      </header>
      <main className="workout-main">
        <div className="exercise-head">
          <p className="kicker">{kicker}</p>
          <div className="exercise-title-row">
            <h1 className="exercise-title">{exercise.name}</h1>
            <div className="exercise-actions">
              <button
                className="icon-btn"
                aria-label={`Progreso de ${exercise.name}`}
                onClick={(e) => setProgressSheet({ exercise, opener: e.currentTarget })}
              >
                <Icon name="chart" />
              </button>
              <button
                ref={noteButton}
                className={`icon-btn${sessionNote ? ' on' : ''}`}
                aria-label={sessionNote ? `Editar nota de ${exercise.name}` : `Añadir nota a ${exercise.name}`}
                aria-pressed={!!sessionNote}
                onClick={(e) => setNoteEditor({ exercise, opener: e.currentTarget, fallback: noteButton.current })}
              >
                <Icon name="note" />
              </button>
            </div>
          </div>
          <p className="exercise-target">
            <span className="exercise-target-label">Objetivo</span>
            <span className="exercise-target-value">{exercise.sets} × {exercise.reps}</span>
          </p>
        </div>
        {exercise.notes?.trim() && <p className="exercise-notes">{exercise.notes}</p>}
        {sessionNote && (
          <button
            className="session-note"
            aria-label={`Nota de ${exercise.name}: ${sessionNote}. Editar`}
            onClick={(e) => setNoteEditor({ exercise, opener: e.currentTarget, fallback: noteButton.current })}
          >
            <span className="kicker">Nota de hoy</span>
            {sessionNote}
          </button>
        )}
        {doneSteps.length > 0 && (
          <ol className="done-list">
            {doneSteps.map(step => (
              <li key={`${step.exercise.id}:${step.set}`}>
                <button
                  className="done-row"
                  aria-label={`Corregir serie ${step.set} de ${step.exercise.name}`}
                  onClick={() => setSelected(step)}
                >
                  <span className="done-num">{step.set}</span>
                  {group.superset && <span className="done-name">{step.exercise.name}</span>}
                  <span className="done-value">{formatSet(currentWorkout[step.exercise.id]?.[step.set])}</span>
                  <Icon name="check" size={22} strokeWidth={3} />
                </button>
              </li>
            ))}
          </ol>
        )}
        {current ? (
          <section className={`set-card${currentDone ? ' done' : ''}`} aria-label={`${setTitle}, ${exercise.name}`}>
            <div className="set-card-head">
              <span className="set-card-title">{setTitle}{currentDone && ' · hecha'}</span>
              {lastSet?.done && <span className="set-card-last">Última vez {formatSet(lastSet)}</span>}
            </div>
            <Stepper
              unit={isBW ? null : 'kg'}
              disabled={isBW}
              decreaseLabel="Bajar peso"
              increaseLabel="Subir peso"
              onDecrease={() => onSaveField(exercise.id, current.set, 'weight', stepWeight(set.weight, -1))}
              onIncrease={() => onSaveField(exercise.id, current.set, 'weight', stepWeight(set.weight, 1))}
            >
              <input
                className="stepper-input"
                type="number"
                inputMode="decimal"
                autoComplete="off"
                aria-label={`${exercise.name}, serie ${current.set}, peso en kilos`}
                placeholder={isBW ? 'PC' : '—'}
                value={isBW ? '' : (set.weight || '')}
                disabled={isBW}
                onInput={(e) => onSaveField(exercise.id, current.set, 'weight', e.target.value)}
                onChange={() => {}}
              />
              {exercise.allowBW && (
                <button
                  className={`pc-btn${isBW ? ' on' : ''}`}
                  aria-label={`Serie ${current.set}: usar peso corporal`}
                  aria-pressed={isBW}
                  onClick={() => onTogglePC(exercise.id, current.set)}
                >PC</button>
              )}
            </Stepper>
            <Stepper
              unit="reps"
              decreaseLabel="Una repetición menos"
              increaseLabel="Una repetición más"
              onDecrease={() => onSaveField(exercise.id, current.set, 'reps', stepReps(set.reps, -1))}
              onIncrease={() => onSaveField(exercise.id, current.set, 'reps', stepReps(set.reps, 1))}
            >
              <input
                className="stepper-input"
                type="number"
                inputMode="numeric"
                autoComplete="off"
                aria-label={`${exercise.name}, serie ${current.set}, repeticiones${exercise.reps ? `, objetivo ${exercise.reps}` : ''}`}
                placeholder="—"
                value={set.reps || ''}
                onInput={(e) => onSaveField(exercise.id, current.set, 'reps', e.target.value)}
                onChange={() => {}}
              />
            </Stepper>
            {currentDone && (
              <button className="btn quiet" onClick={() => onToggleDone(exercise.id, current.set, null)}>
                Desmarcar serie
              </button>
            )}
          </section>
        ) : (
          <p className="group-done">
            {completed === total && 'Entreno completo'}
            {completed < total && (group.superset ? 'Superserie completa' : 'Ejercicio completo')}
          </p>
        )}
      </main>
      <footer className="workout-foot">
        <RestTimer
          startedAt={restStartedAt}
          alertSeconds={restStartedAt === null ? idleAlert : restAlert}
          onRestart={restart}
        />
        {current && !currentDone && (
          <button className="btn primary big" onClick={markDone}>
            <Icon name="check" size={26} strokeWidth={3} />
            Serie hecha
          </button>
        )}
        {current && currentDone && (
          <button className="btn primary big" onClick={() => setSelected(null)}>Listo</button>
        )}
        {!current && completed === total && (
          <button className="btn primary big" onClick={() => setFinishing(true)}>Terminar entreno</button>
        )}
        {!current && completed < total && upcomingGroup !== null && (
          <button className="btn primary big" onClick={() => goToGroup(upcomingGroup)}>Siguiente ejercicio</button>
        )}
        {nextInRound && (
          <button className="next-row" onClick={() => setSelected(nextInRound)}>
            <span className="kicker">Después</span>
            <span className="next-row-name">{nextInRound.exercise.name}, sin descanso</span>
            <Icon name="right" size={18} />
          </button>
        )}
        {!nextInRound && current && upcomingGroup !== null && upcomingGroup !== groupIndex && (
          <button className="next-row" onClick={() => goToGroup(upcomingGroup)}>
            <span className="kicker">Después</span>
            <span className="next-row-name">{groups[upcomingGroup].exercises.map(e => e.name).join(' + ')}</span>
            <Icon name="right" size={18} />
          </button>
        )}
      </footer>
      {exitOpener && (
        <ConfirmSheet
          title="¿Salir sin guardar?"
          text={completed > 0
            ? `Se perderá este entreno, con ${plural(completed, 'serie marcada', 'series marcadas')}.`
            : 'Se perderá este entreno.'}
          confirmLabel="Salir sin guardar"
          cancelLabel="Seguir entrenando"
          danger
          opener={exitOpener}
          onConfirm={onExit}
          onCancel={closeExit}
        />
      )}
      {indexOpener && (
        <WorkoutIndex
          groups={groups}
          workout={currentWorkout}
          currentIndex={groupIndex}
          opener={indexOpener}
          onPick={(index) => {
            goToGroup(index);
            closeIndex();
          }}
          onClose={closeIndex}
        />
      )}
      {progressSheet && (
        <ProgressSheet
          exercise={progressSheet.exercise}
          opener={progressSheet.opener}
          color={activeDay.color}
          sessions={sessions}
          planId={planId}
          period={progressPeriod}
          metric={progressMetric}
          onPeriodChange={onProgressPeriodChange}
          onMetricChange={onProgressMetricChange}
          onClose={closeProgress}
        />
      )}
      {noteEditor && (
        <ExerciseNoteEditor
          exercise={noteEditor.exercise}
          opener={noteEditor.opener}
          fallback={noteEditor.fallback}
          value={currentNotes[noteEditor.exercise.id] || ''}
          onSave={onSaveNote}
          onClose={closeNoteEditor}
        />
      )}
    </div>
  );
}
