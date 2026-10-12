import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ReadOnlyError,
  clearWIP,
  collectRawData,
  dismissInstallHint,
  isInstallHintDismissed,
  loadData,
  loadPlans,
  loadSessions,
  loadWIP,
  readVersion,
  recoverJournal,
  requestPersistence,
  saveAllData,
  savePlans,
  saveSessions,
  saveWIP,
  writeAll,
} from './storage.js';

const createFakeStorage = () => {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => { data.set(key, String(value)); },
    removeItem: (key) => { data.delete(key); },
    key: (index) => [...data.keys()][index] ?? null,
    get length() { return data.size; },
  };
};

const plans = { activePlanId: 'p1', plans: [{ id: 'p1', name: 'Full Body', days: [] }] };

const plansWithDay = {
  activePlanId: 'p1',
  plans: [{ id: 'p1', name: 'Full Body', days: [{ id: 'd1', label: 'Día 1', color: '#000000', exercises: [] }] }],
};

const legacy = [
  { dayId: 'd1', date: '2026-10-02T10:00:00.000Z', exercises: {} },
  { dayId: 'd1', date: '2026-10-01T10:00:00.000Z', exercises: {} },
];

const failOn = (failingKey) => {
  const setItem = localStorage.setItem;
  localStorage.setItem = (key, value) => {
    if (key === failingKey) throw new Error('QuotaExceededError');
    setItem(key, value);
  };
};

beforeEach(() => {
  vi.stubGlobal('localStorage', createFakeStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('planes', () => {
  it('devuelve null si no hay nada guardado', async () => {
    expect(await loadPlans()).toBeNull();
  });

  it('guarda y recupera', async () => {
    await savePlans(plans);
    expect(localStorage.getItem('reps-plans')).not.toBeNull();
    expect(await loadPlans()).toEqual(plans);
  });

  it('devuelve null si el JSON está corrupto', async () => {
    localStorage.setItem('reps-plans', '{roto');
    expect(await loadPlans()).toBeNull();
  });

  it('devuelve null si no tiene forma de planes', async () => {
    localStorage.setItem('reps-plans', '{"foo":1}');
    expect(await loadPlans()).toBeNull();
  });

  it('rechaza si setItem lanza', async () => {
    localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
    await expect(savePlans(plans)).rejects.toThrow('QuotaExceededError');
  });

  it('descarta planes con estructura inválida y guarda una copia aparte', async () => {
    const raw = '{"activePlanId":"p1","plans":[{"id":"p1"}]}';
    const onCorrupt = vi.fn();
    localStorage.setItem('reps-plans', raw);
    expect(await loadPlans({ onCorrupt })).toBeNull();
    expect(localStorage.getItem('reps-plans-corrupt')).toBe(raw);
    expect(onCorrupt).toHaveBeenCalledOnce();
  });

  it('avisa una sola vez de la misma copia dañada', async () => {
    const onCorrupt = vi.fn();
    localStorage.setItem('reps-plans', '{roto');
    await loadPlans({ onCorrupt });
    await loadPlans({ onCorrupt });
    expect(onCorrupt).toHaveBeenCalledOnce();
  });
});

describe('sesiones', () => {
  it('devuelve [] si no hay nada guardado', async () => {
    expect(await loadSessions()).toEqual([]);
  });

  it('guarda y recupera', async () => {
    const sessions = [{ planId: 'p1', dayId: 'd1', date: 'x', exercises: {} }];
    await saveSessions(sessions);
    expect(localStorage.getItem('reps-sessions')).not.toBeNull();
    expect(await loadSessions()).toEqual(sessions);
  });

  it('devuelve [] si el JSON está corrupto o no es array', async () => {
    localStorage.setItem('reps-sessions', '{roto');
    expect(await loadSessions()).toEqual([]);
    localStorage.setItem('reps-sessions', '{}');
    expect(await loadSessions()).toEqual([]);
  });

  it('rechaza si setItem lanza', async () => {
    localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
    await expect(saveSessions([])).rejects.toThrow('QuotaExceededError');
  });

  it('conserva las sesiones válidas y guarda una copia de las dañadas', async () => {
    const valid = { planId: 'p1', dayId: 'd1', date: 'x', exercises: {} };
    const raw = JSON.stringify([valid, null, { dayId: 5 }]);
    const onCorrupt = vi.fn();
    localStorage.setItem('reps-sessions', raw);
    expect(await loadSessions({ onCorrupt })).toEqual([valid]);
    expect(localStorage.getItem('reps-sessions-corrupt')).toBe(raw);
    expect(onCorrupt).toHaveBeenCalledOnce();
  });
});

describe('copia de datos dañados', () => {
  const failingCopy = () => {
    const setItem = localStorage.setItem;
    localStorage.setItem = (key, value) => {
      if (key.endsWith('-corrupt')) throw new Error('QuotaExceededError');
      setItem(key, value);
    };
  };

  it('no descarta planes dañados si no puede guardar la copia', async () => {
    localStorage.setItem('reps-plans', '{roto');
    failingCopy();
    await expect(loadPlans()).rejects.toThrow('QuotaExceededError');
  });

  it('no descarta sesiones dañadas si no puede guardar la copia', async () => {
    localStorage.setItem('reps-sessions', '[null]');
    failingCopy();
    await expect(loadSessions()).rejects.toThrow('QuotaExceededError');
  });
});

describe('collectRawData', () => {
  it('reúne en crudo solo las claves de Reps', () => {
    localStorage.setItem('reps-plans', '{roto');
    localStorage.setItem('otra-app', 'x');
    expect(collectRawData()).toEqual({ 'reps-plans': '{roto' });
  });
});

describe('entreno en curso', () => {
  it('usa la clave reps-wip', () => {
    saveWIP('p1', 'd1', { e1: {} }, { e1: 'nota' });
    expect(JSON.parse(localStorage.getItem('reps-wip'))).toEqual({
      planId: 'p1', dayId: 'd1', workout: { e1: {} }, notes: { e1: 'nota' },
    });
    expect(loadWIP()).toEqual({ planId: 'p1', dayId: 'd1', workout: { e1: {} }, notes: { e1: 'nota' } });
    clearWIP();
    expect(loadWIP()).toBeNull();
  });

  it('ignora la clave antigua', () => {
    localStorage.setItem('gym-tracker-wip', '{"dayId":"d1"}');
    expect(loadWIP()).toBeNull();
  });
});

describe('aviso de instalación', () => {
  it('se recuerda al descartarlo', () => {
    expect(isInstallHintDismissed()).toBe(false);
    dismissInstallHint();
    expect(isInstallHintDismissed()).toBe(true);
  });

  it('no lanza si localStorage falla', () => {
    localStorage.getItem = () => { throw new Error('SecurityError'); };
    localStorage.setItem = () => { throw new Error('SecurityError'); };
    expect(isInstallHintDismissed()).toBe(false);
    expect(() => dismissInstallHint()).not.toThrow();
  });
});

describe('requestPersistence', () => {
  it('no lanza sin navigator.storage', () => {
    vi.stubGlobal('navigator', {});
    expect(() => requestPersistence()).not.toThrow();
  });

  it('pide persistencia si existe', () => {
    const persist = vi.fn(() => Promise.resolve(true));
    vi.stubGlobal('navigator', { storage: { persist } });
    requestPersistence();
    expect(persist).toHaveBeenCalledOnce();
  });
});

describe('readVersion', () => {
  it('sin clave es la versión 1', () => {
    expect(readVersion()).toBe(1);
  });

  it('lee la versión guardada', () => {
    localStorage.setItem('reps-version', '2');
    expect(readVersion()).toBe(2);
  });

  it.each(['abc', '0', '-1', '2.5', ''])('devuelve null con %j', (raw) => {
    localStorage.setItem('reps-version', raw);
    expect(readVersion()).toBeNull();
  });
});

describe('writeAll', () => {
  it('escribe y borra claves sin dejar diario', () => {
    localStorage.setItem('reps-wip', 'x');
    writeAll({ 'reps-plans': 'p', 'reps-wip': null });
    expect(localStorage.getItem('reps-plans')).toBe('p');
    expect(localStorage.getItem('reps-wip')).toBeNull();
    expect(localStorage.getItem('reps-journal')).toBeNull();
  });

  it('si falla a mitad restaura lo anterior y borra el diario', () => {
    localStorage.setItem('reps-plans', 'viejo');
    failOn('reps-sessions');
    expect(() => writeAll({ 'reps-plans': 'nuevo', 'reps-sessions': '[]' })).toThrow('QuotaExceededError');
    expect(localStorage.getItem('reps-plans')).toBe('viejo');
    expect(localStorage.getItem('reps-sessions')).toBeNull();
    expect(localStorage.getItem('reps-journal')).toBeNull();
  });

  it('si no puede guardar el diario no toca nada', () => {
    localStorage.setItem('reps-plans', 'viejo');
    failOn('reps-journal');
    expect(() => writeAll({ 'reps-plans': 'nuevo' })).toThrow('QuotaExceededError');
    expect(localStorage.getItem('reps-plans')).toBe('viejo');
  });
});

describe('recoverJournal', () => {
  it('restaura los valores previos y borra el diario', () => {
    localStorage.setItem('reps-plans', 'nuevo');
    localStorage.setItem('reps-sessions', 'nuevo');
    localStorage.setItem('reps-journal', JSON.stringify({ 'reps-plans': 'viejo', 'reps-sessions': null }));
    recoverJournal();
    expect(localStorage.getItem('reps-plans')).toBe('viejo');
    expect(localStorage.getItem('reps-sessions')).toBeNull();
    expect(localStorage.getItem('reps-journal')).toBeNull();
  });

  it('guarda aparte un diario dañado sin restaurar nada', () => {
    const onCorrupt = vi.fn();
    localStorage.setItem('reps-plans', 'nuevo');
    localStorage.setItem('reps-journal', '{roto');
    recoverJournal({ onCorrupt });
    expect(localStorage.getItem('reps-plans')).toBe('nuevo');
    expect(localStorage.getItem('reps-journal-corrupt')).toBe('{roto');
    expect(localStorage.getItem('reps-journal')).toBeNull();
    expect(onCorrupt).toHaveBeenCalledOnce();
  });

  it('trata como dañado un diario con claves ajenas a Reps', () => {
    localStorage.setItem('reps-journal', JSON.stringify({ 'otra-app': 'x' }));
    recoverJournal();
    expect(localStorage.getItem('otra-app')).toBeNull();
    expect(localStorage.getItem('reps-journal-corrupt')).not.toBeNull();
  });
});

describe('saveAllData', () => {
  it('guarda entrenos, planes y versión', async () => {
    await saveAllData({ plans, sessions: [] });
    expect(JSON.parse(localStorage.getItem('reps-plans'))).toEqual(plans);
    expect(localStorage.getItem('reps-sessions')).toBe('[]');
    expect(localStorage.getItem('reps-version')).toBe('2');
  });

  it('no escribe planes si son null', async () => {
    await saveAllData({ plans: null, sessions: [] });
    expect(localStorage.getItem('reps-plans')).toBeNull();
  });
});

describe('loadData', () => {
  it('migra datos de la versión 1 sin perder entrenos y guarda la versión', async () => {
    localStorage.setItem('reps-plans', JSON.stringify(plansWithDay));
    localStorage.setItem('reps-sessions', JSON.stringify(legacy));
    const data = await loadData();
    expect(data.status).toBe('ok');
    expect(data.sessions.map(s => s.date)).toEqual([legacy[1].date, legacy[0].date]);
    expect(data.sessions.every(s => s.planId === 'p1')).toBe(true);
    expect(localStorage.getItem('reps-version')).toBe('2');
    expect(JSON.parse(localStorage.getItem('reps-sessions'))).toEqual(data.sessions);
  });

  it('sin datos guarda la versión y no inventa planes', async () => {
    expect(await loadData()).toEqual({ status: 'ok', plans: null, sessions: [] });
    expect(localStorage.getItem('reps-version')).toBe('2');
    expect(localStorage.getItem('reps-plans')).toBeNull();
  });

  it('no reescribe datos que ya están en la versión actual', async () => {
    const raw = JSON.stringify([{ planId: 'p1', dayId: 'd1', date: 'x', exercises: {}, notes: {} }], null, 1);
    localStorage.setItem('reps-version', '2');
    localStorage.setItem('reps-sessions', raw);
    await loadData();
    expect(localStorage.getItem('reps-sessions')).toBe(raw);
  });

  it('con una versión más nueva no lee ni escribe nada', async () => {
    localStorage.setItem('reps-version', '3');
    localStorage.setItem('reps-sessions', '{"formato":"nuevo"}');
    expect(await loadData()).toEqual({ status: 'newer' });
    expect(localStorage.length).toBe(2);
  });

  it('restaura un diario pendiente antes de leer', async () => {
    localStorage.setItem('reps-version', '2');
    localStorage.setItem('reps-plans', '{a medias');
    localStorage.setItem('reps-journal', JSON.stringify({ 'reps-plans': JSON.stringify(plans) }));
    const data = await loadData();
    expect(data.plans).toEqual(plans);
    expect(localStorage.getItem('reps-plans-corrupt')).toBeNull();
  });

  it('con una versión dañada guarda una copia y migra', async () => {
    const onCorrupt = vi.fn();
    localStorage.setItem('reps-version', 'abc');
    const data = await loadData({ onCorrupt });
    expect(data.status).toBe('ok');
    expect(localStorage.getItem('reps-version-corrupt')).toBe('abc');
    expect(localStorage.getItem('reps-version')).toBe('2');
    expect(onCorrupt).toHaveBeenCalledOnce();
  });

  it('sigue con los datos migrados aunque no pueda guardarlos', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('reps-sessions', JSON.stringify(legacy));
    failOn('reps-journal');
    const data = await loadData();
    expect(data.sessions).toHaveLength(2);
    expect(localStorage.getItem('reps-version')).toBeNull();
    vi.restoreAllMocks();
  });

  it('funciona sin acceso a localStorage', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.getItem = () => { throw new Error('SecurityError'); };
    localStorage.setItem = () => { throw new Error('SecurityError'); };
    expect(await loadData()).toEqual({ status: 'ok', plans: null, sessions: [] });
    vi.restoreAllMocks();
  });
});

describe('solo lectura', () => {
  it('con una versión más nueva ninguna escritura llega a localStorage', async () => {
    localStorage.setItem('reps-version', '3');
    await expect(savePlans(plans)).rejects.toThrow(ReadOnlyError);
    await expect(saveSessions([])).rejects.toThrow(ReadOnlyError);
    await expect(saveAllData({ plans, sessions: [] })).rejects.toThrow(ReadOnlyError);
    expect(() => writeAll({ 'reps-plans': 'x' })).toThrow(ReadOnlyError);
    saveWIP('p1', 'd1', {});
    dismissInstallHint();
    expect(localStorage.length).toBe(1);
  });

  it('clearWIP no borra en solo lectura', () => {
    localStorage.setItem('reps-version', '3');
    localStorage.setItem('reps-wip', 'x');
    clearWIP();
    expect(localStorage.getItem('reps-wip')).toBe('x');
  });

  it('se bloquea si la versión sube después de cargar', async () => {
    localStorage.setItem('reps-version', '2');
    await savePlans(plans);
    localStorage.setItem('reps-version', '3');
    await expect(savePlans({ ...plans, activePlanId: 'otro' })).rejects.toThrow(ReadOnlyError);
    expect(JSON.parse(localStorage.getItem('reps-plans'))).toEqual(plans);
  });
});
