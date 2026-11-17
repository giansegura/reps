import { describe, expect, it } from 'vitest';
import { appendSession, countSessions, latestExerciseEntry, latestSession } from './session.js';

const s = (planId, dayId, date) => ({ planId, dayId, date, exercises: {}, notes: {} });

const history = [
  s('p1', 'd1', '2026-10-03T10:00:00.000Z'),
  s('p1', 'd1', '2026-10-05T10:00:00.000Z'),
  s('p1', 'd1', '2026-10-04T10:00:00.000Z'),
  s('p2', 'd1', '2026-10-09T10:00:00.000Z'),
  s('p1', 'd2', '2026-10-08T10:00:00.000Z'),
];

describe('appendSession', () => {
  it('añade al final sin tocar el array original', () => {
    const session = s('p1', 'd1', '2026-10-10T10:00:00.000Z');
    const next = appendSession(history, session);
    expect(next).toHaveLength(history.length + 1);
    expect(next.at(-1)).toBe(session);
    expect(history).toHaveLength(5);
  });
});

describe('latestSession', () => {
  it('devuelve el más reciente de ese plan y día aunque no sea el último del array', () => {
    expect(latestSession(history, 'p1', 'd1').date).toBe('2026-10-05T10:00:00.000Z');
  });

  it('devuelve undefined si no hay entrenos de ese día', () => {
    expect(latestSession(history, 'p1', 'd9')).toBeUndefined();
    expect(latestSession([], 'p1', 'd1')).toBeUndefined();
  });
});

describe('countSessions', () => {
  it('cuenta por plan, por día o por ambos', () => {
    expect(countSessions(history, { planId: 'p1' })).toBe(4);
    expect(countSessions(history, { dayId: 'd1' })).toBe(4);
    expect(countSessions(history, { planId: 'p1', dayId: 'd1' })).toBe(3);
    expect(countSessions(history, { planId: 'p3' })).toBe(0);
  });
});

describe('latestExerciseEntry', () => {
  const withSets = (planId, dayId, date, exercises, notes = {}) => ({ planId, dayId, date, exercises, notes });
  const set = (weight, reps) => ({ weight, reps, done: true });

  const log = [
    withSets('p1', 'd1', '2026-10-01T10:00:00.000Z', { e1: { 1: set('60', '8') } }, { e1: 'lento' }),
    withSets('p1', 'd2', '2026-10-05T10:00:00.000Z', { e1: { 1: set('65', '8') } }),
    withSets('p1', 'd1', '2026-10-07T10:00:00.000Z', { e1: { 1: { weight: '', reps: '', done: false } }, e2: { 1: set('20', '10') } }),
    withSets('p2', 'd1', '2026-10-09T10:00:00.000Z', { e1: { 1: set('99', '8') } }),
  ];

  it('busca el ejercicio en cualquier día del plan', () => {
    const entry = latestExerciseEntry(log, 'p1', 'e1');
    expect(entry.date).toBe('2026-10-05T10:00:00.000Z');
    expect(entry.sets[1].weight).toBe('65');
  });

  it('trae la nota de ese entreno', () => {
    expect(latestExerciseEntry(log.slice(0, 1), 'p1', 'e1').note).toBe('lento');
  });

  it('salta los entrenos donde el ejercicio quedó vacío', () => {
    expect(latestExerciseEntry(log, 'p1', 'e2').sets[1].weight).toBe('20');
    expect(latestExerciseEntry([log[2]], 'p1', 'e1')).toBeNull();
  });

  it('puede pedir solo entrenos donde el ejercicio se hizo de verdad', () => {
    const skipped = withSets('p1', 'd1', '2026-10-10T10:00:00.000Z', { e1: { 1: { weight: '65', reps: '8', done: false } } });
    expect(latestExerciseEntry([...log, skipped], 'p1', 'e1').date).toBe(skipped.date);
    expect(latestExerciseEntry([...log, skipped], 'p1', 'e1', { onlyDone: true }).date).toBe('2026-10-05T10:00:00.000Z');
  });

  it('devuelve null si nunca se ha hecho', () => {
    expect(latestExerciseEntry(log, 'p1', 'zz')).toBeNull();
    expect(latestExerciseEntry([], 'p1', 'e1')).toBeNull();
  });
});
