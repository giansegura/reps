import { describe, expect, it } from 'vitest';
import {
  exerciseUnit,
  formatChange,
  formatProgressValue,
  periodAriaLabel,
  periodLabel,
  progressSeries,
} from './progress.js';

const now = new Date(2026, 9, 21, 12);
const exercise = { id: 'e1', reps: '8' };

const set = (weight, reps, done = true) => ({ weight, reps, done });

const session = (date, sets, { planId = 'p1', exId = 'e1' } = {}) => ({
  planId,
  dayId: 'd1',
  date: date.toISOString(),
  exercises: { [exId]: Object.fromEntries(sets.map((s, i) => [i + 1, s])) },
  notes: {},
});

const series = (sessions, options = {}, ex = exercise) =>
  progressSeries(sessions, 'p1', ex, { period: 'week', metric: 'volume', now, ...options });

describe('progressSeries · periodos', () => {
  it('agrupa por semanas de lunes a domingo', () => {
    const result = series([session(new Date(2026, 9, 19, 10), [set('60', '8'), set('60', '8')])]);
    expect(result.periods).toHaveLength(8);
    expect(result.periods[0].start).toEqual(new Date(2026, 7, 31));
    expect(result.periods.at(-1).value).toBe(960);
  });

  it('domingo 23:30 cae en la semana anterior', () => {
    const result = series([session(new Date(2026, 9, 18, 23, 30), [set('50', '8')])]);
    expect(result.periods.at(-2).value).toBe(400);
    expect(result.periods.at(-1).value).toBe(0);
  });

  it('agrupa por meses', () => {
    const result = series([session(new Date(2026, 9, 3, 10), [set('50', '8')])], { period: 'month' });
    expect(result.periods).toHaveLength(6);
    expect(result.periods[0].start).toEqual(new Date(2026, 4, 1));
    expect(result.periods.at(-1).value).toBe(400);
  });
});

describe('progressSeries · cambio', () => {
  it('compara con el mismo tramo de la semana anterior', () => {
    const result = series([
      session(new Date(2026, 9, 13, 10), [set('50', '8')]),
      session(new Date(2026, 9, 15, 10), [set('50', '8')]),
      session(new Date(2026, 9, 19, 10), [set('60', '8')]),
    ]);
    expect(result.previous).toBe(400);
    expect(result.current).toBe(480);
    expect(result.change).toBe(20);
    expect(result.periods.at(-2).value).toBe(800);
  });

  it('mes anterior más corto', () => {
    const result = progressSeries(
      [
        session(new Date(2026, 1, 27, 10), [set('50', '8')]),
        session(new Date(2026, 2, 2, 10), [set('60', '8')]),
      ],
      'p1',
      exercise,
      { period: 'month', metric: 'volume', now: new Date(2026, 2, 31, 12) },
    );
    expect(result.previous).toBe(400);
    expect(result.change).toBe(20);
  });

  it('el último día del mes anterior más corto cuenta entero', () => {
    const result = progressSeries(
      [
        session(new Date(2026, 1, 28, 20), [set('50', '8')]),
        session(new Date(2026, 2, 2, 10), [set('60', '8')]),
      ],
      'p1',
      exercise,
      { period: 'month', metric: 'volume', now: new Date(2026, 2, 31, 12) },
    );
    expect(result.previous).toBe(400);
    expect(result.change).toBe(20);
  });

  it('sin cambio si el periodo actual está vacío o el tramo anterior vale 0', () => {
    expect(series([session(new Date(2026, 9, 13, 10), [set('50', '8')])]).change).toBeNull();
    expect(series([session(new Date(2026, 9, 19, 10), [set('50', '8')])]).change).toBeNull();
  });
});

describe('progressSeries · series y unidades', () => {
  it('solo cuentan las series hechas y con reps válidas', () => {
    const result = series([session(new Date(2026, 9, 19, 10), [
      set('60', '8'),
      set('60', '8', false),
      set('60', ''),
      set('60', '0'),
    ])]);
    expect(result.current).toBe(480);
  });

  it('lee la coma decimal', () => {
    expect(series([session(new Date(2026, 9, 19, 10), [set('62,5', '8')])]).current).toBe(500);
  });

  it('PC no suma en kilos', () => {
    const sessions = [session(new Date(2026, 9, 19, 10), [set('60', '8'), set('PC', '10')])];
    expect(exerciseUnit(sessions, 'p1', exercise)).toBe('kg');
    expect(series(sessions).current).toBe(480);
  });

  it('solo peso corporal cuenta repeticiones', () => {
    const sessions = [session(new Date(2026, 9, 19, 10), [set('PC', '10'), set('PC', '8')])];
    expect(exerciseUnit(sessions, 'p1', exercise)).toBe('reps');
    expect(series(sessions).current).toBe(18);
    expect(series(sessions, { metric: 'max' }).current).toBe(10);
  });

  it('objetivo en segundos cuenta segundos', () => {
    const plank = { id: 'e1', reps: '30-45s' };
    const sessions = [session(new Date(2026, 9, 19, 10), [set('PC', '40')])];
    expect(exerciseUnit(sessions, 'p1', plank)).toBe('s');
    expect(series(sessions, {}, plank)).toMatchObject({ unit: 's', current: 40 });
  });

  it('peso máximo', () => {
    const sessions = [session(new Date(2026, 9, 19, 10), [set('60', '8'), set('70', '5')])];
    expect(series(sessions, { metric: 'max' }).current).toBe(70);
  });

  it('ignora otros planes y otros ejercicios', () => {
    const result = series([
      session(new Date(2026, 9, 19, 10), [set('60', '8')], { planId: 'p2' }),
      session(new Date(2026, 9, 19, 10), [set('60', '8')], { exId: 'e2' }),
    ]);
    expect(result.current).toBe(0);
    expect(result.empty).toBe(true);
  });

  it('empty sin series contadas', () => {
    expect(series([]).empty).toBe(true);
    expect(series([session(new Date(2026, 9, 1, 10), [set('60', '8', false)])]).empty).toBe(true);
    expect(series([session(new Date(2025, 0, 1, 10), [set('60', '8')])]).empty).toBe(false);
  });
});

describe('formateadores', () => {
  it('formatProgressValue', () => {
    expect(formatProgressValue(1080, 'kg')).toBe('1.080 kg');
    expect(formatProgressValue(32, 'reps')).toBe('32 reps');
    expect(formatProgressValue(150, 's')).toBe('150 s');
  });

  it('formatChange', () => {
    expect(formatChange(20)).toBe('▲ 20 %');
    expect(formatChange(-4)).toBe('▼ 4 %');
    expect(formatChange(0)).toBe('= 0 %');
  });

  it('periodLabel', () => {
    expect(periodLabel(new Date(2026, 9, 5), new Date(2026, 8, 28), 'week')).toBe('5 oct');
    expect(periodLabel(new Date(2026, 9, 12), new Date(2026, 9, 5), 'week')).toBe('12');
    expect(periodLabel(new Date(2026, 9, 1), null, 'month')).toBe('oct');
  });

  it('periodAriaLabel', () => {
    expect(periodAriaLabel(new Date(2026, 9, 5), 'week')).toBe('Semana del 5 oct');
    expect(periodAriaLabel(new Date(2026, 9, 1), 'month')).toBe('octubre de 2026');
  });
});
