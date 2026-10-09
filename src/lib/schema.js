import { MAX_SETS } from './plan.js';
import { isValidPlansState } from './plans.js';

export const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

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
  && isString(plan.id)
  && isString(plan.name)
  && Array.isArray(plan.days)
  && plan.days.every(isValidDay);

export const isValidPlans = (state) => isValidPlansState(state) && state.plans.every(isValidPlan);

export const isValidSession = (session) =>
  isObject(session)
  && isString(session.dayId)
  && isString(session.date)
  && isObject(session.exercises)
  && (session.notes === undefined || (isObject(session.notes) && Object.values(session.notes).every(isString)));
