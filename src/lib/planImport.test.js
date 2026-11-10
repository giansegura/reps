import { describe, expect, it } from 'vitest';
import { diffPlans, reconcilePlan, resolveImportTarget } from './planImport.js';

const ex = (id, name, sets = 3, reps = '8') => ({ id, name, sets, reps, allowBW: false, notes: '' });

const day = (id, label, exercises) => ({ id, label, color: '#22c55e', exercises });

const current = {
  id: 'p1',
  name: 'Full Body',
  days: [
    day('d1', 'Torso', [ex('e1', 'Press banca'), ex('e2', 'Remo')]),
    day('d2', 'Pierna', [ex('e3', 'Sentadilla')]),
  ],
};

const state = {
  activePlanId: 'p1',
  plans: [current, { id: 'p2', name: 'Pierna', days: [day('d9', 'Único', [ex('e9', 'Prensa')])] }],
};

const idsOf = (plan) => plan.days.map(d => [d.id, d.exercises.map(e => e.id)]);

describe('resolveImportTarget', () => {
  it('mismo id es el plan abierto', () => {
    expect(resolveImportTarget(state, 'p1', current)).toEqual({ kind: 'same' });
  });

  it('id de otro plan dice cuál es', () => {
    expect(resolveImportTarget(state, 'p1', { ...current, id: 'p2' })).toEqual({ kind: 'other', name: 'Pierna' });
  });

  it('id desconocido que comparte ejercicios con el plan abierto es el plan abierto', () => {
    const incoming = { id: 'zz', name: 'X', days: [day('dx', 'Nuevo', [ex('e1', 'Press banca')])] };
    expect(resolveImportTarget(state, 'p1', incoming)).toEqual({ kind: 'same' });
  });

  it('id desconocido que comparte un día con el plan abierto es el plan abierto', () => {
    const incoming = { id: 'zz', name: 'X', days: [day('d2', 'Pierna', [])] };
    expect(resolveImportTarget(state, 'p1', incoming)).toEqual({ kind: 'same' });
  });

  it('id desconocido sin nada en común es un plan nuevo', () => {
    const incoming = { id: 'zz', name: 'X', days: [day('dx', 'Nuevo', [ex('ex', 'Curl')])] };
    expect(resolveImportTarget(state, 'p1', incoming)).toEqual({ kind: 'new' });
  });
});

describe('reconcilePlan', () => {
  it('conserva los ids que mantiene', () => {
    const incoming = { ...current, days: [day('d1', 'Torso', [ex('e1', 'Press inclinado', 4, '6'), ex('e2', 'Remo')]), current.days[1]] };
    const result = reconcilePlan(current, incoming);
    expect(idsOf(result)).toEqual([['d1', ['e1', 'e2']], ['d2', ['e3']]]);
    expect(result.days[0].exercises[0]).toEqual(ex('e1', 'Press inclinado', 4, '6'));
  });

  it('ejercicio sin id o con id desconocido es nuevo', () => {
    const incoming = { ...current, days: [day('d1', 'Torso', [ex('nope', 'Curl'), ex(crypto.randomUUID(), 'Face pull')]), current.days[1]] };
    const result = reconcilePlan(current, incoming);
    const ids = result.days[0].exercises.map(e => e.id);
    expect(ids.some(id => ['e1', 'e2', 'e3', 'nope'].includes(id))).toBe(false);
    expect(new Set(ids).size).toBe(2);
  });

  it('el id del plan es siempre el abierto', () => {
    const result = reconcilePlan(current, { ...current, id: 'otro', name: 'Nuevo nombre' });
    expect(result.id).toBe('p1');
    expect(result.name).toBe('Nuevo nombre');
  });

  it('respeta el orden del archivo', () => {
    const incoming = { ...current, days: [current.days[1], day('d1', 'Torso', [ex('e2', 'Remo'), ex('e1', 'Press banca')])] };
    expect(idsOf(reconcilePlan(current, incoming))).toEqual([['d2', ['e3']], ['d1', ['e2', 'e1']]]);
  });

  it('id repetido: lo conserva el que sigue en su día', () => {
    const incoming = {
      ...current,
      days: [day('d2', 'Pierna', [ex('e3', 'Sentadilla'), ex('e1', 'Press banca')]), day('d1', 'Torso', [ex('e1', 'Press banca'), ex('e2', 'Remo')])],
    };
    const result = reconcilePlan(current, incoming);
    expect(result.days[1].exercises[0].id).toBe('e1');
    expect(result.days[0].exercises[1].id).not.toBe('e1');
    expect(['e2', 'e3']).not.toContain(result.days[0].exercises[1].id);
  });

  it('id repetido y movido: lo conserva el primero', () => {
    const incoming = {
      ...current,
      days: [current.days[1], day('d3', 'Brazos', [ex('e1', 'Press banca')]), day('d4', 'Hombro', [ex('e1', 'Press banca')])],
    };
    const result = reconcilePlan(current, incoming);
    expect(result.days[1].exercises[0].id).toBe('e1');
    expect(result.days[2].exercises[0].id).not.toBe('e1');
  });

  it('ejercicio movido de día conserva su id', () => {
    const incoming = { ...current, days: [day('d1', 'Torso', [ex('e2', 'Remo')]), day('d2', 'Pierna', [ex('e3', 'Sentadilla'), ex('e1', 'Press banca')])] };
    expect(idsOf(reconcilePlan(current, incoming))).toEqual([['d1', ['e2']], ['d2', ['e3', 'e1']]]);
  });

  it('día repetido: lo conserva el primero', () => {
    const incoming = { ...current, days: [day('d1', 'Torso', []), day('d1', 'Torso B', [])] };
    const result = reconcilePlan(current, incoming);
    expect(result.days[0].id).toBe('d1');
    expect(result.days[1].id).not.toBe('d1');
    expect(result.days[1].id).not.toBe('d2');
  });

  it('día con id desconocido es nuevo', () => {
    const result = reconcilePlan(current, { ...current, days: [day('dx', 'Brazos', [])] });
    expect(['d1', 'd2', 'dx']).not.toContain(result.days[0].id);
  });

  it('conserva el resto de campos del archivo', () => {
    const incoming = { ...current, days: [{ ...current.days[0], color: '#ef4444', label: 'Torso A' }] };
    expect(reconcilePlan(current, incoming).days[0]).toMatchObject({ id: 'd1', label: 'Torso A', color: '#ef4444' });
  });
});

const withDays = (...days) => ({ ...current, days });

const dayById = (diff, id) => diff.days.find(d => d.id === id);

describe('diffPlans', () => {
  it('sin cambios', () => {
    const diff = diffPlans(current, current);
    expect(diff.hasChanges).toBe(false);
    expect(diff.unchanged).toBe(3);
    expect(diff.name).toBeNull();
    expect(diff.daysReordered).toBe(false);
    expect(diff.days.map(d => [d.id, d.status])).toEqual([['d1', 'kept'], ['d2', 'kept']]);
  });

  it('añadido, quitado y cambiado', () => {
    const e9 = ex('e9', 'Curl', 3, '12');
    const next = withDays(day('d1', 'Torso', [ex('e1', 'Press inclinado', 4, '6'), e9]), current.days[1]);
    const diff = diffPlans(current, next);
    const d1 = dayById(diff, 'd1');
    expect(diff.hasChanges).toBe(true);
    expect(d1.added).toEqual([e9]);
    expect(d1.removed).toEqual([ex('e2', 'Remo')]);
    expect(d1.changed).toEqual([{ exercise: next.days[0].exercises[0], before: current.days[0].exercises[0], fields: ['name', 'volume'], movedFrom: null }]);
    expect(diff.unchanged).toBe(1);
  });

  it('notas y peso corporal', () => {
    const next = withDays(day('d1', 'Torso', [{ ...ex('e1', 'Press banca'), allowBW: true, notes: 'Codos' }, ex('e2', 'Remo')]), current.days[1]);
    expect(dayById(diffPlans(current, next), 'd1').changed[0].fields).toEqual(['allowBW', 'notes']);
  });

  it('notas ausentes equivalen a vacías', () => {
    const next = withDays(day('d1', 'Torso', [{ ...ex('e1', 'Press banca'), notes: undefined }, ex('e2', 'Remo')]), current.days[1]);
    expect(diffPlans(current, next).hasChanges).toBe(false);
  });

  it('ejercicio movido', () => {
    const next = withDays(day('d1', 'Torso', [ex('e2', 'Remo')]), day('d2', 'Pierna', [ex('e3', 'Sentadilla'), ex('e1', 'Press banca')]));
    const diff = diffPlans(current, next);
    expect(dayById(diff, 'd2').changed).toEqual([{ exercise: ex('e1', 'Press banca'), before: ex('e1', 'Press banca'), fields: [], movedFrom: 'Torso' }]);
    expect(dayById(diff, 'd1').removed).toEqual([]);
    expect(diff.unchanged).toBe(2);
  });

  it('día nuevo, quitado y renombrado', () => {
    const next = withDays(day('d1', 'Tren superior', current.days[0].exercises), day('d5', 'Brazos', [ex('e5', 'Curl')]));
    const diff = diffPlans(current, next);
    expect(diff.days.map(d => [d.id, d.status])).toEqual([['d1', 'kept'], ['d5', 'added'], ['d2', 'removed']]);
    expect(dayById(diff, 'd1').renamedFrom).toBe('Torso');
    expect(dayById(diff, 'd1').label).toBe('Tren superior');
    expect(dayById(diff, 'd5').added).toEqual([ex('e5', 'Curl')]);
    expect(dayById(diff, 'd2')).toMatchObject({ label: 'Pierna', status: 'removed', removed: [ex('e3', 'Sentadilla')] });
    expect(dayById(diff, 'd2').renamedFrom).toBeNull();
  });

  it('detecta cambios en días sin nombre', () => {
    const unnamed = { ...current, days: [day('d1', '', current.days[0].exercises), current.days[1]] };
    const renamed = diffPlans(unnamed, current);
    expect(dayById(renamed, 'd1').renamedFrom).toBe('');
    expect(renamed.hasChanges).toBe(true);
    const moved = diffPlans(unnamed, { ...unnamed, days: [day('d1', '', [ex('e2', 'Remo')]), day('d2', 'Pierna', [ex('e3', 'Sentadilla'), ex('e1', 'Press banca')])] });
    expect(dayById(moved, 'd2').changed[0].movedFrom).toBe('');
    expect(moved.hasChanges).toBe(true);
  });

  it('cambio de nombre del plan', () => {
    expect(diffPlans({ ...current, name: 'A' }, { ...current, name: 'B' }).name).toEqual({ from: 'A', to: 'B' });
  });

  it('un cambio solo de orden cuenta como cambio', () => {
    const exercises = withDays(day('d1', 'Torso', [ex('e2', 'Remo'), ex('e1', 'Press banca')]), current.days[1]);
    const byExercise = diffPlans(current, exercises);
    expect(dayById(byExercise, 'd1').reordered).toBe(true);
    expect(byExercise.hasChanges).toBe(true);
    expect(byExercise.unchanged).toBe(3);
    const days = withDays(current.days[1], current.days[0]);
    const byDay = diffPlans(current, days);
    expect(byDay.daysReordered).toBe(true);
    expect(byDay.hasChanges).toBe(true);
  });

  it('añadir delante no cuenta como cambio de orden', () => {
    const next = withDays(day('d1', 'Torso', [ex('e9', 'Curl'), ...current.days[0].exercises]), current.days[1]);
    expect(dayById(diffPlans(current, next), 'd1').reordered).toBe(false);
  });

  it('el color no cuenta', () => {
    const next = withDays({ ...current.days[0], color: '#ef4444' }, current.days[1]);
    expect(diffPlans(current, next).hasChanges).toBe(false);
  });
});
