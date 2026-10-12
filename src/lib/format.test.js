import { describe, expect, it } from 'vitest';
import { formatDate, formatWeight, getLastWeight } from './format.js';

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

describe('getLastWeight', () => {
  const session = { exercises: { e1: { 1: { weight: '60', reps: '8' } } } };

  it('devuelve el peso de la primera serie', () => {
    expect(getLastWeight(session, 'e1')).toBe('60');
  });

  it('devuelve null sin entreno o sin ese ejercicio', () => {
    expect(getLastWeight(undefined, 'e1')).toBeNull();
    expect(getLastWeight(session, 'e2')).toBeNull();
  });
});

describe('formatDate', () => {
  it('incluye día, mes abreviado y año en español', () => {
    const text = formatDate('2026-10-09T12:00:00.000Z');
    expect(text).toContain('2026');
    expect(text).toMatch(/oct/);
  });
});
