import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Workout } from './Workout.jsx';

const day = {
  id: 'd1',
  label: 'Día 1',
  color: '#22c55e',
  exercises: [{ id: 'e1', name: 'Sentadilla', sets: 1, reps: '8' }],
};

const renderWorkout = (props = {}) => render(
  <Workout
    activeDay={day}
    currentWorkout={{ e1: { 1: { weight: '', reps: '', done: false } } }}
    currentNotes={{}}
    onSaveField={vi.fn()}
    onSaveNote={vi.fn()}
    onTogglePC={vi.fn()}
    onToggleDone={vi.fn()}
    onFinish={vi.fn()}
    onExit={vi.fn()}
    {...props}
  />,
);

describe('Workout', () => {
  it('permite escribir espacios en la nota de un ejercicio', async () => {
    const user = userEvent.setup();
    const onSaveNote = vi.fn();
    renderWorkout({ onSaveNote });
    await user.click(screen.getByRole('button', { name: 'Añadir nota a Sentadilla' }));
    await user.type(screen.getByRole('textbox', { name: 'Nota de Sentadilla' }), 'codos pegados');
    await user.click(screen.getByRole('button', { name: 'Guardar nota' }));
    expect(onSaveNote).toHaveBeenCalledWith('e1', 'codos pegados');
  });

  it('no arranca el descanso al pulsar espacio mientras se escribe', async () => {
    const user = userEvent.setup();
    renderWorkout();
    await user.click(screen.getByRole('button', { name: 'Añadir nota a Sentadilla' }));
    await user.type(screen.getByRole('textbox', { name: 'Nota de Sentadilla' }), ' ');
    expect(screen.queryByRole('button', { name: /^Descanso/ })).toBeNull();
  });

  it('arranca el descanso al pulsar espacio fuera de un campo', async () => {
    const user = userEvent.setup();
    renderWorkout();
    await user.keyboard(' ');
    expect(screen.getByRole('button', { name: /^Descanso/ })).toBeTruthy();
  });
});

describe('Workout · salir', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('no descarta el entreno si se cancela la confirmación', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    vi.stubGlobal('confirm', vi.fn(() => false));
    renderWorkout({ onExit });
    await user.click(screen.getByRole('button', { name: '← Salir' }));
    expect(confirm).toHaveBeenCalled();
    expect(onExit).not.toHaveBeenCalled();
  });

  it('descarta el entreno si se confirma', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    vi.stubGlobal('confirm', vi.fn(() => true));
    renderWorkout({ onExit });
    await user.click(screen.getByRole('button', { name: '← Salir' }));
    expect(onExit).toHaveBeenCalled();
  });
});
