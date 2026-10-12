import { CURRENT_VERSION, migrate } from './migrate.js';
import { isObject, isValidPlans, isValidSession } from './schema.js';

const PREFIX = 'reps-';
const PLANS_KEY = 'reps-plans';
const SESSIONS_KEY = 'reps-sessions';
const WIP_KEY = 'reps-wip';
const INSTALL_HINT_KEY = 'reps-install-hint';
const VERSION_KEY = 'reps-version';
const JOURNAL_KEY = 'reps-journal';

export class ReadOnlyError extends Error {
  constructor() {
    super('Los datos son de una versión más nueva de Reps');
    this.name = 'ReadOnlyError';
  }
}

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

export const readVersion = () => {
  const raw = readRaw(VERSION_KEY);
  if (raw === null) return 1;
  return /^[1-9]\d*$/.test(raw) ? Number(raw) : null;
};

const isReadOnly = () => (readVersion() ?? 1) > CURRENT_VERSION;

const keepCorruptCopy = (key, raw, onCorrupt) => {
  if (isReadOnly()) return;
  const copyKey = `${key}-corrupt`;
  if (localStorage.getItem(copyKey) === raw) return;
  localStorage.setItem(copyKey, raw);
  onCorrupt?.();
};

const writeJSON = async (key, data) => {
  if (isReadOnly()) throw new ReadOnlyError();
  localStorage.setItem(key, JSON.stringify(data));
};

const setRaw = (key, value) => {
  if (value === null) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
};

const restore = (previous) => {
  try {
    Object.entries(previous).forEach(([key, value]) => setRaw(key, value));
    localStorage.removeItem(JOURNAL_KEY);
  } catch {
    return;
  }
};

export const writeAll = (entries) => {
  if (isReadOnly()) throw new ReadOnlyError();
  const previous = Object.fromEntries(Object.keys(entries).map(key => [key, localStorage.getItem(key)]));
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(previous));
  try {
    Object.entries(entries).forEach(([key, value]) => setRaw(key, value));
  } catch (e) {
    restore(previous);
    throw e;
  }
  localStorage.removeItem(JOURNAL_KEY);
};

const isJournal = (data) =>
  isObject(data)
  && Object.entries(data).every(([key, value]) => key.startsWith(PREFIX) && (value === null || typeof value === 'string'));

export const recoverJournal = ({ onCorrupt } = {}) => {
  const raw = readRaw(JOURNAL_KEY);
  if (!raw) return;
  const data = parseJSON(raw);
  if (isJournal(data)) Object.entries(data).forEach(([key, value]) => setRaw(key, value));
  else keepCorruptCopy(JOURNAL_KEY, raw, onCorrupt);
  localStorage.removeItem(JOURNAL_KEY);
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

export const saveAllData = async ({ plans, sessions }) => {
  writeAll({
    [SESSIONS_KEY]: JSON.stringify(sessions),
    ...(plans ? { [PLANS_KEY]: JSON.stringify(plans) } : {}),
    [VERSION_KEY]: String(CURRENT_VERSION),
  });
};

export const loadData = async ({ onCorrupt } = {}) => {
  recoverJournal({ onCorrupt });
  const version = readVersion();
  if (version === null) keepCorruptCopy(VERSION_KEY, readRaw(VERSION_KEY), onCorrupt);
  const from = version ?? 1;
  if (from > CURRENT_VERSION) return { status: 'newer' };
  const [sessions, plans] = await Promise.all([loadSessions({ onCorrupt }), loadPlans({ onCorrupt })]);
  if (from === CURRENT_VERSION) return { status: 'ok', plans, sessions };
  const migrated = migrate({ plans, sessions }, from);
  try {
    await saveAllData(migrated);
  } catch (e) {
    console.error(e);
  }
  return { status: 'ok', ...migrated };
};

export const loadWIP = () => readJSON(WIP_KEY);

export const saveWIP = (planId, dayId, workout, notes = {}) => {
  try {
    if (isReadOnly()) return;
    localStorage.setItem(WIP_KEY, JSON.stringify({ planId, dayId, workout, notes }));
  } catch {
    return;
  }
};

export const clearWIP = () => {
  try {
    if (isReadOnly()) return;
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
    if (isReadOnly()) return;
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
