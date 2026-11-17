import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PlanDay } from './PlanDay.jsx';

const ex = (id, name, extra = {}) => ({ id, name, sets: 3, reps: '8', ...extra });

const day = {
  id: 'd1',
  label: 'Día 1',
  color: '#22c55e',
  exercises: [ex('e1', 'Sentadilla'), ex('e2', 'Gemelo', { superset: 'A' }), ex('e3', 'Abdominales', { superset: 'A' })],
};

const renderDay = (props = {}) => render(
  <PlanDay day={day} planId="p1" planName="Full Body" sessions={[]} onBack={vi.fn()} onUpdateDay={vi.fn()}
    onAddExercise={vi.fn()} onOpenExercise={vi.fn()} onMoveExercise={vi.fn()} onRemoveDay={vi.fn()} {...props} />,
);

describe('PlanDay · ejercicios', () => {
  it('los lista con sus series y abre cada uno en su pantalla', async () => {
    const onOpenExercise = vi.fn();
    renderDay({ onOpenExercise });
    const squat = screen.getByRole('button', { name: 'Editar Sentadilla' });
    expect(squat.textContent).toContain('3 × 8');
    await userEvent.setup().click(squat);
    expect(onOpenExercise).toHaveBeenCalledWith('e1');
  });

  it('agrupa los que van en superserie', () => {
    renderDay();
    const group = screen.getByText('Superserie').parentElement;
    expect(within(group).getByRole('button', { name: 'Editar Gemelo' })).toBeTruthy();
    expect(within(group).getByRole('button', { name: 'Editar Abdominales' })).toBeTruthy();
    expect(within(group).queryByRole('button', { name: 'Editar Sentadilla' })).toBeNull();
  });

  it('reordena con las flechas, sin salirse de la lista', async () => {
    const user = userEvent.setup();
    const onMoveExercise = vi.fn();
    renderDay({ onMoveExercise });
    expect(screen.getByRole('button', { name: 'Subir Sentadilla' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Bajar Abdominales' }).disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Bajar Sentadilla' }));
    await user.click(screen.getByRole('button', { name: 'Subir Gemelo' }));
    expect(onMoveExercise.mock.calls).toEqual([['e1', 1], ['e2', -1]]);
  });

  it('añadir ejercicio y volver', async () => {
    const user = userEvent.setup();
    const onAddExercise = vi.fn();
    const onBack = vi.fn();
    renderDay({ onAddExercise, onBack });
    await user.click(screen.getByRole('button', { name: 'Añadir ejercicio' }));
    await user.click(screen.getByRole('button', { name: 'Full Body' }));
    expect(onAddExercise).toHaveBeenCalledOnce();
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('un día vacío lo dice', () => {
    renderDay({ day: { ...day, exercises: [] } });
    expect(screen.getByText('Este día aún no tiene ejercicios.')).toBeTruthy();
  });
});

describe('PlanDay · nombre y color', () => {
  it('guarda el nombre según se escribe', async () => {
    const onUpdateDay = vi.fn();
    renderDay({ onUpdateDay });
    await userEvent.setup().type(screen.getByRole('textbox', { name: 'Nombre' }), 'x');
    expect(onUpdateDay).toHaveBeenCalledWith({ label: 'Día 1x' });
  });

  it('marca el color actual y cambia a otro', async () => {
    const onUpdateDay = vi.fn();
    renderDay({ onUpdateDay });
    expect(screen.getByRole('button', { name: 'Verde' }).getAttribute('aria-pressed')).toBe('true');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Azul' }));
    expect(onUpdateDay).toHaveBeenCalledWith({ color: '#3b82f6' });
  });
});

describe('PlanDay · borrar día', () => {
  const openConfirm = async (user) => {
    await user.click(screen.getByRole('button', { name: 'Borrar este día' }));
    return screen.getByRole('alertdialog', { name: '¿Borrar «Día 1»?' });
  };

  it.each([
    [[{ planId: 'p1', dayId: 'd1' }, { planId: 'p1', dayId: 'd1' }, { planId: 'p2', dayId: 'd1' }, { planId: 'p1', dayId: 'd2' }], 'Tienes 2 entrenos guardados de este día.'],
    [[{ planId: 'p1', dayId: 'd1' }, { planId: 'p2', dayId: 'd1' }], 'Tienes 1 entreno guardado de este día.'],
  ])('avisa de cuántos entrenos tiene', async (sessions, text) => {
    renderDay({ sessions });
    const dialog = await openConfirm(userEvent.setup());
    expect(dialog.textContent).toContain(text);
    expect(dialog.textContent).toContain('Se conservarán en este dispositivo pero dejarán de mostrarse.');
  });

  it('no avisa si el día no tiene entrenos', async () => {
    renderDay();
    const dialog = await openConfirm(userEvent.setup());
    expect(dialog.textContent).not.toContain('entreno');
  });

  it('solo borra al confirmar', async () => {
    const user = userEvent.setup();
    const onRemoveDay = vi.fn();
    renderDay({ onRemoveDay });
    await openConfirm(user);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onRemoveDay).not.toHaveBeenCalled();
    await openConfirm(user);
    await user.click(screen.getByRole('button', { name: 'Borrar día' }));
    expect(onRemoveDay).toHaveBeenCalledOnce();
  });
});
