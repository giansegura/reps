import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PlanDay } from './PlanDay.jsx';

const day = {
  id: 'd1',
  label: 'Día 1',
  color: '#22c55e',
  exercises: [{ id: 'e1', name: 'Sentadilla', sets: 3, reps: '8' }],
};

const Harness = ({ onUpdateExercise }) => (
  <PlanDay
    day={day}
    onBack={vi.fn()}
    onUpdateDay={vi.fn()}
    onAddExercise={vi.fn()}
    onUpdateExercise={onUpdateExercise}
    onRemoveExercise={vi.fn()}
    onMoveExercise={vi.fn()}
  />
);

describe('PlanDay · series', () => {
  it('permite borrar el número y escribir otro', async () => {
    const user = userEvent.setup();
    const onUpdateExercise = vi.fn();
    render(<Harness onUpdateExercise={onUpdateExercise} />);
    const input = screen.getByRole('spinbutton', { name: 'Series de Sentadilla' });
    await user.clear(input);
    await user.type(input, '4');
    expect(input.value).toBe('4');
    expect(onUpdateExercise).toHaveBeenLastCalledWith('e1', { sets: 4 });
    expect(onUpdateExercise).not.toHaveBeenCalledWith('e1', { sets: 1 });
  });

  it('no guarda más series del máximo', async () => {
    const user = userEvent.setup();
    const onUpdateExercise = vi.fn();
    render(<Harness onUpdateExercise={onUpdateExercise} />);
    const input = screen.getByRole('spinbutton', { name: 'Series de Sentadilla' });
    await user.clear(input);
    await user.type(input, '1000');
    expect(onUpdateExercise).not.toHaveBeenCalledWith('e1', { sets: 1000 });
  });

  it('vuelve al valor guardado al salir del campo vacío', async () => {
    const user = userEvent.setup();
    render(<Harness onUpdateExercise={vi.fn()} />);
    const input = screen.getByRole('spinbutton', { name: 'Series de Sentadilla' });
    await user.clear(input);
    await user.tab();
    expect(input.value).toBe('3');
  });
});
