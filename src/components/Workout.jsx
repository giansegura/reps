import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { restOf } from '../lib/plan.js';
import { groupExercises, restAfterStep } from '../lib/superset.js';
import { countDone, formatElapsed, isDone, nextGroupIndex, pendingStep, positionText } from '../lib/workout.js';
import { ConfirmSheet } from './ConfirmSheet.jsx';
import { ExerciseMore } from './ExerciseMore.jsx';
import { ExerciseNoteEditor } from './ExerciseNoteEditor.jsx';
import { Icon } from './Icon.jsx';
import { ProgressSheet } from './ProgressSheet.jsx';
import { SetTable } from './SetTable.jsx';
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
      <span role="timer" aria-label="Descanso" className="rest-time">{formatElapsed(elapsed)}</span>
      <button className="rest-restart" aria-label="Reiniciar descanso" onClick={onRestart}>
        <Icon name="restart" size={20} />
      </button>
      <span className="sr-only" role="status">{over ? 'Descanso cumplido' : ''}</span>
    </div>
  );
};

const WorkoutTimer = ({ startedAt }) => {
  const elapsed = useSecondsSince(startedAt, 1000);

  return (
    <span className="workout-total">
      <span className="workout-total-rest">Descanso · </span>
      total <span role="timer" aria-label="Tiempo total" className="workout-timer">{formatElapsed(elapsed)}</span>
    </span>
  );
};

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
  const [finishing, setFinishing] = useState(false);
  const [sheet, setSheet] = useState(null);
  const closeSheet = useCallback(() => setSheet(null), []);
  const activeRow = useRef(null);
  const shownGroup = useRef(groupIndex);

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
  const pending = pendingStep(group, currentWorkout);
  const pendingKey = pending ? `${pending.exercise.id}:${pending.set}` : null;
  const idleAlert = restOf(pending?.exercise ?? group.exercises[0]);
  const restart = useCallback(() => onRestartRest(idleAlert), [onRestartRest, idleAlert]);

  useEffect(() => {
    if (shownGroup.current !== groupIndex) {
      shownGroup.current = groupIndex;
      window.scrollTo(0, 0);
      return;
    }
    activeRow.current?.scrollIntoView?.({ block: 'nearest' });
  }, [groupIndex, pendingKey]);

  const toggleDone = (exercise, set) => {
    const step = { exercise, set };
    if (isDone(currentWorkout, step)) {
      onToggleDone(exercise.id, set, null);
      return;
    }
    const after = {
      ...currentWorkout,
      [exercise.id]: { ...currentWorkout[exercise.id], [set]: { ...currentWorkout[exercise.id]?.[set], done: true } },
    };
    onToggleDone(exercise.id, set, restAfterStep(group, step, after));
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

  const rounds = Math.max(...group.exercises.map(e => e.sets));
  const position = positionText(groups, groupIndex);

  return (
    <div className="workout" style={{ '--accent': activeDay.color }}>
      <header className="workout-top">
        <button
          className="round-btn"
          aria-label="Salir sin guardar"
          onClick={(e) => setSheet({ type: 'exit', opener: e.currentTarget })}
        >
          <Icon name="close" />
        </button>
        <div className="workout-clock">
          <RestTimer startedAt={restStartedAt} alertSeconds={restAlert} onRestart={restart} />
          <WorkoutTimer startedAt={startedAt} />
        </div>
        <button className="pill-btn" onClick={() => setFinishing(true)}>Terminar</button>
      </header>
      <main className={`workout-main${group.superset ? ' superset' : ''}`}>
        {group.superset && (
          <h1 className="kicker">
            {pending ? `Superserie · ronda ${pending.set} de ${rounds}` : 'Superserie · completa'}
          </h1>
        )}
        {group.exercises.map(exercise => (
          <SetTable
            key={exercise.id}
            exercise={exercise}
            sets={currentWorkout[exercise.id]}
            activeSet={pending?.exercise.id === exercise.id ? pending.set : null}
            activeRow={activeRow}
            level={group.superset ? 2 : 1}
            noted={!!currentNotes[exercise.id]}
            onSaveField={onSaveField}
            onTogglePC={onTogglePC}
            onToggleDone={toggleDone}
            onMore={(e) => setSheet({ type: 'more', exercise, opener: e.currentTarget })}
          />
        ))}
        <span className="sr-only" aria-live="polite">{completed} de {total} series hechas</span>
      </main>
      <footer className="workout-foot">
        {completed === total && (
          <button className="btn primary big" onClick={() => setFinishing(true)}>Terminar entreno</button>
        )}
        <nav className="workout-nav" aria-label="Ejercicios">
          <button
            className="nav-btn"
            aria-label="Ejercicio anterior"
            disabled={groupIndex === 0}
            onClick={() => setGroupIndex(groupIndex - 1)}
          >
            <Icon name="left" size={24} strokeWidth={2.6} />
          </button>
          <button
            className="nav-position"
            aria-label={`Ejercicio ${position}. Ver todos los ejercicios`}
            onClick={(e) => setSheet({ type: 'index', opener: e.currentTarget })}
          >
            {position}
          </button>
          <button
            className="nav-btn"
            aria-label="Ejercicio siguiente"
            disabled={groupIndex === groups.length - 1}
            onClick={() => setGroupIndex(groupIndex + 1)}
          >
            <Icon name="right" size={24} strokeWidth={2.6} />
          </button>
        </nav>
      </footer>
      {sheet?.type === 'exit' && (
        <ConfirmSheet
          title="¿Salir sin guardar?"
          text={completed > 0
            ? `Se perderá este entreno, con ${plural(completed, 'serie marcada', 'series marcadas')}.`
            : 'Se perderá este entreno.'}
          confirmLabel="Salir sin guardar"
          cancelLabel="Seguir entrenando"
          danger
          opener={sheet.opener}
          onConfirm={onExit}
          onCancel={closeSheet}
        />
      )}
      {sheet?.type === 'index' && (
        <WorkoutIndex
          groups={groups}
          workout={currentWorkout}
          currentIndex={groupIndex}
          opener={sheet.opener}
          onPick={(index) => {
            setGroupIndex(index);
            closeSheet();
          }}
          onClose={closeSheet}
        />
      )}
      {sheet?.type === 'more' && (
        <ExerciseMore
          exercise={sheet.exercise}
          note={currentNotes[sheet.exercise.id] || ''}
          opener={sheet.opener}
          onEditNote={() => setSheet({ ...sheet, type: 'note' })}
          onShowProgress={() => setSheet({ ...sheet, type: 'progress' })}
          onClose={closeSheet}
        />
      )}
      {sheet?.type === 'progress' && (
        <ProgressSheet
          exercise={sheet.exercise}
          opener={sheet.opener}
          color={activeDay.color}
          sessions={sessions}
          planId={planId}
          period={progressPeriod}
          metric={progressMetric}
          onPeriodChange={onProgressPeriodChange}
          onMetricChange={onProgressMetricChange}
          onClose={closeSheet}
        />
      )}
      {sheet?.type === 'note' && (
        <ExerciseNoteEditor
          exercise={sheet.exercise}
          opener={sheet.opener}
          value={currentNotes[sheet.exercise.id] || ''}
          onSave={onSaveNote}
          onClose={closeSheet}
        />
      )}
    </div>
  );
}
