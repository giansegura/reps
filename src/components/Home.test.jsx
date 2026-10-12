import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Home } from './Home.jsx';

const day = (exercises) => ({ id: 'd1', label: 'Día 1', color: '#22c55e', exercises });

const ex = (id) => ({ id, name: `Ejercicio ${id}`, sets: 3, reps: '8' });

const renderHome = (plan) => render(
  <Home plan={plan} planId="p1" planName="Full Body" sessions={[]} onStartWorkout={vi.fn()} onOpenPlans={vi.fn()} onOpenPlan={vi.fn()} />,
);

describe('Home', () => {
  it('usa singular con un ejercicio', () => {
    renderHome([day([ex('e1')])]);
    expect(screen.getByText('1 ejercicio')).toBeTruthy();
  });

  it('usa plural con varios ejercicios', () => {
    renderHome([day([ex('e1'), ex('e2')])]);
    expect(screen.getByText('2 ejercicios')).toBeTruthy();
  });

  it('muestra el último entreno del día aunque haya varios', () => {
    const sessions = [
      { planId: 'p1', dayId: 'd1', date: '2026-10-01T10:00:00.000Z', exercises: { e1: { 1: { weight: '60', reps: '8' } } }, notes: {} },
      { planId: 'p2', dayId: 'd1', date: '2026-10-09T10:00:00.000Z', exercises: { e1: { 1: { weight: '99', reps: '8' } } }, notes: {} },
      { planId: 'p1', dayId: 'd1', date: '2026-10-05T10:00:00.000Z', exercises: { e1: { 1: { weight: '65', reps: '8' } } }, notes: {} },
    ];
    render(
      <Home plan={[day([ex('e1')])]} planId="p1" planName="Full Body" sessions={sessions}
        onStartWorkout={vi.fn()} onOpenPlans={vi.fn()} onOpenPlan={vi.fn()} />,
    );
    expect(screen.getByText(/65 kg/)).toBeTruthy();
    expect(screen.queryByText(/99 kg/)).toBeNull();
  });
});
