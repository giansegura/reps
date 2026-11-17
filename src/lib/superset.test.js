import { describe, expect, it } from 'vitest';
import { groupExercises, groupSteps, linkSuperset, restAfterStep, supersetPartners, unlinkSuperset } from './superset.js';

const ex = (id, extra = {}) => ({ id, name: id, sets: 3, reps: '10', ...extra });

const ids = (exercises) => exercises.map(e => e.id);

const shape = (exercises) => groupExercises(exercises).map(group => ids(group.exercises).join('+'));

describe('groupExercises', () => {
  it('une los ejercicios seguidos con la misma etiqueta', () => {
    const list = [ex('a'), ex('b', { superset: 'A' }), ex('c', { superset: 'A' }), ex('d')];
    expect(shape(list)).toEqual(['a', 'b+c', 'd']);
    expect(groupExercises(list).map(g => g.superset)).toEqual([false, true, false]);
  });

  it('no une etiquetas iguales que no van seguidas ni etiquetas distintas', () => {
    expect(shape([ex('a', { superset: 'A' }), ex('b'), ex('c', { superset: 'A' })])).toEqual(['a', 'b', 'c']);
    expect(shape([ex('a', { superset: 'A' }), ex('b', { superset: 'B' })])).toEqual(['a', 'b']);
  });

  it('un ejercicio con etiqueta pero sin pareja no es superserie', () => {
    expect(groupExercises([ex('a', { superset: 'A' })])[0].superset).toBe(false);
  });

  it('ignora etiquetas vacías', () => {
    expect(shape([ex('a', { superset: ' ' }), ex('b', { superset: ' ' })])).toEqual(['a', 'b']);
  });
});

describe('supersetPartners', () => {
  it('devuelve los demás del grupo', () => {
    const list = [ex('a', { superset: 'A' }), ex('b', { superset: 'A' }), ex('c')];
    expect(ids(supersetPartners(list, 'a'))).toEqual(['b']);
    expect(supersetPartners(list, 'c')).toEqual([]);
    expect(supersetPartners(list, 'zz')).toEqual([]);
  });
});

describe('groupSteps', () => {
  const steps = (group) => groupSteps(group).map(step => `${step.exercise.id}${step.set}`);

  it('un ejercicio solo va serie a serie', () => {
    expect(steps({ superset: false, exercises: [ex('a')] })).toEqual(['a1', 'a2', 'a3']);
  });

  it('una superserie alterna por rondas', () => {
    expect(steps({ superset: true, exercises: [ex('a'), ex('b')] })).toEqual(['a1', 'b1', 'a2', 'b2', 'a3', 'b3']);
  });

  it('si uno tiene menos series, deja de salir en las rondas que le sobran', () => {
    expect(steps({ superset: true, exercises: [ex('a'), ex('b', { sets: 2 })] })).toEqual(['a1', 'b1', 'a2', 'b2', 'a3']);
  });
});

describe('restAfterStep', () => {
  const a = ex('a', { rest: 60 });
  const b = ex('b', { rest: 90 });
  const pair = { superset: true, exercises: [a, b] };

  it('dentro de la ronda no hay descanso', () => {
    expect(restAfterStep(pair, { exercise: a, set: 1 })).toBeNull();
  });

  it('al acabar la ronda se descansa lo que marca el último ejercicio', () => {
    expect(restAfterStep(pair, { exercise: b, set: 1 })).toBe(90);
    expect(restAfterStep(pair, { exercise: b, set: 3 })).toBe(90);
  });

  it('un ejercicio solo descansa siempre, 120 s si no dice otra cosa', () => {
    expect(restAfterStep({ superset: false, exercises: [a] }, { exercise: a, set: 1 })).toBe(60);
    expect(restAfterStep({ superset: false, exercises: [ex('c')] }, { exercise: ex('c'), set: 1 })).toBe(120);
  });
});

describe('linkSuperset', () => {
  it('etiqueta a los dos y pone el ejercicio justo detrás de su pareja', () => {
    const linked = linkSuperset([ex('a'), ex('b'), ex('c'), ex('d')], 'd', 'a');
    expect(shape(linked)).toEqual(['a+d', 'b', 'c']);
  });

  it('se une al final de un grupo que ya existe', () => {
    const list = [ex('a', { superset: 'A' }), ex('b', { superset: 'A' }), ex('c')];
    expect(shape(linkSuperset(list, 'c', 'a'))).toEqual(['a+b+c']);
  });

  it('usa una etiqueta que no esté cogida en el día', () => {
    const list = [ex('a', { superset: 'A' }), ex('b', { superset: 'A' }), ex('c'), ex('d')];
    const linked = linkSuperset(list, 'd', 'c');
    expect(shape(linked)).toEqual(['a+b', 'c+d']);
    expect(linked.find(e => e.id === 'c').superset).toBe('B');
  });

  it('cambiar de pareja deshace la superserie anterior', () => {
    const list = [ex('a', { superset: 'A' }), ex('b', { superset: 'A' }), ex('c')];
    const linked = linkSuperset(list, 'a', 'c');
    expect(shape(linked)).toEqual(['b', 'c+a']);
    expect(linked.find(e => e.id === 'b').superset).toBeUndefined();
  });

  it('no hace nada si la pareja no existe o es el mismo ejercicio', () => {
    const list = [ex('a'), ex('b')];
    expect(linkSuperset(list, 'a', 'a')).toBe(list);
    expect(linkSuperset(list, 'a', 'zz')).toBe(list);
  });
});

describe('unlinkSuperset', () => {
  it('deshace una pareja', () => {
    const list = [ex('a', { superset: 'A' }), ex('b', { superset: 'A' }), ex('c')];
    const unlinked = unlinkSuperset(list, 'a');
    expect(shape(unlinked)).toEqual(['b', 'a', 'c']);
    expect(unlinked.some(e => 'superset' in e)).toBe(false);
  });

  it('al sacar uno de tres, los otros dos siguen juntos', () => {
    const list = [ex('a', { superset: 'A' }), ex('b', { superset: 'A' }), ex('c', { superset: 'A' })];
    expect(shape(unlinkSuperset(list, 'b'))).toEqual(['a+c', 'b']);
  });

  it('quita una etiqueta suelta sin mover nada', () => {
    const unlinked = unlinkSuperset([ex('a', { superset: 'A' }), ex('b')], 'a');
    expect(ids(unlinked)).toEqual(['a', 'b']);
    expect('superset' in unlinked[0]).toBe(false);
  });
});
