import { groupSteps } from './superset.js';

const pad = (n) => String(n).padStart(2, '0');

export const formatElapsed = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
};

export const isDone = (workout, step) => !!workout[step.exercise.id]?.[step.set]?.done;

export const countDone = (workout, exercise) =>
  Array.from({ length: exercise.sets }, (_, i) => i + 1).filter(set => workout[exercise.id]?.[set]?.done).length;

export const pendingStep = (group, workout) => groupSteps(group).find(step => !isDone(workout, step)) ?? null;

export const nextGroupIndex = (groups, workout, from) => {
  const order = [...groups.keys()].slice(from + 1).concat([...groups.keys()].slice(0, from + 1));
  return order.find(index => pendingStep(groups[index], workout)) ?? null;
};

export const positionText = (groups, index) => {
  const sizes = groups.map(group => group.exercises.length);
  const total = sizes.reduce((sum, size) => sum + size, 0);
  const first = sizes.slice(0, index).reduce((sum, size) => sum + size, 0) + 1;
  const last = first + sizes[index] - 1;
  if (first === last) return `${first} de ${total}`;
  return `${first} ${last - first === 1 ? 'y' : 'a'} ${last} de ${total}`;
};
