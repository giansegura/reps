import { useRef } from 'react';
import { Icon } from './Icon.jsx';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function PlanList({ plan, planName, onBack, onRename, onOpenDay, onAdd, onMove, onExportPlan, onImportPlan }) {
  const fileInput = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onImportPlan(file);
  };

  return (
    <>
      <header className="page-top">
        <button className="back-btn" onClick={onBack}>
          <Icon name="back" size={20} />
          Planes
        </button>
      </header>
      <h1 className="sr-only">Editar plan</h1>
      <div className="field">
        <label className="field-label" htmlFor="plan-name">Nombre del plan</label>
        <input
          id="plan-name"
          className="field-input"
          value={planName}
          placeholder="Full Body…"
          onInput={(e) => onRename(e.target.value)}
          onChange={() => {}}
        />
      </div>
      <h2 className="kicker list-title">Días</h2>
      {plan.length === 0 ? (
        <p className="empty-text">No tienes días en tu plan.</p>
      ) : (
        <div className="edit-list">
          {plan.map((day, i) => (
            <div key={day.id} className="edit-row">
              <button className="edit-row-main" onClick={() => onOpenDay(day.id)}>
                <span className="dot big" style={{ background: day.color }} />
                <span className="edit-row-text">
                  <span className="edit-row-title">{day.label || 'Sin nombre'}</span>
                  <span className="edit-row-meta">{plural(day.exercises.length, 'ejercicio', 'ejercicios')}</span>
                </span>
              </button>
              <button
                className="move-btn"
                aria-label={`Subir ${day.label}`}
                disabled={i === 0}
                onClick={() => onMove(day.id, -1)}
              >
                <Icon name="up" />
              </button>
              <button
                className="move-btn"
                aria-label={`Bajar ${day.label}`}
                disabled={i === plan.length - 1}
                onClick={() => onMove(day.id, 1)}
              >
                <Icon name="down" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button className="btn dashed" onClick={onAdd}>
        <Icon name="plus" size={20} />
        Añadir día
      </button>
      <section className="data-section">
        <h2 className="section-title">Editar con IA</h2>
        <p className="data-text">
          Exporta este plan con sus entrenos, pídele a la IA los cambios y que te devuelva el archivo. Al importarlo verás qué cambia antes de aplicarlo. Solo cambia este plan, tus entrenos no se tocan.
        </p>
        <div className="data-actions">
          <button className="btn small" onClick={onExportPlan}>Exportar para IA</button>
          <button className="btn small" onClick={() => fileInput.current.click()}>Importar cambios</button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json,.txt,text/plain"
          hidden
          onChange={handleFile}
        />
      </section>
    </>
  );
}
