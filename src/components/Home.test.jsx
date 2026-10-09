import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Home } from './Home.jsx';

const day = (exercises) => ({ id: 'd1', label: 'Día 1', color: '#22c55e', exercises });

const ex = (id) => ({ id, name: `Ejercicio ${id}`, sets: 3, reps: '8' });

const renderHome = (plan) => render(
  <Home plan={plan} planName="Full Body" sessions={[]} onStartWorkout={vi.fn()} onOpenPlans={vi.fn()} onOpenPlan={vi.fn()} />,
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
});
