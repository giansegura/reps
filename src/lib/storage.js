import { isValidPlans, isValidSession } from './schema.js';

const PREFIX = 'reps-';
const PLANS_KEY = 'reps-plans';
const SESSIONS_KEY = 'reps-sessions';
const WIP_KEY = 'reps-wip';
const INSTALL_HINT_KEY = 'reps-install-hint';

const readRaw = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const parseJSON = (raw) => {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const readJSON = (key) => parseJSON(readRaw(key));

const keepCorruptCopy = (key, raw, onCorrupt) => {
  const copyKey = `${key}-corrupt`;
  if (localStorage.getItem(copyKey) === raw) return;
  localStorage.setItem(copyKey, raw);
  onCorrupt?.();
};

const writeJSON = async (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const loadSessions = async ({ onCorrupt } = {}) => {
  const raw = readRaw(SESSIONS_KEY);
  if (!raw) return [];
  const data = parseJSON(raw);
  const sessions = Array.isArray(data) ? data.filter(isValidSession) : [];
  if (!Array.isArray(data) || sessions.length !== data.length) keepCorruptCopy(SESSIONS_KEY, raw, onCorrupt);
  return sessions;
};

export const saveSessions = (sessions) => writeJSON(SESSIONS_KEY, sessions);

export const loadPlans = async ({ onCorrupt } = {}) => {
  const raw = readRaw(PLANS_KEY);
  if (!raw) return null;
  const data = parseJSON(raw);
  if (isValidPlans(data)) return data;
  keepCorruptCopy(PLANS_KEY, raw, onCorrupt);
  return null;
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

export const collectRawData = () => {
  const data = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX)) data[key] = localStorage.getItem(key);
    }
  } catch {
    return data;
  }
  return data;
};
