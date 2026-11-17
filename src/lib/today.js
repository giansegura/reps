const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const suggestDay = (days, sessions, planId, now) => {
  const trainable = days.filter(d => d.exercises.length > 0);
  if (trainable.length === 0) return { doneToday: null, next: null };
  const ids = new Set(trainable.map(d => d.id));
  const last = sessions.reduce(
    (latest, s) => (s.planId === planId && ids.has(s.dayId) && (!latest || s.date > latest.date) ? s : latest),
    undefined,
  );
  if (!last) return { doneToday: null, next: trainable[0] };
  const index = trainable.findIndex(d => d.id === last.dayId);
  return {
    doneToday: sameDay(new Date(last.date), now) ? trainable[index] : null,
    next: trainable[(index + 1) % trainable.length],
  };
};
