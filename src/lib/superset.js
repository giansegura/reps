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

export const restAfterStep = (group, step) => {
  const steps = groupSteps(group);
  const index = steps.findIndex(s => s.exercise.id === step.exercise.id && s.set === step.set);
  const next = steps[index + 1];
  return group.superset && next?.set === step.set ? null : restOf(step.exercise);
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
