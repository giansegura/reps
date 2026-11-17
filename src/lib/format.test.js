import { describe, expect, it } from 'vitest';
import {
  formatDayAgo,
  formatLongDate,
  formatRest,
  formatSet,
  formatSets,
  formatShortDate,
  formatWeight,
} from './format.js';

describe('formatWeight', () => {
  it('formatea kilos con coma decimal', () => {
    expect(formatWeight('62.5')).toBe('62,5 kg');
    expect(formatWeight('0')).toBe('0 kg');
  });

  it('respeta peso corporal', () => {
    expect(formatWeight('PC')).toBe('PC');
  });

  it('devuelve null si no es un número', () => {
    expect(formatWeight('')).toBeNull();
    expect(formatWeight('abc')).toBeNull();
    expect(formatWeight(undefined)).toBeNull();
  });
});

describe('fechas cortas', () => {
  const tuesday = new Date(2026, 10, 17, 12);

  it('día de la semana, día y mes sin puntos ni comas', () => {
    expect(formatShortDate(tuesday)).toBe('mar 17 nov');
    expect(formatLongDate(tuesday)).toBe('martes 17 nov');
  });

  it('hoy, ayer o la fecha', () => {
    expect(formatDayAgo(new Date(2026, 10, 17, 8).toISOString(), tuesday)).toBe('hoy');
    expect(formatDayAgo(new Date(2026, 10, 16, 23).toISOString(), tuesday)).toBe('ayer');
    expect(formatDayAgo(new Date(2026, 10, 10, 10).toISOString(), tuesday)).toBe('mar 10 nov');
  });
});

describe('formatRest', () => {
  it.each([[45, '0:45'], [60, '1:00'], [150, '2:30']])('%i s → %s', (seconds, text) => {
    expect(formatRest(seconds)).toBe(text);
  });
});

describe('formatSet y formatSets', () => {
  it('una serie con peso y repeticiones', () => {
    expect(formatSet({ weight: '57.5', reps: '7' })).toBe('57,5 kg × 7');
    expect(formatSet({ weight: 'PC', reps: '12' })).toBe('PC × 12');
    expect(formatSet({ weight: '', reps: '' })).toBe('— × —');
    expect(formatSet(undefined)).toBe('— × —');
  });

  it('agrupa las series que comparten peso', () => {
    const sets = [{ weight: '60', reps: '6' }, { weight: '60', reps: '6' }, { weight: '60', reps: '5' }];
    expect(formatSets(sets)).toBe('60 kg × 6 · 6 · 5');
  });

  it('las separa si el peso cambia', () => {
    expect(formatSets([{ weight: '70', reps: '5' }, { weight: '60', reps: '7' }])).toBe('70 kg × 5 · 60 kg × 7');
    expect(formatSets([])).toBe('');
  });
});
