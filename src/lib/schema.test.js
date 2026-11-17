import { describe, expect, it } from 'vitest';
import { DEFAULT_PLANS } from '../data/plan.js';
import { isValidPlans } from './schema.js';

describe('isValidPlans', () => {
  it('acepta el plan de ejemplo', () => {
    expect(isValidPlans(DEFAULT_PLANS)).toBe(true);
  });
});

describe('isValidPlans · descanso y superserie', () => {
  const withExercise = (patch) => ({
    activePlanId: 'p1',
    plans: [{
      id: 'p1',
      name: 'Plan',
      days: [{ id: 'd1', label: 'Día', color: '#000000', exercises: [{ id: 'e1', name: 'Curl', sets: 3, reps: '12', ...patch }] }],
    }],
  });

  it('acepta descanso en segundos y etiqueta de superserie', () => {
    expect(isValidPlans(withExercise({ rest: 60, superset: 'A' }))).toBe(true);
  });

  it.each([
    ['descanso fuera de rango', { rest: 5 }],
    ['descanso con decimales', { rest: 60.5 }],
    ['descanso como texto', { rest: '60' }],
    ['superserie que no es texto', { superset: 1 }],
  ])('rechaza %s', (_label, patch) => {
    expect(isValidPlans(withExercise(patch))).toBe(false);
  });
});
