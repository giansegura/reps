import { describe, expect, it } from 'vitest';
import { appendSession, countSessions, latestSession } from './session.js';

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
