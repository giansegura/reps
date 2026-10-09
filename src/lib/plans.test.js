import { describe, expect, it } from 'vitest';
import { removePlan } from './plans.js';

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
