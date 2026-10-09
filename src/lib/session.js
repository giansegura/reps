import { findPlanByDay, getActivePlan } from './plans.js';

const withPlanId = (session, plansState, activePlanId) => ({
  planId: session.planId || findPlanByDay(plansState, session.dayId)?.id || activePlanId,
  dayId: session.dayId,
  date: session.date,
  exercises: session.exercises,
  notes: session.notes || {},
});

const sessionKey = (session) => `${session.planId}:${session.dayId}`;

const keepLatestPerDay = (sessions) => {
  const latest = new Map();
  sessions.forEach(s => {
    const current = latest.get(sessionKey(s));
    if (!current || s.date > current.date) latest.set(sessionKey(s), s);
  });
  return [...latest.values()];
};

export const normalizeSessions = (sessions, plansState) => {
  const activePlanId = getActivePlan(plansState).id;
  return keepLatestPerDay(sessions.map(s => withPlanId(s, plansState, activePlanId)));
};

export const replaceSession = (sessions, session) => [
  ...sessions.filter(s => sessionKey(s) !== sessionKey(session)),
  session,
];
