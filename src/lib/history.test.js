import { describe, expect, it } from 'vitest';
import { historyFileName, renderHistory } from './history.js';

const plans = {
  activePlanId: 'p1',
  plans: [{
    id: 'p1',
    name: 'Fuerza',
    days: [{
      id: 'd1',
      label: 'Empuje',
      color: '#22c55e',
      exercises: [
        { id: 'bench', name: 'Press banca', sets: 4, reps: '8' },
        { id: 'dips', name: 'Fondos', sets: 3, reps: 'máx', allowBW: true },
      ],
    }],
  }],
};

const at = (y, m, d, h = 10, min = 0) => new Date(y, m - 1, d, h, min).toISOString();

const session = (overrides = {}) => ({
  planId: 'p1',
  dayId: 'd1',
  date: at(2026, 3, 1, 10, 15),
  exercises: { bench: { 1: { weight: '70', reps: '8', done: true }, 2: { weight: '72.5', reps: '6', done: true } } },
  notes: {},
  ...overrides,
});

const now = new Date(2026, 9, 26, 18, 32);

describe('historyFileName', () => {
  it('usa la fecha local y extensión markdown', () => {
    expect(historyFileName(now)).toBe('reps-historial-2026-10-26.md');
  });
});

describe('renderHistory · cabecera', () => {
  it('explica contexto, recuento y rango de fechas', () => {
    const text = renderHistory(plans, [session(), session({ date: at(2026, 10, 25) })], now);
    expect(text).toContain('# Historial de entrenamientos · Reps');
    expect(text).toContain('Exportado: 2026-10-26 18:32');
    expect(text).toContain('Entrenos: 2 (del 2026-03-01 al 2026-10-25)');
    expect(text).toContain('Pesos en kg. «PC» = peso corporal, sin carga añadida.');
    expect(text).toContain('Solo se incluyen las series marcadas como hechas. Formato: peso × repeticiones.');
  });
});

describe('renderHistory · planes', () => {
  it('lista cada plan con sus días y ejercicios', () => {
    const text = renderHistory(plans, [session()], now);
    expect(text).toContain('## Planes\n\n### Fuerza\n- Empuje: Press banca (4×8), Fondos (3×máx)\n');
  });
});

describe('renderHistory · entrenos', () => {
  it('cabecera con fecha local, día de la semana, hora, plan y día', () => {
    const text = renderHistory(plans, [session()], now);
    expect(text).toContain('## Entrenos\n\n### 2026-03-01 · domingo 10:15 · Fuerza › Empuje\n');
  });

  it('lista las series hechas como peso × repeticiones', () => {
    const text = renderHistory(plans, [session()], now);
    expect(text).toContain('\n- Press banca: 70 kg × 8, 72.5 kg × 6\n');
  });
});

describe('renderHistory · series', () => {
  const withSets = (sets) => renderHistory(plans, [session({ exercises: { bench: sets } })], now);

  it('muestra PC para peso corporal', () => {
    expect(withSets({ 1: { weight: 'PC', reps: '12', done: true } })).toContain('- Press banca: PC × 12\n');
  });

  it('omite las series no marcadas como hechas', () => {
    const text = withSets({ 1: { weight: '70', reps: '8', done: true }, 2: { weight: '70', reps: '8', done: false }, 3: { weight: '70', reps: '', done: false } });
    expect(text).toContain('- Press banca: 70 kg × 8\n');
  });

  it('normaliza la coma decimal a punto', () => {
    expect(withSets({ 1: { weight: '72,5', reps: '6', done: true } })).toContain('- Press banca: 72.5 kg × 6\n');
  });

  it('marca con — el peso o las repeticiones que falten', () => {
    const text = withSets({ 1: { weight: '', reps: '8', done: true }, 2: { weight: '70', reps: '', done: true } });
    expect(text).toContain('- Press banca: — × 8, 70 kg × —\n');
  });

  it('omite el ejercicio si no tiene ninguna serie hecha', () => {
    const text = withSets({ 1: { weight: '70', reps: '8', done: false } });
    expect(text).not.toContain('Press banca:');
  });

  it('añade la nota del ejercicio debajo de sus series', () => {
    const text = renderHistory(plans, [session({ notes: { bench: 'Hombro molesto' } })], now);
    expect(text).toContain('- Press banca: 70 kg × 8, 72.5 kg × 6\n  Nota: "Hombro molesto"\n');
  });

  it('mantiene una nota de varias líneas en una sola línea para no romper la estructura', () => {
    const note = 'Hombro molesto\n- Otro ejercicio: 1 kg × 1\n\n### Otra sesión';
    const text = renderHistory(plans, [session({ notes: { bench: note } })], now);
    expect(text).toContain('  Nota: "Hombro molesto / - Otro ejercicio: 1 kg × 1 / ### Otra sesión"\n');
    expect(text).not.toContain('\n- Otro ejercicio');
    expect(text).not.toContain('\n### Otra sesión');
  });
});

describe('renderHistory · orden y datos huérfanos', () => {
  it('ordena los entrenos del más antiguo al más reciente', () => {
    const text = renderHistory(plans, [session({ date: at(2026, 10, 25) }), session()], now);
    expect(text.indexOf('### 2026-03-01')).toBeLessThan(text.indexOf('### 2026-10-25'));
  });

  it('sigue el orden de ejercicios del plan, no el de la sesión', () => {
    const exercises = {
      dips: { 1: { weight: 'PC', reps: '10', done: true } },
      bench: { 1: { weight: '70', reps: '8', done: true } },
    };
    const text = renderHistory(plans, [session({ exercises })], now);
    expect(text).toContain('- Press banca: 70 kg × 8\n- Fondos: PC × 10\n');
  });

  it('conserva las series de un ejercicio que ya no está en el plan, al final', () => {
    const exercises = {
      'f0e1d2c3-aaaa': { 1: { weight: '30', reps: '12', done: true } },
      bench: { 1: { weight: '70', reps: '8', done: true } },
    };
    const text = renderHistory(plans, [session({ exercises })], now);
    expect(text).toContain('- Press banca: 70 kg × 8\n- Ejercicio eliminado (f0e1d2c3): 30 kg × 12\n');
  });

  it('indica cuando el día ya no existe en el plan', () => {
    const text = renderHistory(plans, [session({ dayId: 'nope' })], now);
    expect(text).toContain('· Fuerza › Día eliminado\n- Ejercicio eliminado (bench): 70 kg × 8, 72.5 kg × 6\n');
  });

  it('indica cuando el plan ya no existe', () => {
    const text = renderHistory(plans, [session({ planId: 'nope' })], now);
    expect(text).toContain('· Plan eliminado › Día eliminado\n');
  });

  it('no rompe sin entrenos', () => {
    const text = renderHistory(plans, [], now);
    expect(text).toContain('Entrenos: 0\n');
    expect(text).toContain('## Entrenos\n');
  });
});
