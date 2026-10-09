import { useCallback, useEffect, useRef, useState } from 'react';
import { formatWeight } from '../lib/format.js';
import { ExerciseNotes } from './ExerciseNotes.jsx';
import { ExerciseNoteEditor } from './ExerciseNoteEditor.jsx';

const REST_ALERT_SECONDS = 120;

const pad = (n) => String(n).padStart(2, '0');

const formatElapsed = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
};

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

const WorkoutTimer = () => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  return <span className="workout-timer">{formatElapsed(elapsed)}</span>;
};

const RestTimer = () => {
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const alertedRef = useRef(false);

  const restart = useCallback(() => {
    primeAudio();
    alertedRef.current = false;
    setElapsed(0);
    setStartedAt(Date.now());
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code !== 'Space' || e.repeat) return;
      e.preventDefault();
      restart();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [restart]);

  useEffect(() => {
    if (startedAt === null) return undefined;
    const id = setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(seconds);
      if (seconds >= REST_ALERT_SECONDS && !alertedRef.current) {
        alertedRef.current = true;
        playAlert();
      }
    }, 250);
    return () => clearInterval(id);
  }, [startedAt]);

  if (startedAt === null) return null;

  return (
    <button
      className={`rest-timer ${elapsed >= REST_ALERT_SECONDS ? 'over' : ''}`}
      aria-label={`Descanso: ${formatElapsed(elapsed)}. Reiniciar`}
      onClick={restart}
    >
      {formatElapsed(elapsed)}
    </button>
  );
};

const hasNotes = (ex) => !!ex.notes?.trim();

const countDone = (exData) => Object.values(exData).filter(s => s.done).length;

const totalVolume = (exData) => Object.values(exData).reduce((sum, s) => {
  const weight = parseFloat(s.weight);
  const reps = parseInt(s.reps, 10);
  return Number.isNaN(weight) || Number.isNaN(reps) ? sum : sum + weight * reps;
}, 0);

export function Workout({
  activeDay,
  currentWorkout,
  currentNotes,
  onSaveField,
  onSaveNote,
  onTogglePC,
  onToggleDone,
  onFinish,
  onExit,
}) {
  const [notesExercise, setNotesExercise] = useState(null);
  const [editingNoteExercise, setEditingNoteExercise] = useState(null);
  const closeNotes = useCallback(() => setNotesExercise(null), []);
  const closeNoteEditor = useCallback(() => setEditingNoteExercise(null), []);
  const total = activeDay.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const completed = activeDay.exercises.reduce(
    (sum, ex) => sum + countDone(currentWorkout[ex.id] || {}),
    0,
  );

  return (
    <>
      <div className="workout-header">
        <div className="workout-header-side">
          <button className="back-btn" onClick={onExit}>← Salir</button>
          <button
            className="save-btn"
            aria-label={`Guardar entreno, ${completed} de ${total} series`}
            disabled={completed === 0}
            onClick={onFinish}
          >
            <span className="save-btn-icon" aria-hidden="true">✓</span>
            <span className="save-btn-label">Guardar</span>
            <span className="save-btn-count">{completed}/{total}</span>
          </button>
        </div>
        <div className="timer-slot">
          <WorkoutTimer />
          <RestTimer />
        </div>
        <div className="workout-header-side end">
          <span className="day-id">
            <span className="dot" style={{ background: activeDay.color }} />
            <span className="day-label">{activeDay.label}</span>
          </span>
        </div>
      </div>
      <div className="progress-container">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%`, background: activeDay.color }}
          />
        </div>
        <span className="progress-text" aria-live="polite">{completed}/{total}</span>
      </div>
      <div className="workout-exercises">
        {activeDay.exercises.map((ex, i) => {
          const volume = totalVolume(currentWorkout[ex.id] || {});
          const sessionNote = currentNotes[ex.id] || '';
          return (
            <section key={ex.id} className="exercise-block" aria-label={ex.name}>
              <div className="ex-block-header">
                <span className="ex-block-name">
                  <span className="ex-num">{i + 1}</span>{ex.name}
                  {hasNotes(ex) && (
                    <button
                      className="info-btn"
                      aria-label={`Notas de ${ex.name}`}
                      onClick={() => setNotesExercise(ex)}
                    >
                      <span aria-hidden="true">i</span>
                    </button>
                  )}
                </span>
                <span className="ex-block-actions">
                  {volume > 0 && <span className="ex-block-meta">{formatWeight(volume)}</span>}
                  <button
                    className={`note-btn ${sessionNote ? 'active' : ''}`}
                    aria-label={sessionNote ? `Editar nota de ${ex.name}` : `Añadir nota a ${ex.name}`}
                    aria-pressed={!!sessionNote}
                    onClick={() => setEditingNoteExercise(ex)}
                  >
                    <span aria-hidden="true">✎</span>
                  </button>
                </span>
              </div>
              {sessionNote && (
                <button
                  className="ex-note-preview"
                  aria-label={`Nota de ${ex.name}: ${sessionNote}. Editar`}
                  onClick={() => setEditingNoteExercise(ex)}
                >
                  {sessionNote}
                </button>
              )}
              <div className="sets-grid">
                <div className="set-header-row" aria-hidden="true">
                  <span className="set-label narrow" />
                  <span className="set-label">Peso</span>
                  <span className="set-label">
                    <span className="set-label-text">
                      Reps{ex.reps && <span className="set-target"> · {ex.reps}</span>}
                    </span>
                  </span>
                  <span className="set-label check" />
                </div>
                {Array.from({ length: ex.sets }, (_, k) => k + 1).map(n => {
                  const set = currentWorkout[ex.id]?.[n] || {};
                  const isBW = set.weight === 'PC';
                  return (
                    <div key={n} className={`set-row ${set.done ? 'done' : ''}`}>
                      <span className="set-num">{n}</span>
                      <div className="set-weight">
                        <input
                          className="set-input"
                          type="number"
                          inputMode="decimal"
                          autoComplete="off"
                          aria-label={`${ex.name}, serie ${n}, peso en kilos`}
                          placeholder="—"
                          value={isBW ? '' : (set.weight || '')}
                          disabled={isBW}
                          onInput={(e) => onSaveField(ex.id, n, 'weight', e.target.value)}
                          onChange={() => {}}
                        />
                        {ex.allowBW && (
                          <button
                            tabIndex={-1}
                            className={`bw-btn ${isBW ? 'active' : ''}`}
                            aria-label={`Serie ${n}: usar peso corporal`}
                            aria-pressed={isBW}
                            onClick={() => onTogglePC(ex.id, n)}
                          >PC</button>
                        )}
                      </div>
                      <div className="set-reps">
                        <input
                          className="set-input"
                          type="number"
                          inputMode="numeric"
                          autoComplete="off"
                          aria-label={`${ex.name}, serie ${n}, repeticiones${ex.reps ? `, objetivo ${ex.reps}` : ''}`}
                          placeholder={ex.reps}
                          value={set.reps || ''}
                          onInput={(e) => onSaveField(ex.id, n, 'reps', e.target.value)}
                          onChange={() => {}}
                        />
                      </div>
                      <button
                        tabIndex={-1}
                        className={`check-btn ${set.done ? 'done' : ''}`}
                        aria-label={`Marcar serie ${n} de ${ex.name}`}
                        aria-pressed={!!set.done}
                        onClick={() => onToggleDone(ex.id, n)}
                      >
                        <span aria-hidden="true">✓</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      {notesExercise && <ExerciseNotes exercise={notesExercise} onClose={closeNotes} />}
      {editingNoteExercise && (
        <ExerciseNoteEditor
          exercise={editingNoteExercise}
          value={currentNotes[editingNoteExercise.id] || ''}
          onSave={onSaveNote}
          onClose={closeNoteEditor}
        />
      )}
    </>
  );
}
