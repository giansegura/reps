import { describe, expect, it } from 'vitest';
import { suggestDay } from './today.js';

const day = (id, exercises = [{ id: `${id}-e`, name: 'x', sets: 3, reps: '8' }]) => ({ id, label: id, color: '#000000', exercises });

const days = [day('d1'), day('vacio', []), day('d2'), day('d3')];

const session = (dayId, date, planId = 'p1') => ({ planId, dayId, date: date.toISOString(), exercises: {}, notes: {} });

const now = new Date(2026, 10, 17, 12);

const suggest = (sessions, list = days) => {
  const { doneToday, next } = suggestDay(list, sessions, 'p1', now);
  return { doneToday: doneToday?.id ?? null, next: next?.id ?? null };
};

describe('suggestDay', () => {
  it('sin entrenos toca el primer día con ejercicios', () => {
    expect(suggest([])).toEqual({ doneToday: null, next: 'd1' });
    expect(suggest([], [day('vacio', []), day('d2')])).toEqual({ doneToday: null, next: 'd2' });
  });

  it('toca el día siguiente al último entrenado, saltando los vacíos', () => {
    expect(suggest([session('d1', new Date(2026, 10, 16, 10))])).toEqual({ doneToday: null, next: 'd2' });
  });

  it('después del último día vuelve al primero', () => {
    expect(suggest([session('d3', new Date(2026, 10, 14, 10))])).toEqual({ doneToday: null, next: 'd1' });
  });

  it('manda el entreno más reciente aunque no sea el último de la lista', () => {
    const sessions = [session('d2', new Date(2026, 10, 15, 10)), session('d1', new Date(2026, 10, 10, 10))];
    expect(suggest(sessions)).toEqual({ doneToday: null, next: 'd3' });
  });

  it('si ya has entrenado hoy lo dice y propone el siguiente', () => {
    expect(suggest([session('d2', new Date(2026, 10, 17, 9))])).toEqual({ doneToday: 'd2', next: 'd3' });
  });

  it('ignora entrenos de otros planes y de días que ya no existen', () => {
    const sessions = [session('d2', new Date(2026, 10, 16, 10), 'p2'), session('borrado', new Date(2026, 10, 16, 11))];
    expect(suggest(sessions)).toEqual({ doneToday: null, next: 'd1' });
  });

  it('sin días con ejercicios no propone nada', () => {
    expect(suggest([], [day('vacio', [])])).toEqual({ doneToday: null, next: null });
    expect(suggest([], [])).toEqual({ doneToday: null, next: null });
  });
});
