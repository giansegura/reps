import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PlanExercise } from './PlanExercise.jsx';

const ex = (id, name, extra = {}) => ({ id, name, sets: 3, reps: '8', allowBW: false, notes: '', ...extra });

const squat = ex('e1', 'Sentadilla');

const dayWith = (exercise, others = [ex('e2', 'Gemelo'), ex('e3', 'Abdominales')]) => ({
  id: 'd1',
  label: 'Día 1',
  color: '#22c55e',
  exercises: [exercise, ...others],
});

const renderExercise = (exercise = squat, props = {}) => render(
  <PlanExercise day={dayWith(exercise)} exercise={exercise} onBack={vi.fn()} onUpdate={vi.fn()} onLink={vi.fn()} onRemove={vi.fn()} {...props} />,
);

describe('PlanExercise · series', () => {
  const sets = () => screen.getByRole('spinbutton', { name: 'Series de Sentadilla' });

  it('permite borrar el número y escribir otro', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    renderExercise(squat, { onUpdate });
    await user.clear(sets());
    await user.type(sets(), '4');
    expect(sets().value).toBe('4');
    expect(onUpdate).toHaveBeenLastCalledWith({ sets: 4 });
    expect(onUpdate).not.toHaveBeenCalledWith({ sets: 1 });
  });

  it('no guarda más series del máximo', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    renderExercise(squat, { onUpdate });
    await user.clear(sets());
    await user.type(sets(), '1000');
    expect(onUpdate).not.toHaveBeenCalledWith({ sets: 1000 });
  });

  it('vuelve al valor guardado al salir del campo vacío', async () => {
    const user = userEvent.setup();
    renderExercise();
    await user.clear(sets());
    await user.tab();
    expect(sets().value).toBe('3');
  });

  it('sube y baja con los botones, sin bajar de una', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const { unmount } = renderExercise(squat, { onUpdate });
    await user.click(screen.getByRole('button', { name: 'Una serie más' }));
    await user.click(screen.getByRole('button', { name: 'Una serie menos' }));
    expect(onUpdate.mock.calls).toEqual([[{ sets: 4 }], [{ sets: 2 }]]);
    unmount();
    renderExercise(ex('e1', 'Sentadilla', { sets: 1 }));
    expect(screen.getByRole('button', { name: 'Una serie menos' }).disabled).toBe(true);
  });
});

describe('PlanExercise · campos', () => {
  it('rotula nombre, series, repeticiones y notas', () => {
    renderExercise();
    expect(screen.getByLabelText('Nombre').value).toBe('Sentadilla');
    expect(screen.getByLabelText('Series')).toBe(screen.getByRole('spinbutton', { name: 'Series de Sentadilla' }));
    expect(screen.getByLabelText('Reps')).toBe(screen.getByRole('textbox', { name: 'Reps de Sentadilla' }));
    expect(screen.getByLabelText('Notas')).toBeTruthy();
  });

  it('guarda cada campo según se escribe', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    renderExercise(squat, { onUpdate });
    await user.type(screen.getByLabelText('Nombre'), 'x');
    await user.type(screen.getByLabelText('Reps'), '0');
    await user.type(screen.getByLabelText('Notas'), 'y');
    expect(onUpdate.mock.calls).toEqual([[{ name: 'Sentadillax' }], [{ reps: '80' }], [{ notes: 'y' }]]);
  });

  it('el interruptor de peso corporal cambia y dice su estado', async () => {
    const onUpdate = vi.fn();
    renderExercise(squat, { onUpdate });
    const toggle = screen.getByRole('switch', { name: 'Se puede hacer con peso corporal' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    await userEvent.setup().click(toggle);
    expect(onUpdate).toHaveBeenCalledWith({ allowBW: true });
  });

  it('un ejercicio nuevo abre con el foco en el nombre', () => {
    renderExercise(ex('e1', ''));
    expect(document.activeElement).toBe(screen.getByLabelText('Nombre'));
  });
});

describe('PlanExercise · aviso de descanso', () => {
  it('sin configurar son dos minutos y cambia de 15 en 15 segundos', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    renderExercise(squat, { onUpdate });
    expect(screen.getByRole('status').textContent).toBe('2:00');
    await user.click(screen.getByRole('button', { name: 'Más descanso' }));
    await user.click(screen.getByRole('button', { name: 'Menos descanso' }));
    expect(onUpdate.mock.calls).toEqual([[{ rest: 135 }], [{ rest: 105 }]]);
  });

  it('enseña el descanso guardado y no baja del mínimo', () => {
    const { unmount } = renderExercise(ex('e1', 'Sentadilla', { rest: 60 }));
    expect(screen.getByRole('status').textContent).toBe('1:00');
    unmount();
    renderExercise(ex('e1', 'Sentadilla', { rest: 15 }));
    expect(screen.getByRole('button', { name: 'Menos descanso' }).disabled).toBe(true);
  });
});

describe('PlanExercise · superserie', () => {
  const select = () => screen.getByRole('combobox', { name: 'Superserie con' });

  it('ofrece los demás ejercicios del día y enlaza con el elegido', async () => {
    const onLink = vi.fn();
    renderExercise(squat, { onLink });
    expect([...select().options].map(o => o.textContent)).toEqual(['Ninguno', 'Gemelo', 'Abdominales']);
    expect(select().value).toBe('');
    await userEvent.setup().selectOptions(select(), 'e3');
    expect(onLink).toHaveBeenCalledWith('e3');
  });

  it('enseña la pareja actual y la quita con Ninguno', async () => {
    const onLink = vi.fn();
    const paired = ex('e1', 'Sentadilla', { superset: 'A' });
    render(
      <PlanExercise
        day={dayWith(paired, [ex('e2', 'Gemelo', { superset: 'A' }), ex('e3', 'Abdominales')])}
        exercise={paired}
        onBack={vi.fn()}
        onUpdate={vi.fn()}
        onLink={onLink}
        onRemove={vi.fn()}
      />,
    );
    expect(select().value).toBe('e2');
    await userEvent.setup().selectOptions(select(), '');
    expect(onLink).toHaveBeenCalledWith(null);
  });

  it('sin más ejercicios en el día no se puede elegir', () => {
    render(<PlanExercise day={dayWith(squat, [])} exercise={squat} onBack={vi.fn()} onUpdate={vi.fn()} onLink={vi.fn()} onRemove={vi.fn()} />);
    expect(select().disabled).toBe(true);
  });
});

describe('PlanExercise · borrar', () => {
  it('pide confirmación y solo borra al aceptar', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderExercise(squat, { onRemove });
    await user.click(screen.getByRole('button', { name: 'Borrar ejercicio' }));
    expect(screen.getByRole('alertdialog', { name: '¿Borrar «Sentadilla»?' }).textContent).toContain('Sus entrenos guardados se conservan.');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onRemove).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Borrar ejercicio' }));
    await user.click(screen.getAllByRole('button', { name: 'Borrar ejercicio' }).at(-1));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
