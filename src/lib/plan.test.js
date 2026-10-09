import { describe, expect, it } from 'vitest';
import { MAX_SETS, parseSets } from './plan.js';

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
