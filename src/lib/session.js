export const appendSession = (sessions, session) => [...sessions, session];

export const latestSession = (sessions, planId, dayId) =>
  sessions.reduce(
    (latest, s) => (s.planId === planId && s.dayId === dayId && (!latest || s.date > latest.date) ? s : latest),
    undefined,
  );

const matches = (session, { planId, dayId }) =>
  (planId === undefined || session.planId === planId) && (dayId === undefined || session.dayId === dayId);

export const countSessions = (sessions, filter) => sessions.filter(s => matches(s, filter)).length;
