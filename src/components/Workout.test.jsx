import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Workout } from './Workout.jsx';

const day = {
  id: 'd1',
  label: 'Día 1',
  color: '#22c55e',
  exercises: [{ id: 'e1', name: 'Sentadilla', sets: 1, reps: '8' }],
};

const workoutElement = (props = {}) => (
  <Workout
    activeDay={day}
    currentWorkout={{ e1: { 1: { weight: '', reps: '', done: false } } }}
    currentNotes={{}}
    startedAt={Date.now()}
    restStartedAt={null}
    onRestartRest={vi.fn()}
    onSaveField={vi.fn()}
    onSaveNote={vi.fn()}
    onTogglePC={vi.fn()}
    onToggleDone={vi.fn()}
    onFinish={vi.fn()}
    onExit={vi.fn()}
    {...props}
  />
);

const renderWorkout = (props = {}) => render(workoutElement(props));

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

describe('Workout · temporizadores', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const rest = () => screen.getByRole('timer', { name: 'Descanso' }).textContent;
  const total = () => screen.getByRole('timer', { name: 'Tiempo total' }).textContent;
  const wait = (ms) => act(() => vi.advanceTimersByTime(ms));
  const setupUser = () => userEvent.setup();

  it('el total cuenta desde la hora de inicio', () => {
    renderWorkout({ startedAt: Date.now() - 65_000 });
    expect(total()).toBe('01:05');
    wait(3000);
    expect(total()).toBe('01:08');
  });

  it('el descanso marca 00:00 hasta que arranca', () => {
    renderWorkout({ restStartedAt: null });
    wait(3000);
    expect(rest()).toBe('00:00');
  });

  it('el descanso cuenta desde su hora de inicio', () => {
    renderWorkout({ restStartedAt: Date.now() - 5000 });
    expect(rest()).toBe('00:05');
    wait(2000);
    expect(rest()).toBe('00:07');
  });

  it('el botón reinicia el descanso', async () => {
    const user = setupUser();
    const onRestartRest = vi.fn();
    renderWorkout({ onRestartRest });
    await user.click(screen.getByRole('button', { name: 'Reiniciar descanso' }));
    expect(onRestartRest).toHaveBeenCalledTimes(1);
  });

  it('arranca el descanso al pulsar espacio fuera de un campo', async () => {
    const user = setupUser();
    const onRestartRest = vi.fn();
    renderWorkout({ onRestartRest });
    await user.keyboard(' ');
    expect(onRestartRest).toHaveBeenCalledTimes(1);
  });

  it('no arranca el descanso al pulsar espacio mientras se escribe', async () => {
    const user = setupUser();
    const onRestartRest = vi.fn();
    renderWorkout({ onRestartRest });
    await user.click(screen.getByRole('button', { name: 'Añadir nota a Sentadilla' }));
    await user.type(screen.getByRole('textbox', { name: 'Nota de Sentadilla' }), ' ');
    expect(onRestartRest).not.toHaveBeenCalled();
  });
});
