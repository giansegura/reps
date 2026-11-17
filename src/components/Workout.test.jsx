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

const done = () => screen.getByRole('button', { name: 'Serie hecha' });

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Workout · una serie cada vez', () => {
  const twoExercises = dayOf(ex('e1', 'Sentadilla', { notes: 'Espalda recta' }), ex('e2', 'Zancada', { reps: '10/pierna' }));

  it('enseña el ejercicio, su objetivo y sus notas sin tener que abrir nada', () => {
    renderWorkout({ activeDay: twoExercises });
    expect(screen.getByText('Ejercicio 1 de 2')).toBeTruthy();
    expect(title()).toBe('Sentadilla');
    expect(screen.getByText('2 × 8')).toBeTruthy();
    expect(screen.getByText('Espalda recta')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Serie 1 de 2, Sentadilla' })).toBeTruthy();
  });

  it('marcar la serie pasa a la siguiente y avisa del descanso del ejercicio', async () => {
    const user = userEvent.setup();
    const onToggleDone = vi.fn();
    render(<Live activeDay={dayOf(ex('e1', 'Sentadilla', { rest: 90 }), ex('e2', 'Zancada'))} onToggleDone={onToggleDone} />);
    await user.click(done());
    expect(onToggleDone).toHaveBeenCalledWith('e1', 1, 90);
    expect(screen.getByRole('region', { name: 'Serie 2 de 2, Sentadilla' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '1 de 4 series hechas. Ver todos los ejercicios' })).toBeTruthy();
  });

  it('al acabar un ejercicio salta al siguiente', async () => {
    const user = userEvent.setup();
    render(<Live activeDay={twoExercises} />);
    await user.click(done());
    await user.click(done());
    expect(title()).toBe('Zancada');
    expect(screen.getByText('Ejercicio 2 de 2')).toBeTruthy();
  });

  it('«Después» adelanta al siguiente ejercicio', async () => {
    const user = userEvent.setup();
    render(<Live activeDay={twoExercises} />);
    await user.click(screen.getByRole('button', { name: /Después.*Zancada/ }));
    expect(title()).toBe('Zancada');
    expect(screen.queryByRole('button', { name: /Después/ })).toBeTruthy();
  });

  it('con todo hecho ofrece terminar', async () => {
    const user = userEvent.setup();
    render(<Live activeDay={day} />);
    await user.click(done());
    expect(screen.getByText('Entreno completo')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Terminar entreno' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Entreno completo' })).toBeTruthy();
  });

  it('retoma por la primera serie pendiente', () => {
    const initial = { e1: { 1: { weight: '60', reps: '8', done: true }, 2: { weight: '60', reps: '8', done: true } }, e2: { 1: { done: true }, 2: {} } };
    render(<Live activeDay={twoExercises} initial={initial} />);
    expect(title()).toBe('Zancada');
    expect(screen.getByRole('region', { name: 'Serie 2 de 2, Zancada' })).toBeTruthy();
  });
});

describe('Workout · peso y repeticiones', () => {
  const weight = () => screen.getByRole('spinbutton', { name: 'Sentadilla, serie 1, peso en kilos' });
  const reps = () => screen.getByRole('spinbutton', { name: 'Sentadilla, serie 1, repeticiones, objetivo 8' });

  it('los botones suben y bajan el valor', async () => {
    const user = userEvent.setup();
    const initial = { e1: { 1: { weight: '60', reps: '8', done: false } } };
    render(<Live activeDay={day} initial={initial} />);
    await user.click(screen.getByRole('button', { name: 'Subir peso' }));
    expect(weight().value).toBe('62.5');
    await user.click(screen.getByRole('button', { name: 'Bajar peso' }));
    await user.click(screen.getByRole('button', { name: 'Bajar peso' }));
    expect(weight().value).toBe('57.5');
    await user.click(screen.getByRole('button', { name: 'Una repetición más' }));
    expect(reps().value).toBe('9');
    await user.click(screen.getByRole('button', { name: 'Una repetición menos' }));
    expect(reps().value).toBe('8');
  });

  it('también se pueden escribir, y escribir no marca la serie', async () => {
    const user = userEvent.setup();
    const onToggleDone = vi.fn();
    render(<Live activeDay={day} onToggleDone={onToggleDone} />);
    await user.type(weight(), '42.5');
    await user.type(reps(), '8');
    expect(weight().value).toBe('42.5');
    expect(reps().value).toBe('8');
    expect(onToggleDone).not.toHaveBeenCalled();
    expect(done()).toBeTruthy();
  });

  it('con peso corporal el peso queda bloqueado', async () => {
    const user = userEvent.setup();
    const bodyweight = dayOf(ex('e1', 'Sentadilla', { sets: 1, allowBW: true }));
    render(<Live activeDay={bodyweight} />);
    const toggle = screen.getByRole('button', { name: 'Serie 1: usar peso corporal' });
    await user.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(weight().disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Subir peso' }).disabled).toBe(true);
  });

  it('sin peso corporal permitido no hay botón PC', () => {
    renderWorkout();
    expect(screen.queryByRole('button', { name: /peso corporal/ })).toBeNull();
  });

  it('enseña lo que hiciste la última vez en esa serie', () => {
    const sessions = [{
      planId: 'p1',
      dayId: 'otro',
      date: '2026-10-01T10:00:00.000Z',
      exercises: { e1: { 1: { weight: '57.5', reps: '7', done: true } } },
      notes: {},
    }];
    renderWorkout({ sessions });
    expect(screen.getByText('Última vez 57,5 kg × 7')).toBeTruthy();
  });

  it('no inventa una última vez si esa serie no se hizo', () => {
    const sessions = [{
      planId: 'p1',
      dayId: 'd1',
      date: '2026-10-01T10:00:00.000Z',
      exercises: { e1: { 1: { weight: '57.5', reps: '7', done: false } } },
      notes: {},
    }];
    renderWorkout({ sessions });
    expect(screen.queryByText(/Última vez/)).toBeNull();
  });
});

describe('Workout · corregir una serie hecha', () => {
  const twoSets = dayOf(ex('e1', 'Sentadilla'));
  const initial = { e1: { 1: { weight: '60', reps: '8', done: true }, 2: { weight: '60', reps: '', done: false } } };

  it('las series hechas quedan a la vista con su resultado', () => {
    render(<Live activeDay={twoSets} initial={initial} />);
    expect(screen.getByRole('button', { name: 'Corregir serie 1 de Sentadilla' }).textContent).toContain('60 kg × 8');
  });

  it('se puede abrir, cambiar y volver a la pendiente', async () => {
    const user = userEvent.setup();
    render(<Live activeDay={twoSets} initial={initial} />);
    await user.click(screen.getByRole('button', { name: 'Corregir serie 1 de Sentadilla' }));
    expect(screen.getByRole('region', { name: 'Serie 1 de 2, Sentadilla' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Una repetición menos' }));
    await user.click(screen.getByRole('button', { name: 'Listo' }));
    expect(screen.getByRole('region', { name: 'Serie 2 de 2, Sentadilla' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Corregir serie 1 de Sentadilla' }).textContent).toContain('60 kg × 7');
  });

  it('desmarcarla no pide descanso', async () => {
    const user = userEvent.setup();
    const onToggleDone = vi.fn();
    render(<Live activeDay={twoSets} initial={initial} onToggleDone={onToggleDone} />);
    await user.click(screen.getByRole('button', { name: 'Corregir serie 1 de Sentadilla' }));
    await user.click(screen.getByRole('button', { name: 'Desmarcar serie' }));
    expect(onToggleDone).toHaveBeenCalledWith('e1', 1, null);
    expect(done()).toBeTruthy();
  });
});

describe('Workout · superserie', () => {
  const pair = dayOf(
    ex('e1', 'Sentadilla', { sets: 1 }),
    ex('e2', 'Gemelo', { superset: 'A', rest: 60 }),
    ex('e3', 'Abdominales', { superset: 'A', rest: 60 }),
  );
  const startAtPair = { ...blank(pair), e1: { 1: { weight: '60', reps: '8', done: true } } };

  it('alterna los dos ejercicios por rondas', async () => {
    const user = userEvent.setup();
    render(<Live activeDay={pair} initial={startAtPair} />);
    expect(screen.getByText('Superserie · ejercicio 2 de 3')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Ronda 1 de 2, Gemelo' })).toBeTruthy();
    await user.click(done());
    expect(title()).toBe('Abdominales');
    expect(screen.getByRole('region', { name: 'Ronda 1 de 2, Abdominales' })).toBeTruthy();
    await user.click(done());
    expect(screen.getByRole('region', { name: 'Ronda 2 de 2, Gemelo' })).toBeTruthy();
  });

  it('dentro de la ronda no hay descanso; al acabarla, el del ejercicio', async () => {
    const user = userEvent.setup();
    const onToggleDone = vi.fn();
    render(<Live activeDay={pair} initial={startAtPair} onToggleDone={onToggleDone} />);
    expect(screen.getByRole('button', { name: /Después.*Abdominales, sin descanso/ })).toBeTruthy();
    await user.click(done());
    await user.click(done());
    expect(onToggleDone.mock.calls).toEqual([['e2', 1, null], ['e3', 1, 60]]);
  });

  it('las series hechas dicen de qué ejercicio son', async () => {
    const user = userEvent.setup();
    render(<Live activeDay={pair} initial={startAtPair} />);
    await user.click(done());
    expect(screen.getByRole('button', { name: 'Corregir serie 1 de Gemelo' }).textContent).toContain('Gemelo');
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
    expect(title()).toBe('Gemelo');
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

describe('Workout · notas', () => {
  it('permite escribir espacios en la nota de un ejercicio', async () => {
    const user = userEvent.setup();
    const onSaveNote = vi.fn();
    renderWorkout({ onSaveNote });
    await user.click(screen.getByRole('button', { name: 'Añadir nota a Sentadilla' }));
    await user.type(screen.getByRole('textbox', { name: 'Nota de Sentadilla' }), 'codos pegados');
    await user.click(screen.getByRole('button', { name: 'Guardar nota' }));
    expect(onSaveNote).toHaveBeenCalledWith('e1', 'codos pegados');
  });

  it('la nota de hoy se ve en el ejercicio', () => {
    renderWorkout({ currentNotes: { e1: 'codos pegados' } });
    expect(screen.getByRole('button', { name: 'Nota de Sentadilla: codos pegados. Editar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Editar nota de Sentadilla' }).getAttribute('aria-pressed')).toBe('true');
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

  it('dice a qué hora avisa: la del ejercicio, o ninguna a mitad de superserie', () => {
    const { unmount } = renderWorkout();
    expect(screen.getByText('aviso 2:00')).toBeTruthy();
    unmount();
    const quick = renderWorkout({ activeDay: dayOf(ex('e1', 'Sentadilla', { rest: 45 })) });
    expect(screen.getByText('aviso 0:45')).toBeTruthy();
    quick.unmount();
    renderWorkout({ restStartedAt: Date.now(), restAlert: null });
    expect(screen.getByText('sin descanso')).toBeTruthy();
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
    await user.click(screen.getByRole('button', { name: 'Añadir nota a Sentadilla' }));
    await user.type(screen.getByRole('textbox', { name: 'Nota de Sentadilla' }), ' ');
    expect(onRestartRest).not.toHaveBeenCalled();
  });
});

describe('Workout · espacio con una hoja abierta', () => {
  it.each([
    ['progreso', 'Progreso de Sentadilla'],
    ['nota', 'Añadir nota a Sentadilla'],
    ['salir', 'Salir sin guardar'],
    ['índice', '0 de 1 series hechas. Ver todos los ejercicios'],
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
  ['nota del entreno', 'dialog', 'Añadir nota a Sentadilla', 'Nota · Sentadilla'],
  ['progreso', 'dialog', 'Progreso de Sentadilla', 'Sentadilla'],
  ['índice', 'dialog', '0 de 1 series hechas. Ver todos los ejercicios', 'Ejercicios de hoy'],
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

const NotesHarness = () => {
  const [notes, setNotes] = useState({ e1: 'codos pegados' });
  const saveNote = (exId, text) => setNotes(prev => {
    const next = { ...prev };
    if (text.trim()) next[exId] = text.trim();
    else delete next[exId];
    return next;
  });
  return workoutElement({ currentNotes: notes, onSaveNote: saveNote });
};

describe('Workout · borrar la nota desde su vista previa', () => {
  it('devuelve el foco al botón de nota del ejercicio', async () => {
    const user = userEvent.setup();
    render(<NotesHarness />);
    await user.click(screen.getByRole('button', { name: /^Nota de Sentadilla: codos pegados/ }));
    await user.clear(screen.getByRole('textbox', { name: 'Nota de Sentadilla' }));
    await user.click(screen.getByRole('button', { name: 'Guardar nota' }));
    expect(screen.queryByRole('button', { name: /^Nota de Sentadilla:/ })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Añadir nota a Sentadilla' }));
  });
});

describe('Workout · progreso', () => {
  it('el botón de progreso abre la hoja del ejercicio', async () => {
    const user = userEvent.setup();
    renderWorkout();
    await user.click(screen.getByRole('button', { name: 'Progreso de Sentadilla' }));
    const dialog = screen.getByRole('dialog', { name: 'Sentadilla' });
    expect(within(dialog).getByRole('group', { name: 'Periodo' })).toBeTruthy();
  });

  it('la hoja se cierra con Cerrar y con Escape', async () => {
    const user = userEvent.setup();
    renderWorkout();
    await user.click(screen.getByRole('button', { name: 'Progreso de Sentadilla' }));
    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Progreso de Sentadilla' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('abre con el foco en Cerrar', async () => {
    const user = userEvent.setup();
    renderWorkout();
    await user.click(screen.getByRole('button', { name: 'Progreso de Sentadilla' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar' }));
  });
});
