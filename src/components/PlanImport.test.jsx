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
    expect(screen.getByText('+ Remo · 3×10')).toBeTruthy();
    expect(screen.getByText('− Press banca · sus entrenos se conservan')).toBeTruthy();
    expect(screen.getByText('Sentadilla: antes «Squat», 3×8 → 4×6')).toBeTruthy();
  });

  it('muestra días nuevos, quitados y renombrados', () => {
    renderImport(baseDiff({
      days: [
        entry('d1', 'Torso', { renamedFrom: 'Tren superior' }),
        entry('d5', 'Pierna B', { status: 'added', added: [ex('e5', 'Prensa')] }),
        entry('d2', 'Pierna', { status: 'removed', removed: [ex('e3', 'Zancadas')] }),
      ],
    }));
    expect(screen.getByRole('heading', { level: 2, name: 'Torso (antes «Tren superior»)' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Día nuevo: Pierna B' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Día quitado: Pierna' })).toBeTruthy();
    expect(screen.getByText('Sus entrenos se conservan pero dejarán de mostrarse')).toBeTruthy();
    expect(screen.getByText('− Zancadas · sus entrenos se conservan')).toBeTruthy();
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
    expect(screen.getByText('Dominadas: peso corporal no → sí, notas cambiadas, movido desde Torso')).toBeTruthy();
  });

  it('nombra los días sin nombre', () => {
    renderImport(baseDiff({
      days: [
        entry('d1', 'Torso', { renamedFrom: '' }),
        entry('d2', 'Pierna', { changed: [{ exercise: ex('e1', 'Remo'), before: ex('e1', 'Remo'), fields: [], movedFrom: '' }] }),
      ],
    }));
    expect(screen.getByRole('heading', { level: 2, name: 'Torso (antes «sin nombre»)' })).toBeTruthy();
    expect(screen.getByText('Remo: movido desde «sin nombre»')).toBeTruthy();
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
    await user.click(screen.getByRole('button', { name: '← Volver' }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('sin cambios', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderImport(baseDiff({ hasChanges: false, unchanged: 3 }), { onCancel });
    expect(screen.getByText('El archivo no trae cambios')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Aplicar cambios' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
