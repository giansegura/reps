import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearWIP,
  collectRawData,
  dismissInstallHint,
  isInstallHintDismissed,
  loadPlans,
  loadSessions,
  loadWIP,
  requestPersistence,
  savePlans,
  saveSessions,
  saveWIP,
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
