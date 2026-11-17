import { restOf } from './plan.js';

const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const labelOf = (exercise) => (typeof exercise.superset === 'string' ? exercise.superset.trim() : '');

const withoutSuperset = (exercise) =>
  Object.fromEntries(Object.entries(exercise).filter(([key]) => key !== 'superset'));

export const groupExercises = (exercises) => exercises
  .reduce((groups, exercise) => {
    const label = labelOf(exercise);
    const last = groups.at(-1);
    if (label && last?.label === label) {
      return [...groups.slice(0, -1), { label, exercises: [...last.exercises, exercise] }];
    }
    return [...groups, { label, exercises: [exercise] }];
  }, [])
  .map(group => ({ superset: group.exercises.length > 1, exercises: group.exercises }));

const groupOf = (exercises, exerciseId) =>
  groupExercises(exercises).find(group => group.exercises.some(e => e.id === exerciseId));

export const supersetPartners = (exercises, exerciseId) => {
  const group = groupOf(exercises, exerciseId);
  return group?.superset ? group.exercises.filter(e => e.id !== exerciseId) : [];
};

export const groupSteps = (group) => {
  const rounds = Math.max(...group.exercises.map(e => e.sets));
  return Array.from({ length: rounds }, (_, i) => i + 1)
    .flatMap(set => group.exercises.filter(e => e.sets >= set).map(exercise => ({ exercise, set })));
};

export const restAfterStep = (group, step, workout) => {
  if (!group.superset) return restOf(step.exercise);
  const round = group.exercises.filter(e => e.sets >= step.set);
  const done = (e) => e.id === step.exercise.id || !!workout?.[e.id]?.[step.set]?.done;
  return round.every(done) ? restOf(round.at(-1)) : null;
};

const freeLabel = (exercises) => {
  const used = new Set(exercises.map(labelOf));
  return LABELS.find(label => !used.has(label)) ?? crypto.randomUUID().slice(0, 8);
};

const insertAfter = (list, index, item) => [...list.slice(0, index + 1), item, ...list.slice(index + 1)];

export const unlinkSuperset = (exercises, exerciseId) => {
  const group = groupOf(exercises, exerciseId);
  if (!group?.superset) {
    return exercises.map(e => (e.id === exerciseId ? withoutSuperset(e) : e));
  }
  const remaining = group.exercises.filter(e => e.id !== exerciseId);
  const alone = remaining.length === 1 ? remaining[0].id : null;
  const target = withoutSuperset(group.exercises.find(e => e.id === exerciseId));
  const rest = exercises
    .filter(e => e.id !== exerciseId)
    .map(e => (e.id === alone ? withoutSuperset(e) : e));
  return insertAfter(rest, rest.findIndex(e => e.id === remaining.at(-1).id), target);
};

const withoutLoneLabels = (exercises) => groupExercises(exercises)
  .flatMap(group => (group.superset ? group.exercises : group.exercises.map(withoutSuperset)));

const swap = (list, a, b) => {
  const next = [...list];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
};

const keepApart = (groups) => groups.reduce((placed, list) => {
  const prev = placed.at(-1);
  const clash = !!prev && prev.length > 1 && list.length > 1 && labelOf(prev[0]) === labelOf(list[0]);
  if (!clash) return [...placed, list];
  const label = freeLabel([...placed.flat(), ...groups.flat()]);
  return [...placed, list.map(e => ({ ...e, superset: label }))];
}, []);

export const moveExercise = (exercises, exerciseId, delta) => {
  const groups = groupExercises(withoutLoneLabels(exercises)).map(group => group.exercises);
  const g = groups.findIndex(list => list.some(e => e.id === exerciseId));
  if (g === -1) return exercises;
  const i = groups[g].findIndex(e => e.id === exerciseId);
  if (groups[g].length > 1 && i + delta >= 0 && i + delta < groups[g].length) {
    groups[g] = swap(groups[g], i, i + delta);
  } else if (g + delta >= 0 && g + delta < groups.length) {
    [groups[g], groups[g + delta]] = [groups[g + delta], groups[g]];
  } else {
    return exercises;
  }
  return keepApart(groups).flat();
};

export const linkSuperset = (exercises, exerciseId, partnerId) => {
  if (exerciseId === partnerId) return exercises;
  if (!exercises.some(e => e.id === exerciseId) || !exercises.some(e => e.id === partnerId)) return exercises;
  const unlinked = unlinkSuperset(exercises, exerciseId);
  const moving = unlinked.find(e => e.id === exerciseId);
  const rest = unlinked.filter(e => e.id !== exerciseId);
  const partnerGroup = groupOf(rest, partnerId);
  const label = partnerGroup.superset ? labelOf(partnerGroup.exercises[0]) : freeLabel(rest);
  const labelled = rest.map(e => (e.id === partnerId ? { ...e, superset: label } : e));
  const lastOfGroup = partnerGroup.exercises.at(-1).id;
  return insertAfter(labelled, labelled.findIndex(e => e.id === lastOfGroup), { ...moving, superset: label });
};
