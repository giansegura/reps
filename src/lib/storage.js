const PLANS_KEY = 'reps-plans';
const SESSIONS_KEY = 'reps-sessions';
const WIP_KEY = 'reps-wip';
const INSTALL_HINT_KEY = 'reps-install-hint';

const readJSON = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeJSON = async (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const loadSessions = async () => {
  const data = readJSON(SESSIONS_KEY);
  return Array.isArray(data) ? data : [];
};

export const saveSessions = (sessions) => writeJSON(SESSIONS_KEY, sessions);

export const loadPlans = async () => {
  const data = readJSON(PLANS_KEY);
  return data && typeof data === 'object' && Array.isArray(data.plans) ? data : null;
};

export const savePlans = (state) => writeJSON(PLANS_KEY, state);

export const loadWIP = () => readJSON(WIP_KEY);

export const saveWIP = (planId, dayId, workout, notes = {}) => {
  try {
    localStorage.setItem(WIP_KEY, JSON.stringify({ planId, dayId, workout, notes }));
  } catch {
    return;
  }
};

export const clearWIP = () => {
  try {
    localStorage.removeItem(WIP_KEY);
  } catch {
    return;
  }
};

export const isInstallHintDismissed = () => {
  try {
    return localStorage.getItem(INSTALL_HINT_KEY) === 'dismissed';
  } catch {
    return false;
  }
};

export const dismissInstallHint = () => {
  try {
    localStorage.setItem(INSTALL_HINT_KEY, 'dismissed');
  } catch {
    return;
  }
};

export const requestPersistence = () => {
  try {
    navigator.storage?.persist?.()?.catch(() => {});
  } catch {
    return;
  }
};
