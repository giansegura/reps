import { describe, expect, it } from 'vitest';
import { createBackup } from './backup.js';
import { PALETTE } from './plan.js';
import { PLAN_INSTRUCTIONS, createPlanFile, parsePlanFile, planFileName, planHistory, readPlanFile } from './planFile.js';

const now = new Date(2026, 10, 10, 9, 5);

const plan = {
  id: 'p1',
  name: 'Torso',
  days: [{
    id: 'd1',
    label: 'Torso',
    color: '#22c55e',
    exercises: [{ id: 'e1', name: 'Press banca', sets: 3, reps: '8', allowBW: false, notes: '' }],
  }],
};

const session = (date, exercises, { planId = 'p1', dayId = 'd1', notes = {} } = {}) => ({
  planId,
  dayId,
  date: date.toISOString(),
  exercises,
  notes,
});

const done = (weight, reps) => ({ weight, reps, done: true });

describe('createPlanFile', () => {
  it('envuelve el plan con app, kind, versión, fecha e instrucciones', () => {
    expect(createPlanFile(plan, [], now)).toEqual({
      app: 'reps',
      kind: 'plan',
      version: 2,
      exportedAt: now.toISOString(),
      instructions: PLAN_INSTRUCTIONS,
      plan,
      history: [],
    });
  });

  it('las instrucciones explican los ids', () => {
    expect(PLAN_INSTRUCTIONS).toContain('conserva su «id»');
    expect(PLAN_INSTRUCTIONS).toContain('no le pongas «id»');
  });
});

describe('planHistory', () => {
  it('historial legible solo de ese plan', () => {
    const sessions = [
      session(new Date(2026, 2, 1, 10, 15), {
        e1: { 1: done('62,5', '6'), 2: done('PC', '10'), 3: { weight: '70', reps: '5', done: false } },
      }, { notes: { e1: 'Buenas\nsensaciones' } }),
      session(new Date(2026, 2, 2, 10, 15), { e1: { 1: done('80', '5') } }, { planId: 'p2' }),
    ];
    expect(planHistory(plan, sessions)).toEqual([{
      date: '2026-03-01 10:15',
      day: 'Torso',
      dayId: 'd1',
      exercises: [{ id: 'e1', name: 'Press banca', sets: ['62.5 kg × 6', 'PC × 10'], note: 'Buenas / sensaciones' }],
    }]);
  });

  it('ordena del más antiguo al más reciente', () => {
    const sessions = [
      session(new Date(2026, 2, 5, 10, 0), { e1: { 1: done('65', '8') } }),
      session(new Date(2026, 2, 1, 10, 0), { e1: { 1: done('60', '8') } }),
    ];
    expect(planHistory(plan, sessions).map(entry => entry.date)).toEqual(['2026-03-01 10:00', '2026-03-05 10:00']);
  });

  it('ejercicios y días eliminados', () => {
    const sessions = [session(new Date(2026, 2, 1, 10, 0), { abcdef123456: { 1: done('40', '10') } }, { dayId: 'dx' })];
    expect(planHistory(plan, sessions)).toEqual([{
      date: '2026-03-01 10:00',
      day: 'Día eliminado',
      dayId: 'dx',
      exercises: [{ id: 'abcdef123456', name: 'Ejercicio eliminado (abcdef12)', sets: ['40 kg × 10'] }],
    }]);
  });

  it('nombra los ejercicios que se movieron a otro día', () => {
    const moved = { ...plan, days: [{ ...plan.days[0], exercises: [] }, { id: 'd2', label: 'Pierna', color: '#eab308', exercises: [plan.days[0].exercises[0]] }] };
    const sessions = [session(new Date(2026, 2, 1, 10, 0), { e1: { 1: done('60', '8') } })];
    expect(planHistory(moved, sessions)[0].exercises).toEqual([{ id: 'e1', name: 'Press banca', sets: ['60 kg × 8'] }]);
  });

  it('omite ejercicios sin series hechas', () => {
    const sessions = [session(new Date(2026, 2, 1, 10, 0), { e1: { 1: { weight: '60', reps: '8', done: false } } })];
    expect(planHistory(plan, sessions)[0].exercises).toEqual([]);
  });
});

describe('planFileName', () => {
  it('nombre de archivo', () => {
    expect(planFileName({ name: 'Torso / Pierna' }, now)).toBe('reps-plan-torso-pierna-2026-11-10.json');
    expect(planFileName({ name: 'Fuerza 5×5' }, now)).toBe('reps-plan-fuerza-5-5-2026-11-10.json');
    expect(planFileName({ name: '' }, now)).toBe('reps-plan-plan-2026-11-10.json');
  });
});

const fileText = (overrides = {}) => JSON.stringify({ ...createPlanFile(plan, [], now), ...overrides });

const withPlan = (patch) => fileText({ plan: { ...plan, ...patch } });

const withDay = (patch) => withPlan({ days: [{ ...plan.days[0], ...patch }] });

const withExercise = (patch) => withDay({ exercises: [{ ...plan.days[0].exercises[0], ...patch }] });

describe('parsePlanFile', () => {
  it('acepta lo que exporta createPlanFile', () => {
    const sessions = [session(new Date(2026, 2, 1, 10, 0), { e1: { 1: done('60', '8') } })];
    expect(parsePlanFile(JSON.stringify(createPlanFile(plan, sessions, now)))).toEqual({ ok: true, plan });
  });

  it('acepta un archivo sin history ni instructions', () => {
    expect(parsePlanFile(fileText({ history: undefined, instructions: undefined }))).toEqual({ ok: true, plan });
  });

  it('acepta JSON con BOM o entre vallas de código', () => {
    const json = fileText();
    expect(parsePlanFile(`\uFEFF${json}`)).toEqual({ ok: true, plan });
    expect(parsePlanFile(`\`\`\`json\n${json}\n\`\`\``)).toEqual({ ok: true, plan });
    expect(parsePlanFile(`  \`\`\`\n${json}\n\`\`\`\n`)).toEqual({ ok: true, plan });
  });

  it('arregla tipos sueltos', () => {
    const text = withPlan({
      days: [
        { ...plan.days[0], exercises: [{ id: 'e1', name: 'Press', sets: '4', reps: 8 }] },
        { label: 'Pierna', exercises: [] },
      ],
    });
    const result = parsePlanFile(text);
    expect(result.ok).toBe(true);
    expect(result.plan.days[0].exercises[0]).toEqual({ id: 'e1', name: 'Press', sets: 4, reps: '8', allowBW: false, notes: '' });
    const newDay = result.plan.days[1];
    expect(typeof newDay.id).toBe('string');
    expect(newDay.id).not.toBe('');
    expect(PALETTE).toContain(newDay.color);
    expect(newDay.color).not.toBe(plan.days[0].color);
  });

  it('notas null cuentan como vacías', () => {
    expect(parsePlanFile(withExercise({ notes: null }))).toEqual({ ok: true, plan });
  });

  it('convierte allowBW a booleano', () => {
    expect(parsePlanFile(withExercise({ allowBW: 1 })).plan.days[0].exercises[0].allowBW).toBe(true);
  });

  it('da ids nuevos a lo que llega sin id', () => {
    const result = parsePlanFile(withPlan({ id: undefined, days: [{ label: 'D', exercises: [{ name: 'S', sets: 3, reps: '8' }] }] }));
    expect(result.ok).toBe(true);
    expect(typeof result.plan.id).toBe('string');
    expect(typeof result.plan.days[0].id).toBe('string');
    expect(typeof result.plan.days[0].exercises[0].id).toBe('string');
  });

  it('acepta un plan sin días', () => {
    expect(parsePlanFile(withPlan({ days: undefined }))).toEqual({ ok: true, plan: { ...plan, days: [] } });
  });

  it('quita campos desconocidos', () => {
    const text = withPlan({
      extra: 1,
      days: [{ ...plan.days[0], extra: 1, exercises: [{ ...plan.days[0].exercises[0], extra: 1 }] }],
    });
    expect(parsePlanFile(text)).toEqual({ ok: true, plan });
  });

  it.each([
    ['sets cero', withExercise({ sets: 0 })],
    ['sets desmesurado', withExercise({ sets: 101 })],
    ['sets con decimales', withExercise({ sets: '3.5' })],
    ['ejercicio sin nombre', withExercise({ name: undefined })],
    ['día sin etiqueta', withDay({ label: undefined })],
    ['plan sin nombre', withPlan({ name: undefined })],
    ['notas no texto', withExercise({ notes: 5 })],
    ['days no array', withPlan({ days: {} })],
    ['plan ausente', fileText({ plan: undefined })],
  ])('rechaza planes rotos: %s', (_label, text) => {
    expect(parsePlanFile(text)).toEqual({ ok: false, reason: 'invalid' });
  });

  it.each([
    ['texto no JSON', 'no es json'],
    ['otro JSON', '{"hola":1}'],
    ['otra app', fileText({ app: 'otra' })],
    ['null', 'null'],
    ['versión 0', fileText({ version: 0 })],
    ['versión no entera', fileText({ version: '2' })],
  ])('rechaza lo que no es un plan: %s', (_label, text) => {
    expect(parsePlanFile(text)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('reconoce una copia completa', () => {
    const plansState = { activePlanId: 'p1', plans: [plan] };
    expect(parsePlanFile(JSON.stringify(createBackup(plansState, [], now)))).toEqual({ ok: false, reason: 'backup' });
  });

  it('versión más nueva', () => {
    expect(parsePlanFile(fileText({ version: 3 }))).toEqual({ ok: false, reason: 'newer' });
  });
});

describe('readPlanFile', () => {
  it('lee y valida el archivo', async () => {
    const file = new File([fileText()], 'plan.json', { type: 'application/json' });
    expect(await readPlanFile(file)).toEqual({ ok: true, plan });
  });

  it('un archivo ilegible no es válido', async () => {
    const file = { text: () => Promise.reject(new Error('boom')) };
    expect(await readPlanFile(file)).toEqual({ ok: false, reason: 'invalid' });
  });
});
