import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';

const storedPlans = () => JSON.parse(localStorage.getItem('reps-plans'));

beforeEach(() => {
  localStorage.clear();
});

describe('App · editar plan', () => {
  it('guarda el cambio de nombre en cuanto se escribe', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Editar plan' }));
    const input = screen.getByRole('textbox', { name: 'Nombre del plan' });
    await user.clear(input);
    await user.type(input, 'Torso');
    expect(storedPlans().plans[0].name).toBe('Torso');
  });
});

describe('App · datos dañados', () => {
  it('arranca aunque haya sesiones dañadas', async () => {
    localStorage.setItem('reps-sessions', '[null]');
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Editar plan' })).toBeTruthy();
  });

  it('arranca con el plan de ejemplo si los planes están dañados', async () => {
    localStorage.setItem('reps-plans', '{"activePlanId":"p1","plans":[{"id":"p1"}]}');
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Editar plan' })).toBeTruthy();
    expect(await screen.findByText(/datos dañados/)).toBeTruthy();
  });
});

describe('App · datos dañados sin espacio para la copia', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('muestra cómo rescatar los datos sin tocarlos', async () => {
    const data = new Map([['reps-sessions', '[null]']]);
    vi.stubGlobal('localStorage', {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => {
        if (key.endsWith('-corrupt')) throw new Error('QuotaExceededError');
        data.set(key, String(value));
      },
      removeItem: (key) => { data.delete(key); },
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><App /></ErrorBoundary>);
    expect(await screen.findByRole('button', { name: 'Descargar datos' })).toBeTruthy();
    expect(data.get('reps-sessions')).toBe('[null]');
  });
});

const fakeStorage = (initial, failingKey) => {
  const data = new Map(Object.entries(initial));
  return {
    data,
    storage: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => {
        if (key === failingKey) throw new Error('QuotaExceededError');
        data.set(key, String(value));
      },
      removeItem: (key) => { data.delete(key); },
      key: (index) => [...data.keys()][index] ?? null,
      get length() { return data.size; },
    },
  };
};

const daySession = (date, weight) => ({
  planId: 'plan1',
  dayId: 'day1',
  date,
  exercises: { squat: { 1: { weight, reps: '8', done: true } } },
  notes: {},
});

describe('App · versiones', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('con datos de una versión más nueva bloquea la app sin escribir nada', async () => {
    const { data, storage } = fakeStorage({ 'reps-version': '3', 'reps-plans': '{"formato":"nuevo"}' });
    vi.stubGlobal('localStorage', storage);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Actualiza Reps' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Descargar datos' })).toBeTruthy();
    expect(Object.fromEntries(data)).toEqual({ 'reps-version': '3', 'reps-plans': '{"formato":"nuevo"}' });
  });

  it('migra la versión 1 conservando todos los entrenos del mismo día', async () => {
    const legacy = [
      { dayId: 'day1', date: '2026-10-05T10:00:00.000Z', exercises: { squat: { 1: { weight: '62.5', reps: '8', done: true } } } },
      { dayId: 'day1', date: '2026-10-01T10:00:00.000Z', exercises: { squat: { 1: { weight: '60', reps: '8', done: true } } } },
    ];
    localStorage.setItem('reps-sessions', JSON.stringify(legacy));
    render(<App />);
    expect(await screen.findByText(/62,5 kg/)).toBeTruthy();
    expect(localStorage.getItem('reps-version')).toBe('2');
    const stored = JSON.parse(localStorage.getItem('reps-sessions'));
    expect(stored.map(s => s.date)).toEqual(['2026-10-01T10:00:00.000Z', '2026-10-05T10:00:00.000Z']);
    expect(stored.every(s => s.planId === 'plan1')).toBe(true);
  });

  it('no pierde el entreno si no se puede guardar', async () => {
    const { data, storage } = fakeStorage(
      { 'reps-version': '2', 'reps-sessions': JSON.stringify([daySession('2026-10-01T10:00:00.000Z', '60')]) },
      'reps-sessions',
    );
    vi.stubGlobal('localStorage', storage);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<App />);
    await user.click((await screen.findAllByRole('button', { name: /Día 1/ }))[0]);
    await user.click(screen.getByRole('button', { name: 'Marcar serie 1 de Sentadilla' }));
    await user.click(screen.getByRole('button', { name: /^Guardar entreno/ }));
    expect(await screen.findByText(/No se pudo guardar el entreno/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '← Salir' })).toBeTruthy();
    expect(data.get('reps-wip')).toBeTruthy();
    expect(JSON.parse(data.get('reps-sessions'))).toHaveLength(1);
  });
});

describe('App · tiempo total del entreno', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const storedWip = () => JSON.parse(localStorage.getItem('reps-wip'));

  it('guarda la hora de inicio al empezar y la mantiene al apuntar series', async () => {
    const user = userEvent.setup();
    const before = Date.now();
    render(<App />);
    await user.click((await screen.findAllByRole('button', { name: /Día 1/ }))[0]);
    const { startedAt } = storedWip();
    expect(startedAt).toBeGreaterThanOrEqual(before);
    await user.type(screen.getAllByRole('spinbutton', { name: /peso/ })[0], '60');
    expect(storedWip().startedAt).toBe(startedAt);
  });

  it('al retomar un entreno el total sigue contando desde la hora guardada', async () => {
    localStorage.setItem('reps-version', '2');
    localStorage.setItem('reps-sessions', '[]');
    localStorage.setItem('reps-wip', JSON.stringify({
      planId: 'plan1', dayId: 'day1', workout: {}, notes: {}, startedAt: Date.now() - 3_660_000,
    }));
    vi.stubGlobal('confirm', vi.fn(() => true));
    render(<App />);
    const total = await screen.findByRole('timer', { name: 'Tiempo total' });
    expect(total.textContent).toMatch(/^1:01:0\d$/);
  });
});

describe('App · descanso automático', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const rest = () => screen.getByRole('timer', { name: 'Descanso' }).textContent;
  const wait = (ms) => act(() => vi.advanceTimersByTime(ms));
  const firstSet = (name) => screen.getByRole('spinbutton', { name: new RegExp(`^Sentadilla, serie 1, ${name}`) });

  const startDay1 = async (user) => {
    render(<App />);
    await user.click((await screen.findAllByRole('button', { name: /Día 1/ }))[0]);
  };

  it('arranca al completar peso y repeticiones de una serie', async () => {
    const user = userEvent.setup();
    await startDay1(user);
    await user.type(firstSet('peso'), '60');
    wait(3000);
    expect(rest()).toBe('00:00');
    await user.type(firstSet('repeticiones'), '8');
    wait(3000);
    expect(rest()).toBe('00:03');
  });

  it('arranca al marcar una serie con el check', async () => {
    const user = userEvent.setup();
    await startDay1(user);
    await user.click(screen.getByRole('button', { name: 'Marcar serie 1 de Sentadilla' }));
    wait(4000);
    expect(rest()).toBe('00:04');
  });

  it('no se reinicia al corregir una serie ya hecha ni al desmarcarla', async () => {
    localStorage.setItem('reps-version', '2');
    localStorage.setItem('reps-sessions', JSON.stringify([daySession('2026-10-01T10:00:00.000Z', '60')]));
    const user = userEvent.setup();
    await startDay1(user);
    await user.click(screen.getByRole('button', { name: 'Marcar serie 1 de Sentadilla' }));
    wait(3000);
    expect(rest()).toBe('00:03');
    await user.type(firstSet('repeticiones'), '0');
    await user.click(screen.getByRole('button', { name: 'Marcar serie 1 de Sentadilla' }));
    wait(2000);
    expect(rest()).toBe('00:05');
  });
});

describe('App · series precargadas del último entreno', () => {
  const check = () => screen.getByRole('button', { name: 'Marcar serie 1 de Sentadilla' });
  const field = (name) => screen.getByRole('spinbutton', { name: new RegExp(`^Sentadilla, serie 1, ${name}`) });

  const startDay1WithHistory = async (user) => {
    localStorage.setItem('reps-version', '2');
    localStorage.setItem('reps-sessions', JSON.stringify([daySession('2026-10-01T10:00:00.000Z', '60')]));
    render(<App />);
    await user.click((await screen.findAllByRole('button', { name: /Día 1/ }))[0]);
  };

  it('llegan con peso y repeticiones rellenos pero sin marcar', async () => {
    const user = userEvent.setup();
    await startDay1WithHistory(user);
    expect(field('peso').value).toBe('60');
    expect(field('repeticiones').value).toBe('8');
    expect(check().getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: 'Guardar entreno, 0 de 15 series' }).disabled).toBe(true);
  });

  it('cambiar un valor precargado no marca la serie', async () => {
    const user = userEvent.setup();
    await startDay1WithHistory(user);
    await user.type(field('peso'), '5');
    expect(field('peso').value).toBe('605');
    expect(check().getAttribute('aria-pressed')).toBe('false');
  });

  it('vaciar un valor y volver a rellenarlo sí la marca', async () => {
    const user = userEvent.setup();
    await startDay1WithHistory(user);
    await user.clear(field('repeticiones'));
    expect(check().getAttribute('aria-pressed')).toBe('false');
    await user.type(field('repeticiones'), '8');
    expect(check().getAttribute('aria-pressed')).toBe('true');
  });
});

describe('App · progreso', () => {
  it('abre Progreso desde el inicio y conserva el periodo elegido', async () => {
    localStorage.setItem('reps-version', '2');
    localStorage.setItem('reps-sessions', JSON.stringify([daySession(new Date().toISOString(), '60')]));
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Progreso' }));
    expect(screen.getByRole('combobox', { name: 'Ejercicio' }).value).toBe('day1:squat');
    await user.click(screen.getByRole('button', { name: 'Mes' }));
    await user.click(screen.getByRole('button', { name: '← Inicio' }));
    await user.click(screen.getByRole('button', { name: 'Progreso' }));
    expect(screen.getByRole('button', { name: 'Mes' }).getAttribute('aria-pressed')).toBe('true');
  });
});

describe('App · progreso en el entreno', () => {
  it('cerrar la hoja conserva el entreno', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click((await screen.findAllByRole('button', { name: /Día 1/ }))[0]);
    const weight = () => screen.getByRole('spinbutton', { name: /^Sentadilla, serie 1, peso/ });
    await user.type(weight(), '60');
    await user.click(screen.getByRole('button', { name: 'Progreso de Sentadilla' }));
    expect(screen.getByRole('dialog', { name: 'Sentadilla' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(weight().value).toBe('60');
    expect(screen.getByRole('button', { name: '← Salir' })).toBeTruthy();
  });
});

describe('App · exportar historial para IA', () => {
  const session = {
    planId: 'plan1',
    dayId: 'day1',
    date: new Date(2026, 2, 1, 10, 15).toISOString(),
    exercises: { squat: { 1: { weight: '60', reps: '8', done: true } } },
    notes: {},
  };

  const openPlans = async (user) => {
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /Full Body/ }));
    return screen.getByRole('button', { name: 'Exportar historial para IA' });
  };

  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('avisa si aún no hay entrenos y no genera archivo', async () => {
    const user = userEvent.setup();
    await user.click(await openPlans(user));
    expect(await screen.findByText('Aún no hay entrenos que exportar')).toBeTruthy();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('genera un archivo markdown con el historial', async () => {
    localStorage.setItem('reps-version', '2');
    localStorage.setItem('reps-sessions', JSON.stringify([session]));
    const user = userEvent.setup();
    await user.click(await openPlans(user));
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    const file = URL.createObjectURL.mock.calls[0][0];
    expect(file.name).toMatch(/^reps-historial-\d{4}-\d{2}-\d{2}\.md$/);
    expect(file.type).toBe('text/markdown');
    const text = await file.text();
    expect(text).toContain('# Historial de entrenamientos · Reps');
    expect(text).toContain('### 2026-03-01 · domingo 10:15 · Full Body › Día 1\n- Sentadilla: 60 kg × 8\n');
  });
});
