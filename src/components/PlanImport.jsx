import { useEffect } from 'react';

const yesNo = (value) => (value ? 'sí' : 'no');

const unnamed = (label) => label || 'sin nombre';

const volume = (ex) => `${ex.sets}×${ex.reps}`;

const fieldText = (field, before, exercise) => ({
  name: `antes «${before.name}»`,
  volume: `${volume(before)} → ${volume(exercise)}`,
  allowBW: `peso corporal ${yesNo(before.allowBW)} → ${yesNo(exercise.allowBW)}`,
  notes: 'notas cambiadas',
})[field];

const changeText = ({ exercise, before, fields, movedFrom }) => {
  const parts = fields.map(field => fieldText(field, before, exercise));
  if (movedFrom !== null) parts.push(`movido desde ${movedFrom || '«sin nombre»'}`);
  return `${exercise.name}: ${parts.join(', ')}`;
};

const dayTitle = (day) => {
  if (day.status === 'added') return `Día nuevo: ${unnamed(day.label)}`;
  if (day.status === 'removed') return `Día quitado: ${unnamed(day.label)}`;
  const label = day.label || 'Sin nombre';
  return day.renamedFrom === null ? label : `${label} (antes «${unnamed(day.renamedFrom)}»)`;
};

const dayLines = (day) => [
  ...(day.reordered ? [{ key: 'order', text: 'Orden de ejercicios cambiado' }] : []),
  ...day.added.map(e => ({ key: `added-${e.id}`, text: `+ ${e.name} · ${volume(e)}`, kind: 'added' })),
  ...day.removed.map(e => ({ key: `removed-${e.id}`, text: `− ${e.name} · sus entrenos se conservan`, kind: 'removed' })),
  ...day.changed.map(c => ({ key: `changed-${c.exercise.id}`, text: changeText(c) })),
];

const isVisible = (day, lines) => day.status !== 'kept' || day.renamedFrom !== null || lines.length > 0;

const planLines = (diff) => [
  ...(diff.name ? [`Nombre del plan: «${diff.name.from}» → «${diff.name.to}»`] : []),
  ...(diff.daysReordered ? ['Orden de días cambiado'] : []),
];

const unchangedText = (n) => `${n} ${n === 1 ? 'ejercicio' : 'ejercicios'} sin cambios`;

export const PlanImport = ({ planName, diff, onApply, onCancel }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const general = planLines(diff);
  const days = diff.days
    .map(day => ({ day, lines: dayLines(day) }))
    .filter(({ day, lines }) => isVisible(day, lines));

  return (
    <>
      <div className="page-header">
        <button className="back-btn" onClick={onCancel}>← Volver</button>
        <h1 className="page-title">Revisar cambios</h1>
      </div>
      <p className="import-plan">{planName}</p>
      {general.length > 0 && (
        <ul className="import-lines">
          {general.map(text => <li key={text} className="import-line">{text}</li>)}
        </ul>
      )}
      {days.map(({ day, lines }) => (
        <section key={day.id} className="import-day">
          <h2 className="import-day-title">{dayTitle(day)}</h2>
          {day.status === 'removed' && <p className="import-note">Sus entrenos se conservan pero dejarán de mostrarse</p>}
          {lines.length > 0 && (
            <ul className="import-lines">
              {lines.map(line => (
                <li key={line.key} className={`import-line${line.kind ? ` ${line.kind}` : ''}`}>{line.text}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {diff.unchanged > 0 && <p className="import-note">{unchangedText(diff.unchanged)}</p>}
      {diff.hasChanges ? (
        <div className="modal-actions import-actions">
          <button className="modal-btn" onClick={onCancel}>Cancelar</button>
          <button className="modal-btn primary" onClick={onApply}>Aplicar cambios</button>
        </div>
      ) : (
        <>
          <p className="empty-text">El archivo no trae cambios</p>
          <div className="modal-actions import-actions">
            <button className="modal-btn" onClick={onCancel}>Volver</button>
          </div>
        </>
      )}
    </>
  );
};
