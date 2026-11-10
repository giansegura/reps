const exerciseIds = (plan) => plan.days.flatMap(d => d.exercises.map(e => e.id));

const sharesIds = (plan, incoming) => {
  const known = new Set([...plan.days.map(d => d.id), ...exerciseIds(plan)]);
  return incoming.days.some(d => known.has(d.id) || d.exercises.some(e => known.has(e.id)));
};

export const resolveImportTarget = (state, openPlanId, incoming) => {
  if (incoming.id === openPlanId) return { kind: 'same' };
  const other = state.plans.find(p => p.id === incoming.id);
  if (other) return { kind: 'other', name: other.name };
  const open = state.plans.find(p => p.id === openPlanId);
  return open && sharesIds(open, incoming) ? { kind: 'same' } : { kind: 'new' };
};

const resolveDayIds = (current, incoming) => {
  const available = new Set(current.days.map(d => d.id));
  return incoming.days.map(d => {
    if (!available.has(d.id)) return crypto.randomUUID();
    available.delete(d.id);
    return d.id;
  });
};

const exerciseWinners = (current, incoming, dayIds) => {
  const dayOf = new Map(current.days.flatMap(d => d.exercises.map(e => [e.id, d.id])));
  const occurrences = new Map();
  incoming.days.forEach((d, dayIndex) => d.exercises.forEach((e, exIndex) => {
    if (!dayOf.has(e.id)) return;
    const list = occurrences.get(e.id) ?? [];
    list.push({ dayIndex, exIndex });
    occurrences.set(e.id, list);
  }));
  const winners = new Set();
  occurrences.forEach((list, id) => {
    const winner = list.find(o => dayIds[o.dayIndex] === dayOf.get(id)) ?? list[0];
    winners.add(`${winner.dayIndex}:${winner.exIndex}`);
  });
  return winners;
};

export const reconcilePlan = (current, incoming) => {
  const dayIds = resolveDayIds(current, incoming);
  const winners = exerciseWinners(current, incoming, dayIds);
  return {
    id: current.id,
    name: incoming.name,
    days: incoming.days.map((d, dayIndex) => ({
      ...d,
      id: dayIds[dayIndex],
      exercises: d.exercises.map((e, exIndex) => ({
        ...e,
        id: winners.has(`${dayIndex}:${exIndex}`) ? e.id : crypto.randomUUID(),
      })),
    })),
  };
};

const exerciseFields = (before, after) => [
  before.name !== after.name && 'name',
  (before.sets !== after.sets || before.reps !== after.reps) && 'volume',
  !!before.allowBW !== !!after.allowBW && 'allowBW',
  (before.notes ?? '') !== (after.notes ?? '') && 'notes',
].filter(Boolean);

const orderChanged = (beforeIds, afterIds) => {
  const common = new Set(afterIds.filter(id => beforeIds.includes(id)));
  const after = afterIds.filter(id => common.has(id));
  return beforeIds.filter(id => common.has(id)).some((id, i) => id !== after[i]);
};

const dayEntry = (day, status) => ({
  id: day.id,
  label: day.label,
  status,
  renamedFrom: null,
  reordered: false,
  added: [],
  removed: [],
  changed: [],
});

const hasDayChanges = (d) =>
  d.status !== 'kept' || d.renamedFrom !== null || d.reordered || d.added.length > 0 || d.removed.length > 0 || d.changed.length > 0;

export const diffPlans = (current, next) => {
  const currentDays = new Map(current.days.map(d => [d.id, d]));
  const nextDayIds = new Set(next.days.map(d => d.id));
  const before = new Map(current.days.flatMap(d => d.exercises.map(e => [e.id, { exercise: e, day: d }])));
  const nextExerciseIds = new Set(exerciseIds(next));
  const gone = (day) => day.exercises.filter(e => !nextExerciseIds.has(e.id));
  let unchanged = 0;

  const nextEntries = next.days.map(d => {
    const old = currentDays.get(d.id);
    const entry = old
      ? {
        ...dayEntry(d, 'kept'),
        renamedFrom: old.label !== d.label ? old.label : null,
        reordered: orderChanged(old.exercises.map(e => e.id), d.exercises.map(e => e.id)),
        removed: gone(old),
      }
      : dayEntry(d, 'added');
    d.exercises.forEach(e => {
      const prev = before.get(e.id);
      if (!prev) {
        entry.added.push(e);
        return;
      }
      const fields = exerciseFields(prev.exercise, e);
      const movedFrom = prev.day.id === d.id ? null : prev.day.label;
      if (fields.length > 0 || movedFrom !== null) entry.changed.push({ exercise: e, before: prev.exercise, fields, movedFrom });
      else unchanged += 1;
    });
    return entry;
  });

  const removedEntries = current.days
    .filter(d => !nextDayIds.has(d.id))
    .map(d => ({ ...dayEntry(d, 'removed'), removed: gone(d) }));

  const days = [...nextEntries, ...removedEntries];
  const name = current.name === next.name ? null : { from: current.name, to: next.name };
  const daysReordered = orderChanged(current.days.map(d => d.id), next.days.map(d => d.id));
  return {
    hasChanges: !!name || daysReordered || days.some(hasDayChanges),
    name,
    daysReordered,
    unchanged,
    days,
  };
};
