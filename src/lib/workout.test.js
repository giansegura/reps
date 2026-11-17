import { describe, expect, it } from 'vitest';
import { countDone, formatElapsed, nextGroupIndex, pendingStep, positionText } from './workout.js';

const ex = (id, sets = 2) => ({ id, name: id, sets, reps: '8' });

const done = (...sets) => Object.fromEntries(sets.map(n => [n, { weight: '10', reps: '8', done: true }]));

describe('formatElapsed', () => {
  it.each([[0, '00:00'], [65, '01:05'], [3661, '1:01:01']])('%i s → %s', (seconds, text) => {
    expect(formatElapsed(seconds)).toBe(text);
  });
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

describe('positionText', () => {
  const groups = [
    { superset: false, exercises: [ex('a')] },
    { superset: true, exercises: [ex('b'), ex('c')] },
    { superset: true, exercises: [ex('d'), ex('e'), ex('f')] },
  ];

  it('un ejercicio solo dice su número', () => {
    expect(positionText(groups, 0)).toBe('1 de 6');
  });

  it('una pareja dice los dos', () => {
    expect(positionText(groups, 1)).toBe('2 y 3 de 6');
  });

  it('un grupo de tres o más dice del primero al último', () => {
    expect(positionText(groups, 2)).toBe('4 a 6 de 6');
  });
});
