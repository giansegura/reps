import { useEffect } from 'react';
import { formatRest } from '../lib/format.js';
import { restOf } from '../lib/plan.js';
import { Icon } from './Icon.jsx';

const yesNo = (value) => (value ? 'sí' : 'no');

const unnamed = (label) => label || 'sin nombre';

const volume = (ex) => `${ex.sets}×${ex.reps}`;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

const supersetText = (names = []) =>
  (names.length > 0 ? `en superserie con ${names.join(' y ')}` : 'ya no va en superserie');

const fieldText = (field, { before, exercise, supersetWith }) => ({
  name: `antes «${before.name}»`,
  volume: `${volume(before)} → ${volume(exercise)}`,
  allowBW: `peso corporal ${yesNo(before.allowBW)} → ${yesNo(exercise.allowBW)}`,
  rest: `descanso ${formatRest(restOf(before))} → ${formatRest(restOf(exercise))}`,
  superset: supersetText(supersetWith),
  notes: 'notas cambiadas',
})[field];

const changeText = (change) => {
  const parts = change.fields.map(field => fieldText(field, change));
  if (change.movedFrom !== null) parts.push(`movido desde ${change.movedFrom || '«sin nombre»'}`);
  return capitalize(parts.join(' · '));
};

const dayStatus = (day) => {
  if (day.status === 'added') return { text: 'Día nuevo', kind: 'added' };
  if (day.status === 'removed') return { text: 'Día quitado', kind: 'removed' };
  if (day.renamedFrom !== null) return { text: `Antes «${unnamed(day.renamedFrom)}»`, kind: null };
  return null;
};

const dayItems = (day) => [
  ...day.added.map(e => ({ key: `added-${e.id}`, name: e.name, text: `Ejercicio nuevo · ${volume(e)}`, kind: 'added' })),
  ...day.removed.map(e => ({ key: `removed-${e.id}`, name: e.name, text: 'Se quita · sus entrenos se conservan', kind: 'removed' })),
  ...day.changed.map(c => ({ key: `changed-${c.exercise.id}`, name: c.exercise.name, text: changeText(c), kind: null })),
];

const isVisible = (day, items) => day.status !== 'kept' || day.renamedFrom !== null || day.reordered || items.length > 0;

const planLines = (diff) => [
  ...(diff.name ? [`Nombre del plan: «${diff.name.from}» → «${diff.name.to}»`] : []),
  ...(diff.daysReordered ? ['Orden de días cambiado'] : []),
];

const count = (diff, pick) => diff.days.reduce((sum, day) => sum + pick(day), 0);

const summary = (diff) => [
  [count(diff, d => (d.status === 'added' ? 1 : 0)), 'día nuevo', 'días nuevos'],
  [count(diff, d => (d.status === 'removed' ? 1 : 0)), 'día quitado', 'días quitados'],
  [count(diff, d => d.added.length), 'ejercicio nuevo', 'ejercicios nuevos'],
  [count(diff, d => d.removed.length), 'ejercicio quitado', 'ejercicios quitados'],
  [count(diff, d => d.changed.length), 'con cambios', 'con cambios'],
].filter(([n]) => n > 0).map(([n, one, many]) => plural(n, one, many)).join(' · ');

const unchangedText = (n) => `${plural(n, 'ejercicio', 'ejercicios')} sin cambios`;

export const PlanImport = ({ planName, diff, onApply, onCancel }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const general = planLines(diff);
  const overview = summary(diff);
  const days = diff.days
    .map(day => ({ day, items: dayItems(day) }))
    .filter(({ day, items }) => isVisible(day, items));

  return (
    <div className="import">
      <header className="page-top">
        <button className="back-btn" onClick={onCancel}>
          <Icon name="back" size={20} />
          Volver
        </button>
      </header>
      <h1 className="page-title">Revisar cambios</h1>
      <p className="import-plan">{planName}</p>
      {overview && <p className="import-summary">{overview}</p>}
      {general.length > 0 && (
        <ul className="import-general">
          {general.map(text => <li key={text}>{text}</li>)}
        </ul>
      )}
      {days.map(({ day, items }) => {
        const status = dayStatus(day);
        return (
          <section key={day.id} className="import-day">
            <h2 className="import-day-title">{day.label || 'Sin nombre'}</h2>
            {status && <p className={`import-day-status${status.kind ? ` ${status.kind}` : ''}`}>{status.text}</p>}
            {day.status === 'removed' && <p className="import-note">Sus entrenos se conservan pero dejarán de mostrarse</p>}
            {day.reordered && <p className="import-note">Orden de ejercicios cambiado</p>}
            {items.length > 0 && (
              <ul className="import-items">
                {items.map(item => (
                  <li key={item.key} className={`import-item${item.kind ? ` ${item.kind}` : ''}`}>
                    {item.kind === 'added' && <Icon name="plus" size={20} strokeWidth={3} />}
                    {item.kind === 'removed' && <Icon name="minus" size={20} strokeWidth={3} />}
                    <span className="import-item-text">
                      <span className="import-item-name">{item.name}</span>
                      <span className="import-item-change">{item.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      {diff.unchanged > 0 && <p className="import-note end">{unchangedText(diff.unchanged)}</p>}
      {!diff.hasChanges && <p className="empty-text">El archivo no trae cambios</p>}
      <footer className="import-foot">
        {diff.hasChanges ? (
          <>
            <button className="btn" onClick={onCancel}>Cancelar</button>
            <button className="btn primary grow" onClick={onApply}>Aplicar cambios</button>
          </>
        ) : (
          <button className="btn" onClick={onCancel}>Entendido</button>
        )}
      </footer>
    </div>
  );
};
