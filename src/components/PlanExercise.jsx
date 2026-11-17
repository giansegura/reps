import { useCallback, useState } from 'react';
import { formatRest } from '../lib/format.js';
import { MAX_REST, MAX_SETS, MIN_REST, parseSets, restOf, stepRest } from '../lib/plan.js';
import { supersetPartners } from '../lib/superset.js';
import { ConfirmSheet } from './ConfirmSheet.jsx';
import { Icon } from './Icon.jsx';

const SetsInput = ({ id, exercise, onChange }) => {
  const [draft, setDraft] = useState(null);

  const onInput = (value) => {
    setDraft(value);
    const sets = parseSets(value);
    if (sets !== null && sets !== exercise.sets) onChange(sets);
  };

  return (
    <input
      id={id}
      className="mini-stepper-input"
      type="number"
      inputMode="numeric"
      min="1"
      max={MAX_SETS}
      aria-label={`Series de ${exercise.name || 'ejercicio'}`}
      value={draft ?? exercise.sets}
      onInput={(e) => onInput(e.target.value)}
      onChange={() => {}}
      onBlur={() => setDraft(null)}
    />
  );
};

export function PlanExercise({ day, exercise, onBack, onUpdate, onLink, onRemove }) {
  const [removeOpener, setRemoveOpener] = useState(null);
  const closeRemove = useCallback(() => setRemoveOpener(null), []);
  const name = exercise.name || 'ejercicio';
  const rest = restOf(exercise);
  const others = day.exercises.filter(e => e.id !== exercise.id);
  const partner = supersetPartners(day.exercises, exercise.id)[0];

  return (
    <>
      <header className="page-top">
        <button className="back-btn" onClick={onBack}>
          <Icon name="back" size={20} />
          {day.label || 'Editar día'}
        </button>
      </header>
      <h1 className="sr-only">Editar ejercicio</h1>
      <div className="field">
        <label className="field-label" htmlFor="ex-name">Nombre</label>
        <input
          id="ex-name"
          className="field-input"
          value={exercise.name}
          placeholder="Nombre del ejercicio…"
          autoFocus={!exercise.name}
          onInput={(e) => onUpdate({ name: e.target.value })}
          onChange={() => {}}
        />
      </div>
      <div className="field-pair">
        <div className="field">
          <label className="field-label" htmlFor="ex-sets">Series</label>
          <div className="mini-stepper">
            <button
              className="mini-stepper-btn"
              aria-label="Una serie menos"
              disabled={exercise.sets <= 1}
              onClick={() => onUpdate({ sets: exercise.sets - 1 })}
            >
              <Icon name="minus" size={20} strokeWidth={3} />
            </button>
            <SetsInput id="ex-sets" exercise={exercise} onChange={(sets) => onUpdate({ sets })} />
            <button
              className="mini-stepper-btn"
              aria-label="Una serie más"
              disabled={exercise.sets >= MAX_SETS}
              onClick={() => onUpdate({ sets: exercise.sets + 1 })}
            >
              <Icon name="plus" size={20} strokeWidth={3} />
            </button>
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="ex-reps">Reps</label>
          <input
            id="ex-reps"
            className="field-input"
            value={exercise.reps}
            placeholder="8, 10/pierna, 30-45s…"
            aria-label={`Reps de ${name}`}
            onInput={(e) => onUpdate({ reps: e.target.value })}
            onChange={() => {}}
          />
        </div>
      </div>
      <div className="switch-row">
        <span id="ex-bw">Se puede hacer con peso corporal</span>
        <button
          className={`switch${exercise.allowBW ? ' on' : ''}`}
          role="switch"
          aria-checked={!!exercise.allowBW}
          aria-labelledby="ex-bw"
          onClick={() => onUpdate({ allowBW: !exercise.allowBW })}
        >
          <span className="switch-knob" />
        </button>
      </div>
      <div className="field">
        <span id="ex-rest" className="field-label">Aviso de descanso</span>
        <div className="mini-stepper wide" role="group" aria-labelledby="ex-rest">
          <button
            className="mini-stepper-btn"
            aria-label="Menos descanso"
            disabled={rest <= MIN_REST}
            onClick={() => onUpdate({ rest: stepRest(rest, -1) })}
          >
            <Icon name="minus" size={20} strokeWidth={3} />
          </button>
          <output className="mini-stepper-value" aria-live="polite">{formatRest(rest)}</output>
          <button
            className="mini-stepper-btn"
            aria-label="Más descanso"
            disabled={rest >= MAX_REST}
            onClick={() => onUpdate({ rest: stepRest(rest, 1) })}
          >
            <Icon name="plus" size={20} strokeWidth={3} />
          </button>
        </div>
        <p className="field-hint">La app avisa cuando pasa este tiempo desde la última serie.</p>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="ex-superset">Superserie con</label>
        <div className="select-wrap">
          <select
            id="ex-superset"
            className="select"
            value={partner?.id ?? ''}
            disabled={others.length === 0}
            onChange={(e) => onLink(e.target.value || null)}
          >
            <option value="">Ninguno</option>
            {others.map(other => (
              <option key={other.id} value={other.id}>{other.name || 'Sin nombre'}</option>
            ))}
          </select>
          <Icon name="down" size={18} />
        </div>
        <p className="field-hint">Haces una serie de cada uno y descansas al acabar la ronda.</p>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="ex-notes">Notas</label>
        <textarea
          id="ex-notes"
          className="field-input field-textarea"
          rows={4}
          value={exercise.notes ?? ''}
          placeholder="Técnica, agarre, recordatorios…"
          onInput={(e) => onUpdate({ notes: e.target.value })}
          onChange={() => {}}
        />
      </div>
      <button className="btn quiet danger-text" onClick={(e) => setRemoveOpener(e.currentTarget)}>Borrar ejercicio</button>
      {removeOpener && (
        <ConfirmSheet
          title={`¿Borrar «${exercise.name || 'este ejercicio'}»?`}
          text="Sus entrenos guardados se conservan."
          confirmLabel="Borrar ejercicio"
          danger
          opener={removeOpener}
          onConfirm={onRemove}
          onCancel={closeRemove}
        />
      )}
    </>
  );
}
