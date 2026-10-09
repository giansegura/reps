import { PALETTE } from '../lib/plan.js';

export function PlanDay({ day, onBack, onUpdateDay, onAddExercise, onUpdateExercise, onRemoveExercise, onMoveExercise }) {
  const confirmRemove = (ex) => {
    if (confirm(`¿Borrar "${ex.name || 'este ejercicio'}"?`)) onRemoveExercise(ex.id);
  };

  const onSetsChange = (exId, value) => {
    const n = parseInt(value, 10);
    onUpdateExercise(exId, { sets: Number.isNaN(n) || n < 1 ? 1 : n });
  };

  return (
    <>
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>← Editar plan</button>
        <span className="day-id">
          <span className="dot" style={{ background: day.color }} />
          <span className="page-title">{day.label}</span>
        </span>
      </div>

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
        <span className="field-label">Color</span>
        <div className="color-row">
          {PALETTE.map(c => (
            <button
              key={c}
              className={`color-chip ${day.color === c ? 'active' : ''}`}
              style={{ background: c }}
              aria-label={`Color ${c}`}
              aria-pressed={day.color === c}
              onClick={() => onUpdateDay({ color: c })}
            />
          ))}
        </div>
      </div>

      <div className="exercise-list">
        {day.exercises.map((ex, i) => (
          <div key={ex.id} className="ex-edit-row">
            <div className="ex-edit-grid">
              <input
                className="field-input"
                value={ex.name}
                placeholder="Nombre del ejercicio…"
                onInput={(e) => onUpdateExercise(ex.id, { name: e.target.value })}
                onChange={() => {}}
              />
              <button
                className="icon-btn"
                aria-label="Subir ejercicio"
                disabled={i === 0}
                onClick={() => onMoveExercise(ex.id, -1)}
              >↑</button>
              <button
                className="icon-btn"
                aria-label="Bajar ejercicio"
                disabled={i === day.exercises.length - 1}
                onClick={() => onMoveExercise(ex.id, 1)}
              >↓</button>
              <button className="icon-btn danger" aria-label="Borrar ejercicio" onClick={() => confirmRemove(ex)}>✕</button>
            </div>
            <div className="ex-edit-grid">
              <input
                className="field-input narrow"
                type="number"
                inputMode="numeric"
                min="1"
                value={ex.sets}
                onInput={(e) => onSetsChange(ex.id, e.target.value)}
                onChange={() => {}}
              />
              <input
                className="field-input"
                value={ex.reps}
                placeholder="Reps: 8, 10/pierna, 30-45s…"
                onInput={(e) => onUpdateExercise(ex.id, { reps: e.target.value })}
                onChange={() => {}}
              />
              <button
                className={`bw-toggle ${ex.allowBW ? 'active' : ''}`}
                aria-label="Permitir peso corporal"
                aria-pressed={ex.allowBW}
                onClick={() => onUpdateExercise(ex.id, { allowBW: !ex.allowBW })}
              >PC</button>
            </div>
            <textarea
              className="field-input field-textarea"
              rows={2}
              value={ex.notes ?? ''}
              placeholder="Notas: técnica, agarre, recordatorios…"
              aria-label={`Notas de ${ex.name || 'ejercicio'}`}
              onInput={(e) => onUpdateExercise(ex.id, { notes: e.target.value })}
              onChange={() => {}}
            />
          </div>
        ))}
      </div>

      <button className="add-btn" onClick={onAddExercise}>Añadir ejercicio</button>
    </>
  );
}
