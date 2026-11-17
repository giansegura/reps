import { useCallback, useRef, useState } from 'react';
import { countSessions } from '../lib/session.js';
import { ConfirmSheet } from './ConfirmSheet.jsx';
import { Icon } from './Icon.jsx';
import { Sheet } from './Sheet.jsx';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const planMeta = (plan) => {
  const exercises = plan.days.reduce((sum, day) => sum + day.exercises.length, 0);
  return `${plural(plan.days.length, 'día', 'días')} · ${plural(exercises, 'ejercicio', 'ejercicios')}`;
};

export function Plans({ plans, activePlanId, sessions, onActivate, onEdit, onDuplicate, onRemove, onCreate, onExport, onExportHistory, onImport }) {
  const fileInput = useRef(null);
  const [menu, setMenu] = useState(null);
  const [removing, setRemoving] = useState(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const closeRemoving = useCallback(() => setRemoving(null), []);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onImport(file);
  };

  const removeWarning = (plan) => {
    const count = countSessions(sessions, { planId: plan.id });
    return count > 0
      ? `Tienes ${plural(count, 'entreno guardado', 'entrenos guardados')} de este plan. Se conservarán en este dispositivo pero dejarán de mostrarse.`
      : undefined;
  };

  return (
    <>
      <header className="page-top">
        <h1 className="page-title">Planes</h1>
      </header>
      <div className="plan-cards">
        {plans.map(plan => {
          const active = plan.id === activePlanId;
          return (
            <section key={plan.id} className={`plan-card${active ? ' active' : ''}`} aria-label={plan.name}>
              <div className="plan-card-head">
                <div className="plan-card-text">
                  <h2 className="plan-card-name">{plan.name}</h2>
                  <p className="plan-card-meta">{planMeta(plan)}</p>
                </div>
                {active && <span className="badge">Activo</span>}
              </div>
              <div className="plan-card-actions">
                {!active && (
                  <button className="btn small solid" aria-label={`Activar ${plan.name}`} onClick={() => onActivate(plan.id)}>
                    Activar
                  </button>
                )}
                <button className="btn small" aria-label={`Editar ${plan.name}`} onClick={() => onEdit(plan.id)}>Editar</button>
                {active && (
                  <button className="btn small" aria-label={`Duplicar ${plan.name}`} onClick={() => onDuplicate(plan.id)}>
                    Duplicar
                  </button>
                )}
                <button
                  className="btn small square"
                  aria-label={`Más opciones de ${plan.name}`}
                  onClick={(e) => setMenu({ plan, active, opener: e.currentTarget })}
                >
                  <Icon name="more" />
                </button>
              </div>
            </section>
          );
        })}
        <button className="btn dashed" onClick={onCreate}>
          <Icon name="plus" size={20} />
          Nuevo plan
        </button>
      </div>
      <section className="data-section">
        <h2 className="section-title">Tus datos</h2>
        <p className="data-lead">Se guardan solo en este dispositivo.</p>
        <h3 className="data-subtitle">Copia de seguridad</h3>
        <p className="data-text">Todos tus planes y entrenos en un archivo. Sirve para recuperarlos o pasarlos a otro móvil. Importar una copia reemplaza todo lo que tengas.</p>
        <div className="data-actions">
          <button className="btn small" onClick={onExport}>Exportar copia</button>
          <button className="btn small" onClick={() => fileInput.current.click()}>Importar copia</button>
        </div>
        <h3 className="data-subtitle">Historial para IA</h3>
        <p className="data-text">Un archivo de texto con todos tus entrenos para que una IA analice tu progreso. La IA solo lo lee, la app no puede volver a importarlo.</p>
        <div className="data-actions">
          <button className="btn small" onClick={onExportHistory}>Exportar historial para IA</button>
        </div>
        <p className="data-text data-hint">Para que una IA te cambie un plan, ábrelo y usa «Editar con IA».</p>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={handleFile}
        />
      </section>
      {menu && (
        <Sheet labelledBy="plan-menu-title" opener={menu.opener} onClose={closeMenu}>
          <div className="sheet-head">
            <h2 id="plan-menu-title" className="sheet-title">{menu.plan.name}</h2>
            <button className="round-btn" aria-label="Cerrar" autoFocus onClick={closeMenu}>
              <Icon name="close" size={20} />
            </button>
          </div>
          <div className="sheet-actions stacked">
            {!menu.active && (
              <button
                className="btn"
                onClick={() => {
                  onDuplicate(menu.plan.id);
                  closeMenu();
                }}
              >
                Duplicar plan
              </button>
            )}
            <button
              className="btn danger"
              disabled={plans.length === 1}
              onClick={() => {
                setRemoving({ plan: menu.plan, opener: menu.opener });
                closeMenu();
              }}
            >
              Borrar plan
            </button>
            {plans.length === 1 && <p className="sheet-hint">No puedes borrar tu único plan.</p>}
          </div>
        </Sheet>
      )}
      {removing && (
        <ConfirmSheet
          title={`¿Borrar «${removing.plan.name}»?`}
          text={removeWarning(removing.plan)}
          confirmLabel="Borrar plan"
          danger
          opener={removing.opener}
          onConfirm={() => {
            onRemove(removing.plan.id);
            closeRemoving();
          }}
          onCancel={closeRemoving}
        />
      )}
    </>
  );
}
