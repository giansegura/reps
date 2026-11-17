import { useCallback, useState } from 'react';
import { PALETTE } from '../lib/plan.js';
import { countSessions } from '../lib/session.js';
import { groupExercises } from '../lib/superset.js';
import { ConfirmSheet } from './ConfirmSheet.jsx';
import { Icon } from './Icon.jsx';

const COLOR_NAMES = ['Verde', 'Amarillo', 'Naranja', 'Azul', 'Morado', 'Rosa', 'Turquesa', 'Rojo'];

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function PlanDay({ day, planId, planName, sessions, onBack, onUpdateDay, onAddExercise, onOpenExercise, onMoveExercise, onRemoveDay }) {
  const [removeOpener, setRemoveOpener] = useState(null);
  const closeRemove = useCallback(() => setRemoveOpener(null), []);
  const last = day.exercises.length - 1;

  const removeWarning = () => {
    const count = countSessions(sessions, { planId, dayId: day.id });
    return count > 0
      ? `Tienes ${plural(count, 'entreno guardado', 'entrenos guardados')} de este día. Se conservarán en este dispositivo pero dejarán de mostrarse.`
      : undefined;
  };

  const row = (ex) => {
    const index = day.exercises.findIndex(e => e.id === ex.id);
    const name = ex.name || 'Sin nombre';
    return (
      <div key={ex.id} className="edit-row">
        <button className="edit-row-main" aria-label={`Editar ${name}`} onClick={() => onOpenExercise(ex.id)}>
          <span className="edit-row-num">{index + 1}</span>
          <span className="edit-row-text">
            <span className="edit-row-title">{name}</span>
            <span className="edit-row-meta">{ex.sets} × {ex.reps || '—'}</span>
          </span>
        </button>
        <button
          className="move-btn"
          aria-label={`Subir ${name}`}
          disabled={index === 0}
          onClick={() => onMoveExercise(ex.id, -1)}
        >
          <Icon name="up" />
        </button>
        <button
          className="move-btn"
          aria-label={`Bajar ${name}`}
          disabled={index === last}
          onClick={() => onMoveExercise(ex.id, 1)}
        >
          <Icon name="down" />
        </button>
      </div>
    );
  };

  return (
    <>
      <header className="page-top">
        <button className="back-btn" onClick={onBack}>
          <Icon name="back" size={20} />
          {planName || 'Editar plan'}
        </button>
      </header>
      <h1 className="sr-only">Editar día</h1>
      <div className="field">
        <label className="field-label" htmlFor="day-label">Nombre</label>
        <input
          id="day-label"
          className="field-input"
          value={day.label}
          placeholder="Día 4…"
          onInput={(e) => onUpdateDay({ label: e.target.value })}
          onChange={() => {}}
        />
      </div>
      <div className="field">
        <span id="day-color" className="field-label">Color</span>
        <div className="color-row" role="group" aria-labelledby="day-color">
          {PALETTE.map((c, i) => (
            <button
              key={c}
              className={`color-chip${day.color === c ? ' on' : ''}`}
              aria-label={COLOR_NAMES[i] ?? `Color ${c}`}
              aria-pressed={day.color === c}
              onClick={() => onUpdateDay({ color: c })}
            >
              <span style={{ background: c }} />
            </button>
          ))}
        </div>
      </div>
      <h2 className="kicker list-title">Ejercicios</h2>
      {day.exercises.length === 0 ? (
        <p className="empty-text">Este día aún no tiene ejercicios.</p>
      ) : (
        <div className="edit-list">
          {groupExercises(day.exercises).map(group => (group.superset ? (
            <div key={group.exercises[0].id} className="edit-superset">
              <span className="kicker">Superserie</span>
              {group.exercises.map(row)}
            </div>
          ) : row(group.exercises[0])))}
        </div>
      )}
      <button className="btn dashed" onClick={onAddExercise}>
        <Icon name="plus" size={20} />
        Añadir ejercicio
      </button>
      <button className="btn quiet danger-text" onClick={(e) => setRemoveOpener(e.currentTarget)}>Borrar este día</button>
      {removeOpener && (
        <ConfirmSheet
          title={`¿Borrar «${day.label || 'este día'}»?`}
          text={removeWarning()}
          confirmLabel="Borrar día"
          danger
          opener={removeOpener}
          onConfirm={onRemoveDay}
          onCancel={closeRemove}
        />
      )}
    </>
  );
}
