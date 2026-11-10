import { useRef } from 'react';
import { countSessions } from '../lib/session.js';

export function PlanList({ plan, planId, planName, sessions, onBack, onRename, onOpenDay, onAdd, onRemove, onMove, onExportPlan, onImportPlan }) {
  const fileInput = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onImportPlan(file);
  };

  const confirmRemove = (day) => {
    const count = countSessions(sessions, { planId, dayId: day.id });
    const warning = count > 0
      ? `Tienes ${count} ${count === 1 ? 'entreno guardado' : 'entrenos guardados'} de este día. Se conservarán en este dispositivo pero dejarán de mostrarse.`
      : '';
    if (confirm(`¿Borrar "${day.label}"?\n\n${warning}`)) onRemove(day.id);
  };

  return (
    <>
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>← Volver</button>
        <h1 className="page-title">{planName || 'Editar plan'}</h1>
      </div>
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
      {plan.length === 0 ? (
        <p className="empty-text">No tienes días en tu plan.</p>
      ) : (
        <div className="plan-list">
          {plan.map((day, i) => (
            <div key={day.id} className="plan-row">
              <button className="plan-row-main" onClick={() => onOpenDay(day.id)}>
                <span className="day-id">
                  <span className="dot" style={{ background: day.color }} />
                  <span className="plan-row-title">{day.label}</span>
                </span>
                <span className="plan-row-meta">
                  {day.exercises.length} {day.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
                </span>
              </button>
              <div className="plan-row-actions">
                <button
                  className="icon-btn"
                  aria-label={`Subir ${day.label}`}
                  disabled={i === 0}
                  onClick={() => onMove(day.id, -1)}
                >↑</button>
                <button
                  className="icon-btn"
                  aria-label={`Bajar ${day.label}`}
                  disabled={i === plan.length - 1}
                  onClick={() => onMove(day.id, 1)}
                >↓</button>
                <button className="icon-btn danger" aria-label={`Borrar ${day.label}`} onClick={() => confirmRemove(day)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button className="add-btn" onClick={onAdd}>Añadir día</button>
      <section className="data-section">
        <h2 className="data-title">Editar con IA</h2>
        <p className="data-text">
          Exporta este plan con sus entrenos, pídele a la IA los cambios y que te devuelva el archivo. Al importarlo verás qué cambia antes de aplicarlo. Solo cambia este plan, tus entrenos no se tocan.
        </p>
        <div className="data-actions">
          <button className="ghost-btn" onClick={onExportPlan}>Exportar para IA</button>
          <button className="ghost-btn" onClick={() => fileInput.current.click()}>Importar cambios</button>
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
