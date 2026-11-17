import { groupSteps } from './superset.js';

const SMALL_STEP = 1;
const BIG_STEP = 2.5;
const BIG_STEP_FROM = 20;

const pad = (n) => String(n).padStart(2, '0');

export const formatElapsed = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
};

const toNumber = (value) => parseFloat(String(value ?? '').replace(',', '.'));

const weightStep = (current, direction) => {
  if (direction > 0) return current < BIG_STEP_FROM ? SMALL_STEP : BIG_STEP;
  return current <= BIG_STEP_FROM ? SMALL_STEP : BIG_STEP;
};

export const stepWeight = (value, direction) => {
  const parsed = toNumber(value);
  const current = Number.isNaN(parsed) ? 0 : parsed;
  const next = Math.max(0, current + direction * weightStep(current, direction));
  return next === 0 ? '' : String(Math.round(next * 100) / 100);
};

export const stepReps = (value, direction) => {
  const parsed = parseInt(value, 10);
  const next = Math.max(0, (Number.isNaN(parsed) ? 0 : parsed) + direction);
  return next === 0 ? '' : String(next);
};

export const isDone = (workout, step) => !!workout[step.exercise.id]?.[step.set]?.done;

export const countDone = (workout, exercise) =>
  Array.from({ length: exercise.sets }, (_, i) => i + 1).filter(set => workout[exercise.id]?.[set]?.done).length;

export const pendingStep = (group, workout) => groupSteps(group).find(step => !isDone(workout, step)) ?? null;

export const nextGroupIndex = (groups, workout, from) => {
  const order = [...groups.keys()].slice(from + 1).concat([...groups.keys()].slice(0, from + 1));
  return order.find(index => pendingStep(groups[index], workout)) ?? null;
};
