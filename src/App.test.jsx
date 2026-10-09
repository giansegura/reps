import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App.jsx';

const storedPlans = () => JSON.parse(localStorage.getItem('reps-plans'));

beforeEach(() => {
  localStorage.clear();
});

describe('App · editar plan', () => {
  it('guarda el cambio de nombre en cuanto se escribe', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Editar plan' }));
    const input = screen.getByRole('textbox', { name: 'Nombre del plan' });
    await user.clear(input);
    await user.type(input, 'Torso');
    expect(storedPlans().plans[0].name).toBe('Torso');
  });
});

describe('App · datos dañados', () => {
  it('arranca aunque haya sesiones dañadas', async () => {
    localStorage.setItem('reps-sessions', '[null]');
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Editar plan' })).toBeTruthy();
  });

  it('arranca con el plan de ejemplo si los planes están dañados', async () => {
    localStorage.setItem('reps-plans', '{"activePlanId":"p1","plans":[{"id":"p1"}]}');
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Editar plan' })).toBeTruthy();
    expect(await screen.findByText(/datos dañados/)).toBeTruthy();
  });
});
