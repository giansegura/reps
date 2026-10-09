import { isValidPlansState } from './plans.js';

const APP = 'reps';
const VERSION = 1;

const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

const MAX_SETS = 100;

const isString = (value) => typeof value === 'string';

const isOptionalString = (value) => value === undefined || isString(value);

const isValidSets = (sets) => Number.isInteger(sets) && sets >= 1 && sets <= MAX_SETS;

const isValidExercise = (ex) =>
  isObject(ex)
  && isString(ex.id)
  && isString(ex.name)
  && isString(ex.reps)
  && isValidSets(ex.sets)
  && isOptionalString(ex.notes);

const isValidDay = (day) =>
  isObject(day)
  && isString(day.id)
  && isString(day.label)
  && isString(day.color)
  && Array.isArray(day.exercises)
  && day.exercises.every(isValidExercise);

const isValidPlan = (plan) =>
  isObject(plan)
  && typeof plan.id === 'string'
  && typeof plan.name === 'string'
  && Array.isArray(plan.days)
  && plan.days.every(isValidDay);

const isValidSession = (session) =>
  isObject(session)
  && typeof session.dayId === 'string'
  && typeof session.date === 'string'
  && isObject(session.exercises)
  && (session.notes === undefined || (isObject(session.notes) && Object.values(session.notes).every(isString)));

const withExistingActivePlan = (state) =>
  state.plans.some(p => p.id === state.activePlanId)
    ? state
    : { ...state, activePlanId: state.plans[0].id };

const pad = (n) => String(n).padStart(2, '0');

export const createBackup = (plansState, sessions, now) => ({
  app: APP,
  version: VERSION,
  exportedAt: now.toISOString(),
  plans: plansState,
  sessions,
});

export const backupFileName = (now) =>
  `reps-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;

export const parseBackup = (text) => {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false };
  }
  if (!isObject(data) || data.app !== APP || data.version !== VERSION) return { ok: false };
  if (!isValidPlansState(data.plans) || !data.plans.plans.every(isValidPlan)) return { ok: false };
  if (!Array.isArray(data.sessions) || !data.sessions.every(isValidSession)) return { ok: false };
  return { ok: true, plans: withExistingActivePlan(data.plans), sessions: data.sessions };
};
