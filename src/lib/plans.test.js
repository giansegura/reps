import { describe, expect, it } from 'vitest';
import { duplicatePlan, removePlan, replacePlan, withFreshIds } from './plans.js';

const state = {
  activePlanId: 'p1',
  plans: [{ id: 'p1', name: 'A', days: [] }, { id: 'p2', name: 'B', days: [] }],
};

describe('removePlan', () => {
  it('activa otro plan si se borra el activo', () => {
    expect(removePlan(state, 'p1')).toEqual({ activePlanId: 'p2', plans: [state.plans[1]] });
  });

  it('no borra el último plan', () => {
    const single = { activePlanId: 'p1', plans: [state.plans[0]] };
    expect(removePlan(single, 'p1')).toBe(single);
  });
});

const full = {
  id: 'p1',
  name: 'Full Body',
  days: [
    { id: 'd1', label: 'Día 1', color: '#22c55e', exercises: [{ id: 'e1', name: 'Sentadilla', sets: 3, reps: '8', allowBW: false, notes: '' }] },
    { id: 'd2', label: 'Día 2', color: '#eab308', exercises: [{ id: 'e2', name: 'Remo', sets: 4, reps: '10', allowBW: true, notes: 'Lento' }] },
  ],
};

const allIds = (plan) => [plan.id, ...plan.days.flatMap(d => [d.id, ...d.exercises.map(e => e.id)])];

describe('withFreshIds', () => {
  it('cambia todos los ids y conserva el resto', () => {
    const fresh = withFreshIds(full);
    const ids = allIds(fresh);
    expect(ids.some(id => allIds(full).includes(id))).toBe(false);
    expect(new Set(ids).size).toBe(ids.length);
    const strip = (plan) => ({ ...plan, id: '', days: plan.days.map(d => ({ ...d, id: '', exercises: d.exercises.map(e => ({ ...e, id: '' })) })) });
    expect(strip(fresh)).toEqual(strip(full));
  });
});

describe('duplicatePlan', () => {
  it('copia el plan con ids nuevos y «(copia)» en el nombre', () => {
    const copy = duplicatePlan(full);
    expect(copy.name).toBe('Full Body (copia)');
    expect(allIds(copy).some(id => allIds(full).includes(id))).toBe(false);
    expect(copy.days.map(d => d.label)).toEqual(['Día 1', 'Día 2']);
    expect(copy.days[1].exercises[0]).toMatchObject({ name: 'Remo', sets: 4, reps: '10', allowBW: true, notes: 'Lento' });
  });
});

describe('replacePlan', () => {
  it('sustituye solo el plan con ese id y conserva el activo', () => {
    const next = { id: 'p2', name: 'B2', days: [] };
    expect(replacePlan(state, next)).toEqual({ activePlanId: 'p1', plans: [state.plans[0], next] });
  });
});
