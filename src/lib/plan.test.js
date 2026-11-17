import { describe, expect, it } from 'vitest';
import { DEFAULT_REST, MAX_REST, MAX_SETS, MIN_REST, parseRest, parseSets, restOf, stepRest } from './plan.js';

describe('parseSets', () => {
  it.each([
    ['1', 1],
    ['4', 4],
    [String(MAX_SETS), MAX_SETS],
  ])('acepta %s', (value, expected) => {
    expect(parseSets(value)).toBe(expected);
  });

  it.each(['', '0', '-2', '2.5', 'abc', String(MAX_SETS + 1)])('rechaza "%s"', (value) => {
    expect(parseSets(value)).toBeNull();
  });
});

describe('parseRest', () => {
  it.each([[MIN_REST, MIN_REST], [90, 90], ['90', 90], [' 120 ', 120], [MAX_REST, MAX_REST]])('acepta %s', (value, expected) => {
    expect(parseRest(value)).toBe(expected);
  });

  it.each([0, MIN_REST - 1, MAX_REST + 1, 90.5, '90.5', 'abc', '', null, undefined, true])('rechaza %s', (value) => {
    expect(parseRest(value)).toBeNull();
  });
});

describe('restOf', () => {
  it('usa el descanso del ejercicio o el de siempre', () => {
    expect(restOf({ rest: 60 })).toBe(60);
    expect(restOf({})).toBe(DEFAULT_REST);
  });
});

describe('stepRest', () => {
  it('sube y baja de 15 en 15 segundos sin salirse de los límites', () => {
    expect(stepRest(120, 1)).toBe(135);
    expect(stepRest(120, -1)).toBe(105);
    expect(stepRest(MIN_REST, -1)).toBe(MIN_REST);
    expect(stepRest(MAX_REST, 1)).toBe(MAX_REST);
  });
});
