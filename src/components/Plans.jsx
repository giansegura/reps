import { useRef } from 'react';

export function Plans({ plans, activePlanId, sessions, onBack, onActivate, onEdit, onDuplicate, onRemove, onCreate, onExport, onImport }) {
  const fileInput = useRef(null);

  const confirmRemove = (plan) => {
    const count = sessions.filter(s => s.planId === plan.id).length;
    const warning = count > 0
      ? `Tienes entrenos guardados de ${count} ${count === 1 ? 'día' : 'días'} de este plan. Se conservarán en este dispositivo pero dejarán de mostrarse.`
      : '';
    if (confirm(`¿Borrar "${plan.name}"?\n\n${warning}`)) onRemove(plan.id);
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onImport(file);
  };

  return (
    <>
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>← Volver</button>
        <h1 className="page-title">Planes</h1>
      </div>
      <div className="plan-list">
        {plans.map(plan => {
          const active = plan.id === activePlanId;
          return (
            <div key={plan.id} className={`plan-row ${active ? 'active' : ''}`}>
              <button className="plan-row-main" onClick={() => onActivate(plan.id)}>
                <span className="plan-row-title">{plan.name}</span>
                <span className="plan-row-meta">
                  {plan.days.length} {plan.days.length === 1 ? 'día' : 'días'}
                  {active && <span className="active-badge">Activo</span>}
                </span>
              </button>
              <div className="plan-row-actions">
                <button className="icon-btn" aria-label="Editar plan" onClick={() => onEdit(plan.id)}>✎</button>
                <button className="icon-btn" aria-label="Duplicar plan" onClick={() => onDuplicate(plan.id)}>⧉</button>
                <button
                  className="icon-btn danger"
                  aria-label="Borrar plan"
                  disabled={plans.length === 1}
                  onClick={() => confirmRemove(plan)}
                >✕</button>
              </div>
            </div>
          );
        })}
      </div>
      <button className="add-btn" onClick={onCreate}>Nuevo plan</button>
      <section className="data-section">
        <h2 className="data-title">Tus datos</h2>
        <p className="data-text">Se guardan solo en este dispositivo.</p>
        <div className="data-actions">
          <button className="ghost-btn" onClick={onExport}>Exportar copia</button>
          <button className="ghost-btn" onClick={() => fileInput.current.click()}>Importar copia</button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={handleFile}
        />
      </section>
    </>
  );
}
