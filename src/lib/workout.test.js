import { describe, expect, it } from 'vitest';
import { countDone, formatElapsed, nextGroupIndex, pendingStep, stepReps, stepWeight } from './workout.js';

const ex = (id, sets = 2) => ({ id, name: id, sets, reps: '8' });

const done = (...sets) => Object.fromEntries(sets.map(n => [n, { weight: '10', reps: '8', done: true }]));

describe('formatElapsed', () => {
  it.each([[0, '00:00'], [65, '01:05'], [3661, '1:01:01']])('%i s → %s', (seconds, text) => {
    expect(formatElapsed(seconds)).toBe(text);
  });
});

describe('stepWeight', () => {
  it.each([
    ['', 1, '1'],
    ['4', 1, '5'],
    ['19', 1, '20'],
    ['20', 1, '22.5'],
    ['60', 1, '62.5'],
    ['62,5', 1, '65'],
    ['62.5', -1, '60'],
    ['22.5', -1, '20'],
    ['20', -1, '19'],
    ['1', -1, ''],
    ['', -1, ''],
    ['PC', 1, '1'],
  ])('%s con %i → %s', (value, direction, expected) => {
    expect(stepWeight(value, direction)).toBe(expected);
  });
});

describe('stepReps', () => {
  it.each([['', 1, '1'], ['7', 1, '8'], ['7', -1, '6'], ['1', -1, ''], ['', -1, ''], ['5-7', 1, '6']])(
    '%s con %i → %s',
    (value, direction, expected) => {
      expect(stepReps(value, direction)).toBe(expected);
    },
  );
});

describe('countDone', () => {
  it('cuenta solo las series del plan marcadas como hechas', () => {
    const workout = { a: { 1: { done: true }, 2: { done: false }, 3: { done: true } } };
    expect(countDone(workout, ex('a', 2))).toBe(1);
    expect(countDone({}, ex('a'))).toBe(0);
  });
});

describe('pendingStep', () => {
  const pair = { superset: true, exercises: [ex('a'), ex('b')] };

  it('es la primera serie sin hacer siguiendo el orden de rondas', () => {
    const step = pendingStep(pair, { a: done(1) });
    expect([step.exercise.id, step.set]).toEqual(['b', 1]);
  });

  it('no hay ninguna cuando el grupo está completo', () => {
    expect(pendingStep(pair, { a: done(1, 2), b: done(1, 2) })).toBeNull();
  });
});

describe('nextGroupIndex', () => {
  const groups = [
    { superset: false, exercises: [ex('a')] },
    { superset: false, exercises: [ex('b')] },
    { superset: false, exercises: [ex('c')] },
  ];

  it('busca hacia delante el siguiente grupo con series por hacer', () => {
    expect(nextGroupIndex(groups, { b: done(1, 2) }, 0)).toBe(2);
  });

  it('da la vuelta si lo pendiente quedó atrás', () => {
    expect(nextGroupIndex(groups, { b: done(1, 2), c: done(1, 2) }, 1)).toBe(0);
  });

  it('devuelve el mismo grupo si es el único con series por hacer', () => {
    expect(nextGroupIndex(groups, { b: done(1, 2), c: done(1, 2) }, 0)).toBe(0);
  });

  it('no hay siguiente cuando todo está hecho', () => {
    expect(nextGroupIndex(groups, { a: done(1, 2), b: done(1, 2), c: done(1, 2) }, 0)).toBeNull();
  });
});
