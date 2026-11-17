export const appendSession = (sessions, session) => [...sessions, session];

export const latestSession = (sessions, planId, dayId) =>
  sessions.reduce(
    (latest, s) => (s.planId === planId && s.dayId === dayId && (!latest || s.date > latest.date) ? s : latest),
    undefined,
  );

const matches = (session, { planId, dayId }) =>
  (planId === undefined || session.planId === planId) && (dayId === undefined || session.dayId === dayId);

export const countSessions = (sessions, filter) => sessions.filter(s => matches(s, filter)).length;

const hasValues = (sets) => !!sets && Object.values(sets).some(set => set && (set.weight || set.reps));

export const latestExerciseEntry = (sessions, planId, exerciseId) => {
  const session = sessions.reduce(
    (latest, s) => (
      s.planId === planId && hasValues(s.exercises?.[exerciseId]) && (!latest || s.date > latest.date) ? s : latest
    ),
    undefined,
  );
  if (!session) return null;
  return { date: session.date, sets: session.exercises[exerciseId], note: session.notes?.[exerciseId] };
};
