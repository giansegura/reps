import { CURRENT_VERSION, migrate } from './migrate.js';
import { isObject, isValidPlans, isValidSession } from './schema.js';

const APP = 'reps';
const INVALID = { ok: false, reason: 'invalid' };
const NEWER = { ok: false, reason: 'newer' };

const withExistingActivePlan = (state) =>
  state.plans.some(p => p.id === state.activePlanId)
    ? state
    : { ...state, activePlanId: state.plans[0].id };

const isVersion = (value) => Number.isInteger(value) && value >= 1;

const pad = (n) => String(n).padStart(2, '0');

export const createBackup = (plansState, sessions, now) => ({
  app: APP,
  version: CURRENT_VERSION,
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
    return INVALID;
  }
};

export const parseBackup = (text) => {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return INVALID;
  }
  if (!isObject(data) || data.app !== APP || !isVersion(data.version)) return INVALID;
  if (data.version > CURRENT_VERSION) return NEWER;
  if (!isValidPlans(data.plans)) return INVALID;
  if (!Array.isArray(data.sessions) || !data.sessions.every(isValidSession)) return INVALID;
  const migrated = migrate({ plans: data.plans, sessions: data.sessions }, data.version);
  return { ok: true, plans: withExistingActivePlan(migrated.plans), sessions: migrated.sessions };
};
