import { describe, expect, it } from 'vitest';
import { CURRENT_VERSION, NewerVersionError, migrate } from './migrate.js';

const plans = {
  activePlanId: 'p2',
  plans: [
    { id: 'p1', name: 'A', days: [{ id: 'd1', label: 'Día 1', color: '#000000', exercises: [] }] },
    { id: 'p2', name: 'B', days: [{ id: 'd2', label: 'Día 2', color: '#000000', exercises: [] }] },
  ],
};

const legacy = (patch) => ({ dayId: 'd1', date: '2026-10-01T10:00:00.000Z', exercises: {}, ...patch });

describe('migrate', () => {
  it('la versión actual es la 2', () => {
    expect(CURRENT_VERSION).toBe(2);
  });

  it('1→2 asigna el plan del día, el plan activo o conserva el que tenga', () => {
    const sessions = [legacy({}), legacy({ dayId: 'huérfano' }), legacy({ planId: 'p9' })];
    expect(migrate({ plans, sessions }, 1).sessions.map(s => s.planId)).toEqual(['p1', 'p2', 'p9']);
  });

  it('1→2 rellena notes vacías y conserva las existentes', () => {
    const sessions = [legacy({}), legacy({ notes: { e1: 'codos' } })];
    expect(migrate({ plans, sessions }, 1).sessions.map(s => s.notes)).toEqual([{}, { e1: 'codos' }]);
  });

  it('1→2 conserva todos los entrenos del mismo día y los ordena por fecha', () => {
    const sessions = [
      legacy({ date: '2026-10-03T10:00:00.000Z' }),
      legacy({ date: '2026-10-01T10:00:00.000Z' }),
      legacy({ date: '2026-10-02T10:00:00.000Z' }),
    ];
    expect(migrate({ plans, sessions }, 1).sessions.map(s => s.date)).toEqual([
      '2026-10-01T10:00:00.000Z',
      '2026-10-02T10:00:00.000Z',
      '2026-10-03T10:00:00.000Z',
    ]);
  });

  it('1→2 sin planes busca en los planes por defecto y no los devuelve', () => {
    const result = migrate({ plans: null, sessions: [legacy({ dayId: 'day2' })] }, 1);
    expect(result.plans).toBeNull();
    expect(result.sessions[0].planId).toBe('plan1');
  });

  it('1→2 no modifica la entrada', () => {
    const sessions = [legacy({ date: '2026-10-03T10:00:00.000Z' }), legacy({})];
    const copy = structuredClone(sessions);
    migrate({ plans, sessions }, 1);
    expect(sessions).toEqual(copy);
  });

  it('aplicar 1→2 sobre datos ya migrados no cambia nada', () => {
    const once = migrate({ plans, sessions: [legacy({}), legacy({ dayId: 'd2' })] }, 1);
    expect(migrate(once, 1)).toEqual(once);
  });

  it('devuelve los mismos datos si ya están en la versión actual', () => {
    const data = { plans, sessions: [legacy({ planId: 'p1', notes: {} })] };
    expect(migrate(data, 2)).toBe(data);
  });

  it('lanza con versiones más nuevas', () => {
    expect(() => migrate({ plans, sessions: [] }, 3)).toThrow(NewerVersionError);
  });
});
