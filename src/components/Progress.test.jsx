import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Progress } from './Progress.jsx';

const plan = {
  id: 'p1',
  name: 'Full Body',
  days: [
    { id: 'd0', label: 'Día vacío', color: '#000000', exercises: [] },
    {
      id: 'd1',
      label: 'Día 1',
      color: '#22c55e',
      exercises: [
        { id: 'e1', name: 'Sentadilla', sets: 3, reps: '8' },
        { id: 'e2', name: 'Press banca', sets: 3, reps: '8' },
      ],
    },
  ],
};

const session = (exId, weight) => ({
  planId: 'p1',
  dayId: 'd1',
  date: new Date().toISOString(),
  exercises: { [exId]: { 1: { weight, reps: '10', done: true } } },
  notes: {},
});

const renderProgress = (props = {}) => render(
  <Progress
    plan={plan}
    sessions={[session('e1', '60'), session('e2', '40')]}
    period="week"
    metric="volume"
    onPeriodChange={vi.fn()}
    onMetricChange={vi.fn()}
    onBack={vi.fn()}
    {...props}
  />,
);

describe('Progress', () => {
  it('empieza en el primer día con ejercicios', () => {
    renderProgress();
    expect(screen.getByRole('combobox', { name: 'Ejercicio' }).value).toBe('d1:e1');
    expect(screen.getByText('Día 1', { selector: 'p' })).toBeTruthy();
    expect(screen.getByText('600 kg')).toBeTruthy();
  });

  it('el desplegable cambia de ejercicio', async () => {
    const user = userEvent.setup();
    renderProgress();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ejercicio' }), 'd1:e2');
    expect(screen.getByText('400 kg')).toBeTruthy();
  });

  it('← Inicio llama a onBack', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderProgress({ onBack });
    await user.click(screen.getByRole('button', { name: '← Inicio' }));
    expect(onBack).toHaveBeenCalled();
  });
});
