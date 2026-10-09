import { isObject, isValidPlans, isValidSession } from './schema.js';

const APP = 'reps';
const VERSION = 1;

const withExistingActivePlan = (state) =>
  state.plans.some(p => p.id === state.activePlanId)
    ? state
    : { ...state, activePlanId: state.plans[0].id };

const pad = (n) => String(n).padStart(2, '0');

export const createBackup = (plansState, sessions, now) => ({
  app: APP,
  version: VERSION,
  exportedAt: now.toISOString(),
  plans: plansState,
  sessions,
});

export const backupFileName = (now) =>
  `reps-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;

export const readBackupFile = async (file) => {
  try {
    return parseBackup(await file.text());
  } catch {
    return { ok: false };
  }
};

export const parseBackup = (text) => {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false };
  }
  if (!isObject(data) || data.app !== APP || data.version !== VERSION) return { ok: false };
  if (!isValidPlans(data.plans)) return { ok: false };
  if (!Array.isArray(data.sessions) || !data.sessions.every(isValidSession)) return { ok: false };
  return { ok: true, plans: withExistingActivePlan(data.plans), sessions: data.sessions };
};
