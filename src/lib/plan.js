export const PALETTE = [
  '#22c55e', '#eab308', '#f97316', '#3b82f6',
  '#a855f7', '#ec4899', '#14b8a6', '#ef4444',
];

const nextColor = (plan) => {
  const used = new Set(plan.map(d => d.color));
  return PALETTE.find(c => !used.has(c)) || PALETTE[plan.length % PALETTE.length];
};

const nextDayLabel = (plan) => `Día ${plan.length + 1}`;

export const createDay = (plan) => ({
  id: crypto.randomUUID(),
  label: nextDayLabel(plan),
  color: nextColor(plan),
  exercises: [],
});

export const createExercise = () => ({
  id: crypto.randomUUID(),
  name: '',
  sets: 3,
  reps: '',
  allowBW: false,
  notes: '',
});

export const addDay = (plan, day) => [...plan, day];

export const removeDay = (plan, dayId) => plan.filter(d => d.id !== dayId);

export const updateDay = (plan, dayId, patch) =>
  plan.map(d => (d.id === dayId ? { ...d, ...patch } : d));

const move = (list, index, delta) => {
  const target = index + delta;
  if (index < 0 || target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

export const moveDay = (plan, dayId, delta) =>
  move(plan, plan.findIndex(d => d.id === dayId), delta);

const mapExercises = (plan, dayId, fn) =>
  plan.map(d => (d.id === dayId ? { ...d, exercises: fn(d.exercises) } : d));

export const addExercise = (plan, dayId, exercise) =>
  mapExercises(plan, dayId, list => [...list, exercise]);

export const removeExercise = (plan, dayId, exId) =>
  mapExercises(plan, dayId, list => list.filter(e => e.id !== exId));

export const updateExercise = (plan, dayId, exId, patch) =>
  mapExercises(plan, dayId, list =>
    list.map(e => (e.id === exId ? { ...e, ...patch } : e)));

export const moveExercise = (plan, dayId, exId, delta) =>
  mapExercises(plan, dayId, list =>
    move(list, list.findIndex(e => e.id === exId), delta));
