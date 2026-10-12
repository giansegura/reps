import { DEFAULT_PLANS } from '../data/plan.js';
import { findPlanByDay, getActivePlan } from './plans.js';

export const CURRENT_VERSION = 2;

export class NewerVersionError extends Error {
  constructor(version) {
    super(`Los datos son de la versión ${version} y Reps solo conoce hasta la ${CURRENT_VERSION}`);
    this.name = 'NewerVersionError';
  }
}

const byDate = (a, b) => {
  if (a.date < b.date) return -1;
  if (a.date > b.date) return 1;
  return 0;
};

const migrate1to2 = ({ plans, sessions }) => {
  const lookup = plans ?? DEFAULT_PLANS;
  const activePlanId = getActivePlan(lookup).id;
  return {
    plans,
    sessions: sessions
      .map(s => ({
        planId: s.planId || findPlanByDay(lookup, s.dayId)?.id || activePlanId,
        dayId: s.dayId,
        date: s.date,
        exercises: s.exercises,
        notes: s.notes || {},
      }))
      .sort(byDate),
  };
};

const MIGRATIONS = { 1: migrate1to2 };

export const migrate = (data, fromVersion) => {
  if (fromVersion > CURRENT_VERSION) throw new NewerVersionError(fromVersion);
  let result = data;
  for (let version = fromVersion; version < CURRENT_VERSION; version++) {
    result = MIGRATIONS[version](result);
  }
  return result;
};
