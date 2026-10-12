import { render, screen } from '@testing-library/react';
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
    await user.click(screen.getByRole('button', { name: /^Guardar entreno/ }));
    expect(await screen.findByText(/No se pudo guardar el entreno/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '← Salir' })).toBeTruthy();
    expect(data.get('reps-wip')).toBeTruthy();
    expect(JSON.parse(data.get('reps-sessions'))).toHaveLength(1);
  });
});
