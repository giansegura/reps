import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProgressChart } from './ProgressChart.jsx';

const now = new Date(2026, 9, 21, 12);
const exercise = { id: 'e1', name: 'Sentadilla', reps: '8' };

const session = (date, weight, reps = '8') => ({
  planId: 'p1',
  dayId: 'd1',
  date: date.toISOString(),
  exercises: { e1: { 1: { weight, reps, done: true } } },
  notes: {},
});

const twoWeeks = [
  session(new Date(2026, 9, 13, 10), '50'),
  session(new Date(2026, 9, 15, 10), '50'),
  session(new Date(2026, 9, 19, 10), '60'),
];

const renderChart = (props = {}) => render(
  <ProgressChart
    sessions={twoWeeks}
    planId="p1"
    exercise={exercise}
    color="#22c55e"
    period="week"
    metric="volume"
    onPeriodChange={vi.fn()}
    onMetricChange={vi.fn()}
    now={now}
    {...props}
  />,
);

const bars = () => within(screen.getByRole('list', { name: 'Evolución' })).getAllByRole('listitem');

describe('ProgressChart', () => {
  it('muestra el valor de la semana y el cambio', () => {
    renderChart();
    expect(screen.getByText('Esta semana')).toBeTruthy();
    expect(screen.getByText('480 kg')).toBeTruthy();
    expect(screen.getByText('▲ 20 %')).toBeTruthy();
  });

  it('pinta 8 barras por semana y 6 por mes', () => {
    const { rerender } = renderChart();
    expect(bars()).toHaveLength(8);
    rerender(
      <ProgressChart
        sessions={twoWeeks}
        planId="p1"
        exercise={exercise}
        color="#22c55e"
        period="month"
        metric="volume"
        onPeriodChange={vi.fn()}
        onMetricChange={vi.fn()}
        now={now}
      />,
    );
    expect(bars()).toHaveLength(6);
    expect(screen.getByText('Este mes')).toBeTruthy();
  });

  it('etiqueta cada barra', () => {
    renderChart();
    expect(screen.getByRole('listitem', { name: 'Semana del 19 oct: 480 kg' })).toBeTruthy();
    expect(screen.getByRole('listitem', { name: 'Semana del 12 oct: 800 kg' })).toBeTruthy();
    expect(screen.getByRole('listitem', { name: 'Semana del 5 oct: sin entrenos' })).toBeTruthy();
  });

  it('avisa los cambios de selector', async () => {
    const user = userEvent.setup();
    const onPeriodChange = vi.fn();
    const onMetricChange = vi.fn();
    renderChart({ onPeriodChange, onMetricChange });
    expect(screen.getByRole('button', { name: 'Semana' }).getAttribute('aria-pressed')).toBe('true');
    await user.click(within(screen.getByRole('group', { name: 'Periodo' })).getByRole('button', { name: 'Mes' }));
    await user.click(within(screen.getByRole('group', { name: 'Medida' })).getByRole('button', { name: 'Peso máx.' }));
    expect(onPeriodChange).toHaveBeenCalledWith('month');
    expect(onMetricChange).toHaveBeenCalledWith('max');
  });

  it('sin entrenos este periodo', () => {
    renderChart({ sessions: twoWeeks.slice(0, 2) });
    expect(screen.getByText('Sin entrenos esta semana')).toBeTruthy();
    expect(screen.queryByText(/[▲▼]/)).toBeNull();
  });

  it('sin datos del ejercicio', () => {
    renderChart({ sessions: [] });
    expect(screen.getByText('Aún no hay entrenos guardados de este ejercicio')).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByRole('group', { name: 'Periodo' })).toBeTruthy();
  });

  it('en repeticiones el segundo botón es Mejor serie', () => {
    renderChart({ sessions: [session(new Date(2026, 9, 19, 10), 'PC', '10')] });
    expect(screen.getByRole('button', { name: 'Mejor serie' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Peso máx.' })).toBeNull();
    expect(screen.getByText('10 reps')).toBeTruthy();
  });
});
