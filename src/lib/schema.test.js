import { describe, expect, it } from 'vitest';
import { DEFAULT_PLANS } from '../data/plan.js';
import { isValidPlans } from './schema.js';

describe('isValidPlans', () => {
  it('acepta el plan de ejemplo', () => {
    expect(isValidPlans(DEFAULT_PLANS)).toBe(true);
  });
});
