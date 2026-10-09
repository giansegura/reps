export function PlanList({ plan, planName, sessions, onBack, onRename, onOpenDay, onAdd, onRemove, onMove }) {
  const confirmRemove = (day) => {
    const warning = sessions.some(s => s.dayId === day.id)
      ? 'Tienes un entreno guardado de este día. Se conservará en el archivo pero dejará de mostrarse.'
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
    </>
  );
}
