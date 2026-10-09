import { describe, expect, it } from 'vitest';
import { backupFileName, createBackup, parseBackup } from './backup.js';

const plans = {
  activePlanId: 'p1',
  plans: [{
    id: 'p1',
    name: 'Full Body',
    days: [{ id: 'd1', label: 'Día 1', color: '#22c55e', exercises: [{ id: 'e1', name: 'Sentadilla', sets: 3, reps: '8' }] }],
  }],
};

const sessions = [{
  planId: 'p1',
  dayId: 'd1',
  date: '2026-10-01T10:00:00.000Z',
  exercises: { e1: { 1: { weight: '60', reps: '8', done: true } } },
  notes: {},
}];

const now = new Date(2026, 9, 9, 0, 30);

const toText = (overrides = {}) =>
  JSON.stringify({ ...createBackup(plans, sessions, now), ...overrides });

const withDay = (patch) => {
  const day = { ...plans.plans[0].days[0], ...patch };
  return toText({ plans: { ...plans, plans: [{ ...plans.plans[0], days: [day] }] } });
};

const withExercise = (patch) =>
  withDay({ exercises: [{ ...plans.plans[0].days[0].exercises[0], ...patch }] });

describe('createBackup', () => {
  it('envuelve planes y sesiones con app, version y fecha', () => {
    expect(createBackup(plans, sessions, now)).toEqual({
      app: 'reps',
      version: 1,
      exportedAt: now.toISOString(),
      plans,
      sessions,
    });
  });
});

describe('backupFileName', () => {
  it('usa la fecha local', () => {
    expect(backupFileName(now)).toBe('reps-2026-10-09.json');
  });
});

describe('parseBackup', () => {
  it('acepta una copia válida', () => {
    expect(parseBackup(toText())).toEqual({ ok: true, plans, sessions });
  });

  it('acepta ejercicios con notas y días con title', () => {
    expect(parseBackup(withExercise({ notes: 'Codos pegados', allowBW: true })).ok).toBe(true);
    expect(parseBackup(withDay({ title: 'Pierna' })).ok).toBe(true);
  });

  it('acepta sesiones con notas de texto', () => {
    const withNotes = [{ ...sessions[0], notes: { e1: 'Subir peso' } }];
    expect(parseBackup(toText({ sessions: withNotes })).ok).toBe(true);
  });

  it('acepta sesiones sin planId ni notes', () => {
    const legacy = [{ dayId: 'd1', date: '2026-10-01T10:00:00.000Z', exercises: {} }];
    expect(parseBackup(toText({ sessions: legacy })).ok).toBe(true);
  });

  it('usa el primer plan si activePlanId no existe', () => {
    const result = parseBackup(toText({ plans: { ...plans, activePlanId: 'nope' } }));
    expect(result.ok).toBe(true);
    expect(result.plans.activePlanId).toBe('p1');
  });

  it.each([
    ['JSON inválido', 'no es json'],
    ['null', 'null'],
    ['un array', '[]'],
    ['otra app', toText({ app: 'otra' })],
    ['otra versión', toText({ version: 2 })],
    ['sin planes', toText({ plans: { activePlanId: 'p1', plans: [] } })],
    ['sessions no array', toText({ sessions: {} })],
    ['plan sin days', toText({ plans: { activePlanId: 'p1', plans: [{ id: 'p1', name: 'X' }] } })],
    ['plan sin nombre', toText({ plans: { activePlanId: 'p1', plans: [{ id: 'p1', days: [] }] } })],
    ['día sin exercises', toText({ plans: { activePlanId: 'p1', plans: [{ id: 'p1', name: 'X', days: [{ id: 'd1', label: 'D' }] }] } })],
    ['ejercicio sin id', toText({ plans: { activePlanId: 'p1', plans: [{ id: 'p1', name: 'X', days: [{ id: 'd1', label: 'D', exercises: [{ name: 'S' }] }] }] } })],
    ['sesión sin dayId', toText({ sessions: [{ date: 'x', exercises: {} }] })],
    ['sesión con exercises no objeto', toText({ sessions: [{ dayId: 'd1', date: 'x', exercises: null }] })],
    ['sesión null', toText({ sessions: [null] })],
    ['nombre de ejercicio no texto', withExercise({ name: {} })],
    ['reps no texto', withExercise({ reps: {} })],
    ['sets no entero', withExercise({ sets: 'tres' })],
    ['sets desmesurado', withExercise({ sets: 1e9 })],
    ['sets cero', withExercise({ sets: 0 })],
    ['notas de ejercicio no texto', withExercise({ notes: 5 })],
    ['etiqueta de día no texto', withDay({ label: {} })],
    ['color de día no texto', withDay({ color: 5 })],
    ['notas de sesión no objeto', toText({ sessions: [{ ...sessions[0], notes: 'x' }] })],
    ['nota de sesión no texto', toText({ sessions: [{ ...sessions[0], notes: { e1: {} } }] })],
  ])('rechaza %s', (_label, text) => {
    expect(parseBackup(text)).toEqual({ ok: false });
  });
});
