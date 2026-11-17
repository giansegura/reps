import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PlanImport } from './PlanImport.jsx';

const ex = (id, name, sets = 3, reps = '8', extra = {}) => ({ id, name, sets, reps, allowBW: false, notes: '', ...extra });

const entry = (id, label, patch = {}) => ({
  id, label, status: 'kept', renamedFrom: null, reordered: false, added: [], removed: [], changed: [], ...patch,
});

const baseDiff = (patch = {}) => ({ hasChanges: true, name: null, daysReordered: false, unchanged: 0, days: [], ...patch });

const renderImport = (diff, handlers = {}) => render(
  <PlanImport planName="Full Body" diff={diff} onApply={handlers.onApply ?? vi.fn()} onCancel={handlers.onCancel ?? vi.fn()} />,
);

const item = (name) => screen.getByText(name, { selector: '.import-item-name' }).nextElementSibling.textContent;

const dayOf = (label) => screen.getByRole('heading', { level: 2, name: label }).closest('section');

describe('PlanImport', () => {
  it('muestra el título y el plan', () => {
    renderImport(baseDiff());
    expect(screen.getByRole('heading', { level: 1, name: 'Revisar cambios' })).toBeTruthy();
    expect(screen.getByText('Full Body')).toBeTruthy();
  });

  it('muestra añadidos, quitados y cambiados', () => {
    renderImport(baseDiff({
      days: [entry('d1', 'Torso', {
        added: [ex('e9', 'Remo', 3, '10')],
        removed: [ex('e2', 'Press banca')],
        changed: [{ exercise: ex('e1', 'Sentadilla', 4, '6'), before: ex('e1', 'Squat'), fields: ['name', 'volume'], movedFrom: null }],
      })],
    }));
    expect(screen.getByRole('heading', { level: 2, name: 'Torso' })).toBeTruthy();
    expect(item('Remo')).toBe('Ejercicio nuevo · 3×10');
    expect(item('Press banca')).toBe('Se quita · sus entrenos se conservan');
    expect(item('Sentadilla')).toBe('Antes «Squat» · 3×8 → 4×6');
    expect(screen.getByText('1 ejercicio nuevo · 1 ejercicio quitado · 1 con cambios')).toBeTruthy();
  });

  it('muestra días nuevos, quitados y renombrados', () => {
    renderImport(baseDiff({
      days: [
        entry('d1', 'Torso', { renamedFrom: 'Tren superior' }),
        entry('d5', 'Pierna B', { status: 'added', added: [ex('e5', 'Prensa')] }),
        entry('d2', 'Pierna', { status: 'removed', removed: [ex('e3', 'Zancadas')] }),
      ],
    }));
    expect(dayOf('Torso').textContent).toContain('Antes «Tren superior»');
    expect(dayOf('Pierna B').textContent).toContain('Día nuevo');
    expect(dayOf('Pierna').textContent).toContain('Día quitado');
    expect(screen.getByText('Sus entrenos se conservan pero dejarán de mostrarse')).toBeTruthy();
    expect(item('Zancadas')).toBe('Se quita · sus entrenos se conservan');
    expect(screen.getByText('1 día nuevo · 1 día quitado · 1 ejercicio nuevo · 1 ejercicio quitado')).toBeTruthy();
  });

  it('movido, peso corporal y notas', () => {
    renderImport(baseDiff({
      days: [entry('d2', 'Pierna', {
        changed: [{
          exercise: ex('e1', 'Dominadas', 3, '8', { allowBW: true, notes: 'Lento' }),
          before: ex('e1', 'Dominadas'),
          fields: ['allowBW', 'notes'],
          movedFrom: 'Torso',
        }],
      })],
    }));
    expect(item('Dominadas')).toBe('Peso corporal no → sí · notas cambiadas · movido desde Torso');
  });

  it('descanso y superserie', () => {
    renderImport(baseDiff({
      days: [entry('d1', 'Torso', {
        changed: [
          { exercise: ex('e1', 'Curl', 3, '8', { rest: 60 }), before: ex('e1', 'Curl'), fields: ['rest', 'superset'], movedFrom: null, supersetWith: ['Tríceps'] },
          { exercise: ex('e2', 'Remo'), before: ex('e2', 'Remo', 3, '8', { rest: 90 }), fields: ['rest', 'superset'], movedFrom: null, supersetWith: [] },
        ],
      })],
    }));
    expect(item('Curl')).toBe('Descanso 2:00 → 1:00 · en superserie con Tríceps');
    expect(item('Remo')).toBe('Descanso 1:30 → 2:00 · ya no va en superserie');
  });

  it('nombra los días sin nombre', () => {
    renderImport(baseDiff({
      days: [
        entry('d1', 'Torso', { renamedFrom: '' }),
        entry('d2', 'Pierna', { changed: [{ exercise: ex('e1', 'Remo'), before: ex('e1', 'Remo'), fields: [], movedFrom: '' }] }),
      ],
    }));
    expect(dayOf('Torso').textContent).toContain('Antes «sin nombre»');
    expect(item('Remo')).toBe('Movido desde «sin nombre»');
  });

  it('abre arriba del todo', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    renderImport(baseDiff());
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    scrollTo.mockRestore();
  });

  it('cambios de nombre y de orden', () => {
    renderImport(baseDiff({
      name: { from: 'Full Body', to: 'Torso / Pierna' },
      daysReordered: true,
      days: [entry('d1', 'Torso', { reordered: true })],
    }));
    expect(screen.getByText('Nombre del plan: «Full Body» → «Torso / Pierna»')).toBeTruthy();
    expect(screen.getByText('Orden de días cambiado')).toBeTruthy();
    expect(screen.getByText('Orden de ejercicios cambiado')).toBeTruthy();
  });

  it('no pinta días sin nada que mostrar', () => {
    renderImport(baseDiff({ days: [entry('d1', 'Torso'), entry('d2', 'Pierna', { added: [ex('e5', 'Prensa')] })] }));
    expect(screen.queryByRole('heading', { level: 2, name: 'Torso' })).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Pierna' })).toBeTruthy();
  });

  it('cuenta los que no cambian', () => {
    const { unmount } = renderImport(baseDiff({ unchanged: 5 }));
    expect(screen.getByText('5 ejercicios sin cambios')).toBeTruthy();
    unmount();
    renderImport(baseDiff({ unchanged: 1 }));
    expect(screen.getByText('1 ejercicio sin cambios')).toBeTruthy();
  });

  it('aplicar y cancelar', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onCancel = vi.fn();
    renderImport(baseDiff(), { onApply, onCancel });
    await user.click(screen.getByRole('button', { name: 'Aplicar cambios' }));
    expect(onApply).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('sin cambios', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderImport(baseDiff({ hasChanges: false, unchanged: 3 }), { onCancel });
    expect(screen.getByText('El archivo no trae cambios')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Aplicar cambios' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Entendido' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
