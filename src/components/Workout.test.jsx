import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Workout } from './Workout.jsx';

const ex = (id, name, extra = {}) => ({ id, name, sets: 2, reps: '8', ...extra });

const dayOf = (...exercises) => ({ id: 'd1', label: 'Día 1', color: '#22c55e', exercises });

const day = dayOf(ex('e1', 'Sentadilla', { sets: 1 }));

const blank = (plan) => Object.fromEntries(plan.exercises.map(exercise => [
  exercise.id,
  Object.fromEntries(Array.from({ length: exercise.sets }, (_, i) => [i + 1, { weight: '', reps: '', done: false }])),
]));

const workoutElement = (props = {}) => (
  <Workout
    activeDay={day}
    currentWorkout={blank(props.activeDay ?? day)}
    currentNotes={{}}
    startedAt={Date.now()}
    restStartedAt={null}
    restAlert={null}
    onRestartRest={vi.fn()}
    sessions={[]}
    planId="p1"
    progressPeriod="week"
    progressMetric="volume"
    onProgressPeriodChange={vi.fn()}
    onProgressMetricChange={vi.fn()}
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

const Live = ({ activeDay, initial, onToggleDone = () => {}, ...props }) => {
  const [workout, setWorkout] = useState(initial ?? blank(activeDay));
  const patch = (id, set, change) => setWorkout(prev => ({
    ...prev,
    [id]: { ...prev[id], [set]: { ...prev[id]?.[set], ...change } },
  }));
  return workoutElement({
    activeDay,
    currentWorkout: workout,
    onSaveField: (id, set, field, value) => patch(id, set, { [field]: value }),
    onTogglePC: (id, set) => patch(id, set, { weight: workout[id]?.[set]?.weight === 'PC' ? '' : 'PC' }),
    onToggleDone: (id, set, rest) => {
      onToggleDone(id, set, rest);
      patch(id, set, { done: !workout[id]?.[set]?.done });
    },
    ...props,
  });
};

const title = () => screen.getByRole('heading', { level: 1 }).textContent;

const check = (set, name = 'Sentadilla') => screen.getByRole('button', { name: `Marcar serie ${set} de ${name}` });

const nextUp = () => screen.getByRole('button', { current: 'step' }).getAttribute('aria-label');

const more = (name = 'Sentadilla') => screen.getByRole('button', { name: new RegExp(`^Notas y progreso de ${name}`) });

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Workout · un ejercicio con su tabla', () => {
  const twoExercises = dayOf(ex('e1', 'Sentadilla', { notes: 'Espalda recta' }), ex('e2', 'Zancada', { reps: '10/pierna' }));

  it('enseña el ejercicio, su objetivo y todas sus series, sin las notas', () => {
    renderWorkout({ activeDay: twoExercises });
    expect(title()).toBe('Sentadilla');
    expect(screen.getByText('2 × 8')).toBeTruthy();
    expect(screen.getAllByRole('spinbutton', { name: /^Sentadilla, serie \d, peso en kilos$/ })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Ejercicio 1 de 2. Ver todos los ejercicios' }).textContent).toBe('1 de 2');
    expect(screen.queryByText('Espalda recta')).toBeNull();
  });

  it('señala la primera serie pendiente como la que toca', () => {
    renderWorkout({ activeDay: twoExercises });
    expect(nextUp()).toBe('Marcar serie 1 de Sentadilla');
  });

  it('marcar una serie avisa del descanso del ejercicio y pasa a la siguiente', async () => {
    const user = userEvent.setup();
    const onToggleDone = vi.fn();
    render(<Live activeDay={dayOf(ex('e1', 'Sentadilla', { rest: 90 }), ex('e2', 'Zancada'))} onToggleDone={onToggleDone} />);
    await user.click(check(1));
    expect(onToggleDone).toHaveBeenCalledWith('e1', 1, 90);
    expect(check(1).getAttribute('aria-pressed')).toBe('true');
    expect(nextUp()).toBe('Marcar serie 2 de Sentadilla');
    expect(screen.getByText('1 de 4 series hechas')).toBeTruthy();
  });

  it('se puede marcar una serie salteada', async () => {
    const user = userEvent.setup();
    const onToggleDone = vi.fn();
    render(<Live activeDay={twoExercises} onToggleDone={onToggleDone} />);
    await user.click(check(2));
    expect(onToggleDone).toHaveBeenCalledWith('e1', 2, 120);
    expect(title()).toBe('Sentadilla');
    expect(nextUp()).toBe('Marcar serie 1 de Sentadilla');
  });

  it('al acabar un ejercicio salta al siguiente', async () => {
    const user = userEvent.setup();
    render(<Live activeDay={twoExercises} />);
    await user.click(check(1));
    await user.click(check(2));
    expect(title()).toBe('Zancada');
    expect(screen.getByText('2 × 10/pierna')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ejercicio 2 de 2. Ver todos los ejercicios' })).toBeTruthy();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('las flechas pasan de un ejercicio a otro', async () => {
    const user = userEvent.setup();
    render(<Live activeDay={twoExercises} />);
    const previous = () => screen.getByRole('button', { name: 'Ejercicio anterior' });
    const next = () => screen.getByRole('button', { name: 'Ejercicio siguiente' });
    expect(previous().disabled).toBe(true);
    await user.click(next());
    expect(title()).toBe('Zancada');
    expect(next().disabled).toBe(true);
    await user.click(previous());
    expect(title()).toBe('Sentadilla');
  });

  it('con todo hecho ofrece terminar', async () => {
    const user = userEvent.setup();
    render(<Live activeDay={day} />);
    expect(screen.queryByRole('button', { name: 'Terminar entreno' })).toBeNull();
    await user.click(check(1));
    await user.click(screen.getByRole('button', { name: 'Terminar entreno' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Entreno completo' })).toBeTruthy();
  });

  it('retoma por el primer ejercicio con series pendientes', () => {
    const initial = { e1: { 1: { weight: '60', reps: '8', done: true }, 2: { weight: '60', reps: '8', done: true } }, e2: { 1: { done: true }, 2: {} } };
    render(<Live activeDay={twoExercises} initial={initial} />);
    expect(title()).toBe('Zancada');
    expect(nextUp()).toBe('Marcar serie 2 de Zancada');
  });
});

describe('Workout · peso y repeticiones', () => {
  const weight = (set = 1) => screen.getByRole('spinbutton', { name: `Sentadilla, serie ${set}, peso en kilos` });
  const reps = (set = 1) => screen.getByRole('spinbutton', { name: `Sentadilla, serie ${set}, repeticiones, objetivo 8` });
  const bodyweight = (set) => screen.queryByRole('button', { name: `Serie ${set}: usar peso corporal` });

  it('se escriben en la fila de cada serie, y escribir no la marca', async () => {
    const user = userEvent.setup();
    const onToggleDone = vi.fn();
    render(<Live activeDay={dayOf(ex('e1', 'Sentadilla'))} onToggleDone={onToggleDone} />);
    await user.type(weight(1), '42.5');
    await user.type(reps(1), '8');
    await user.type(weight(2), '40');
    expect(weight(1).value).toBe('42.5');
    expect(reps(1).value).toBe('8');
    expect(weight(2).value).toBe('40');
    expect(onToggleDone).not.toHaveBeenCalled();
    expect(check(1).getAttribute('aria-pressed')).toBe('false');
  });

  it('una serie hecha se corrige sin desmarcarla', async () => {
    const user = userEvent.setup();
    const onToggleDone = vi.fn();
    const initial = { e1: { 1: { weight: '60', reps: '8', done: true }, 2: { weight: '60', reps: '', done: false } } };
    render(<Live activeDay={dayOf(ex('e1', 'Sentadilla'))} initial={initial} onToggleDone={onToggleDone} />);
    await user.clear(reps(1));
    await user.type(reps(1), '7');
    expect(reps(1).value).toBe('7');
    expect(check(1).getAttribute('aria-pressed')).toBe('true');
    expect(onToggleDone).not.toHaveBeenCalled();
  });

  it('desmarcar una serie hecha no pide descanso y vuelve a ser la que toca', async () => {
    const user = userEvent.setup();
    const onToggleDone = vi.fn();
    const initial = { e1: { 1: { weight: '60', reps: '8', done: true }, 2: { weight: '60', reps: '', done: false } } };
    render(<Live activeDay={dayOf(ex('e1', 'Sentadilla'))} initial={initial} onToggleDone={onToggleDone} />);
    await user.click(check(1));
    expect(onToggleDone).toHaveBeenCalledWith('e1', 1, null);
    expect(nextUp()).toBe('Marcar serie 1 de Sentadilla');
  });

  it('con peso corporal la casilla del peso pasa a decir PC, y se puede quitar', async () => {
    const user = userEvent.setup();
    render(<Live activeDay={dayOf(ex('e1', 'Sentadilla', { sets: 1, allowBW: true }))} />);
    await user.click(bodyweight(1));
    expect(bodyweight(1).getAttribute('aria-pressed')).toBe('true');
    expect(bodyweight(1).textContent).toBe('PC');
    expect(screen.queryByRole('spinbutton', { name: /peso en kilos/ })).toBeNull();
    await user.click(bodyweight(1));
    expect(weight(1).value).toBe('');
    expect(bodyweight(1).getAttribute('aria-pressed')).toBe('false');
  });

  it('el botón PC solo sale en la serie que toca', () => {
    renderWorkout({ activeDay: dayOf(ex('e1', 'Sentadilla', { allowBW: true })) });
    expect(bodyweight(1)).toBeTruthy();
    expect(bodyweight(2)).toBeNull();
  });

  it('sin peso corporal permitido no hay botón PC', () => {
    renderWorkout();
    expect(screen.queryByRole('button', { name: /peso corporal/ })).toBeNull();
  });
});

describe('Workout · superserie', () => {
  const pair = dayOf(
    ex('e1', 'Sentadilla', { sets: 1 }),
    ex('e2', 'Gemelo', { superset: 'A', rest: 60 }),
    ex('e3', 'Abdominales', { superset: 'A', rest: 60 }),
  );
  const startAtPair = { ...blank(pair), e1: { 1: { weight: '60', reps: '8', done: true } } };

  it('enseña los dos ejercicios en la misma pantalla, cada uno con su tabla', () => {
    render(<Live activeDay={pair} initial={startAtPair} />);
    expect(title()).toBe('Superserie · ronda 1 de 2');
    expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual(['Gemelo', 'Abdominales']);
    expect(screen.getByRole('button', { name: 'Ejercicio 2 y 3 de 3. Ver todos los ejercicios' })).toBeTruthy();
    expect(screen.getAllByRole('spinbutton', { name: /peso en kilos/ })).toHaveLength(4);
  });

  it('la serie que toca alterna entre los dos por rondas', async () => {
    const user = userEvent.setup();
    render(<Live activeDay={pair} initial={startAtPair} />);
    expect(nextUp()).toBe('Marcar serie 1 de Gemelo');
    await user.click(check(1, 'Gemelo'));
    expect(nextUp()).toBe('Marcar serie 1 de Abdominales');
    await user.click(check(1, 'Abdominales'));
    expect(nextUp()).toBe('Marcar serie 2 de Gemelo');
    expect(title()).toBe('Superserie · ronda 2 de 2');
  });

  it('dentro de la ronda no hay descanso; al acabarla, el del ejercicio', async () => {
    const user = userEvent.setup();
    const onToggleDone = vi.fn();
    render(<Live activeDay={pair} initial={startAtPair} onToggleDone={onToggleDone} />);
    await user.click(check(1, 'Gemelo'));
    await user.click(check(1, 'Abdominales'));
    expect(onToggleDone.mock.calls).toEqual([['e2', 1, null], ['e3', 1, 60]]);
  });

  it('cuando se acaba lo dice y, si no queda nada más, ofrece terminar', async () => {
    const user = userEvent.setup();
    render(<Live activeDay={pair} initial={startAtPair} />);
    for (const set of [1, 2]) {
      await user.click(check(set, 'Gemelo'));
      await user.click(check(set, 'Abdominales'));
    }
    expect(title()).toBe('Superserie · completa');
    expect(screen.getByRole('button', { name: 'Terminar entreno' })).toBeTruthy();
  });
});

describe('Workout · índice del entreno', () => {
  const three = dayOf(ex('e1', 'Sentadilla'), ex('e2', 'Gemelo', { superset: 'A' }), ex('e3', 'Abdominales', { superset: 'A' }));

  const openIndex = async (user) => {
    await user.click(screen.getByRole('button', { name: /Ver todos los ejercicios/ }));
    return screen.getByRole('dialog', { name: 'Ejercicios de hoy' });
  };

  it('lista todos los ejercicios con lo que llevas de cada uno', async () => {
    const user = userEvent.setup();
    const initial = { ...blank(three), e1: { 1: { done: true }, 2: {} } };
    render(<Live activeDay={three} initial={initial} />);
    const dialog = await openIndex(user);
    expect(within(dialog).getByRole('button', { name: /Sentadilla/ }).textContent).toContain('1/2');
    expect(within(dialog).getByText('Superserie')).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: /Abdominales/ }).textContent).toContain('0/2');
  });

  it('tocar un ejercicio salta a él', async () => {
    const user = userEvent.setup();
    render(<Live activeDay={three} />);
    const dialog = await openIndex(user);
    await user.click(within(dialog).getByRole('button', { name: /Gemelo/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(title()).toBe('Superserie · ronda 1 de 2');
  });
});

describe('Workout · terminar', () => {
  it('el resumen cuenta lo hecho y deja guardar', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    const initial = { e1: { 1: { weight: '60', reps: '8', done: true } } };
    render(<Live activeDay={day} initial={initial} onFinish={onFinish} />);
    await user.click(screen.getByRole('button', { name: 'Terminar' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Entreno completo' })).toBeTruthy();
    expect(screen.getByText('1/1')).toBeTruthy();
    expect(screen.getByText('60 kg × 8')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Guardar entreno, 1 de 1 series' }));
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it('avisa de lo que queda y deja volver al entreno', async () => {
    const user = userEvent.setup();
    const initial = { e1: { 1: { weight: '60', reps: '8', done: true }, 2: {} } };
    render(<Live activeDay={dayOf(ex('e1', 'Sentadilla'))} initial={initial} />);
    await user.click(screen.getByRole('button', { name: 'Terminar' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Te queda 1 serie' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Seguir entrenando' }));
    expect(title()).toBe('Sentadilla');
  });

  it('sin ninguna serie hecha no se puede guardar', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    renderWorkout({ onFinish });
    await user.click(screen.getByRole('button', { name: 'Terminar' }));
    expect(screen.getByText('Aún no has marcado ninguna serie.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Guardar entreno, 0 de 1 series' }).disabled).toBe(true);
  });

  it('señala cuánto has subido respecto a la última vez', async () => {
    const user = userEvent.setup();
    const sessions = [{
      planId: 'p1',
      dayId: 'd1',
      date: '2026-10-01T10:00:00.000Z',
      exercises: { e1: { 1: { weight: '57.5', reps: '8', done: true } } },
      notes: {},
    }];
    const initial = { e1: { 1: { weight: '60', reps: '8', done: true } } };
    render(<Live activeDay={day} initial={initial} sessions={sessions} />);
    await user.click(screen.getByRole('button', { name: 'Terminar' }));
    expect(screen.getByText('+2,5 kg')).toBeTruthy();
  });
});

describe('Workout · notas y progreso del ejercicio', () => {
  const withNotes = dayOf(ex('e1', 'Sentadilla', { sets: 1, notes: 'Espalda recta' }));

  const openMore = async (user) => {
    await user.click(more());
    return screen.getByRole('dialog', { name: 'Sentadilla' });
  };

  it('el botón del ejercicio enseña las notas del plan y la nota de hoy', async () => {
    const user = userEvent.setup();
    renderWorkout({ activeDay: withNotes, currentNotes: { e1: 'codos pegados' } });
    const dialog = await openMore(user);
    expect(within(dialog).getByText('Espalda recta')).toBeTruthy();
    expect(within(dialog).getByText('codos pegados')).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Editar nota' })).toBeTruthy();
  });

  it('el botón avisa de que hay nota de hoy', () => {
    const { unmount } = renderWorkout();
    expect(more().getAttribute('aria-label')).toBe('Notas y progreso de Sentadilla');
    unmount();
    renderWorkout({ currentNotes: { e1: 'codos pegados' } });
    expect(more().getAttribute('aria-label')).toBe('Notas y progreso de Sentadilla, con nota de hoy');
  });

  it('permite escribir espacios en la nota de un ejercicio', async () => {
    const user = userEvent.setup();
    const onSaveNote = vi.fn();
    renderWorkout({ onSaveNote });
    await openMore(user);
    await user.click(screen.getByRole('button', { name: 'Añadir nota' }));
    const note = screen.getByRole('textbox', { name: 'Nota de Sentadilla' });
    expect(document.activeElement).toBe(note);
    await user.type(note, 'codos pegados');
    await user.click(screen.getByRole('button', { name: 'Guardar nota' }));
    expect(onSaveNote).toHaveBeenCalledWith('e1', 'codos pegados');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(more());
  });

  it('abre el progreso del ejercicio con el foco en Cerrar', async () => {
    const user = userEvent.setup();
    renderWorkout();
    await openMore(user);
    await user.click(screen.getByRole('button', { name: 'Ver progreso' }));
    const dialog = screen.getByRole('dialog', { name: 'Sentadilla' });
    expect(within(dialog).getByRole('group', { name: 'Periodo' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar' }));
  });

  it('el progreso se cierra con Cerrar y con Escape, y el foco vuelve al ejercicio', async () => {
    const user = userEvent.setup();
    renderWorkout();
    await openMore(user);
    await user.click(screen.getByRole('button', { name: 'Ver progreso' }));
    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(more());
    await openMore(user);
    await user.click(screen.getByRole('button', { name: 'Ver progreso' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Workout · salir', () => {
  const askToExit = async (user) => {
    await user.click(screen.getByRole('button', { name: 'Salir sin guardar' }));
    return screen.getByRole('alertdialog', { name: '¿Salir sin guardar?' });
  };

  it('no descarta el entreno si se cancela la confirmación', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    renderWorkout({ onExit });
    const dialog = await askToExit(user);
    expect(dialog.textContent).toContain('Se perderá este entreno.');
    await user.click(within(dialog).getByRole('button', { name: 'Seguir entrenando' }));
    expect(onExit).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('descarta el entreno si se confirma', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    renderWorkout({ onExit });
    const dialog = await askToExit(user);
    await user.click(within(dialog).getByRole('button', { name: 'Salir sin guardar' }));
    expect(onExit).toHaveBeenCalled();
  });

  it('dice cuántas series se pierden', async () => {
    const user = userEvent.setup();
    const initial = { e1: { 1: { weight: '60', reps: '8', done: true } } };
    render(<Live activeDay={day} initial={initial} />);
    expect((await askToExit(user)).textContent).toContain('con 1 serie marcada');
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
    renderWorkout({ restStartedAt: Date.now() - 5000, restAlert: 120 });
    expect(rest()).toBe('00:05');
    wait(2000);
    expect(rest()).toBe('00:07');
  });

  it('avisa cuando se cumple el descanso del ejercicio', () => {
    renderWorkout({ restStartedAt: Date.now() - 58_000, restAlert: 60 });
    expect(screen.queryByText('Descanso cumplido')).toBeNull();
    wait(2000);
    expect(screen.getByText('Descanso cumplido')).toBeTruthy();
  });

  it('a mitad de una superserie no avisa por mucho que pase el tiempo', () => {
    renderWorkout({ restStartedAt: Date.now() - 600_000, restAlert: null });
    wait(1000);
    expect(screen.queryByText('Descanso cumplido')).toBeNull();
  });

  it('el botón reinicia el descanso con el aviso del ejercicio', async () => {
    const user = setupUser();
    const onRestartRest = vi.fn();
    renderWorkout({ onRestartRest, activeDay: dayOf(ex('e1', 'Sentadilla', { rest: 90 })) });
    await user.click(screen.getByRole('button', { name: 'Reiniciar descanso' }));
    expect(onRestartRest).toHaveBeenCalledTimes(1);
    expect(onRestartRest).toHaveBeenCalledWith(90);
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
    await user.click(more());
    await user.click(screen.getByRole('button', { name: 'Añadir nota' }));
    await user.type(screen.getByRole('textbox', { name: 'Nota de Sentadilla' }), ' ');
    expect(onRestartRest).not.toHaveBeenCalled();
  });
});

describe('Workout · espacio con una hoja abierta', () => {
  it.each([
    ['notas y progreso', 'Notas y progreso de Sentadilla'],
    ['salir', 'Salir sin guardar'],
    ['índice', 'Ejercicio 1 de 1. Ver todos los ejercicios'],
  ])('no reinicia el descanso con la hoja de %s abierta aunque el foco salga de ella', async (_label, opener) => {
    const user = userEvent.setup();
    const onRestartRest = vi.fn();
    renderWorkout({ onRestartRest });
    await user.click(screen.getByRole('button', { name: opener }));
    act(() => document.activeElement.blur());
    await user.keyboard(' ');
    expect(onRestartRest).not.toHaveBeenCalled();
  });
});

describe.each([
  ['notas y progreso', 'dialog', 'Notas y progreso de Sentadilla', 'Sentadilla'],
  ['índice', 'dialog', 'Ejercicio 1 de 1. Ver todos los ejercicios', 'Ejercicios de hoy'],
  ['salir', 'alertdialog', 'Salir sin guardar', '¿Salir sin guardar?'],
])('Workout · hoja de %s', (_label, role, openerName, dialogName) => {
  it('al cerrarla con Escape el foco vuelve al botón que la abrió', async () => {
    const user = userEvent.setup();
    renderWorkout();
    const opener = screen.getByRole('button', { name: openerName });
    await user.click(opener);
    expect(screen.getByRole(role, { name: dialogName })).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole(role)).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('el tabulador no sale de la hoja', async () => {
    const user = userEvent.setup();
    renderWorkout();
    await user.click(screen.getByRole('button', { name: openerName }));
    const dialog = screen.getByRole(role, { name: dialogName });
    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    for (let i = 0; i < 6; i++) {
      await user.tab({ shift: true });
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });
});
