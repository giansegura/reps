import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Home } from './Home.jsx';

const ex = (id, extra = {}) => ({ id, name: `Ejercicio ${id}`, sets: 3, reps: '8', ...extra });

const day = (id, label, exercises, color = '#22c55e') => ({ id, label, color, exercises });

const now = new Date(2026, 10, 17, 12);

const session = (dayId, date, exercises = {}, planId = 'p1') => ({ planId, dayId, date: date.toISOString(), exercises, notes: {} });

const week = [day('d1', 'Día 1', [ex('e1')]), day('d2', 'Día 2', [ex('e2')]), day('d3', 'Día 3', [ex('e3')])];

const renderHome = (plan, props = {}) => render(
  <Home plan={plan} planId="p1" planName="Full Body" sessions={[]} now={now} onStartWorkout={vi.fn()} onOpenPlans={vi.fn()} onOpenPlan={vi.fn()} {...props} />,
);

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Home · qué toca', () => {
  it('sin entrenos propone el primer día y lo empieza con un botón', async () => {
    const onStartWorkout = vi.fn();
    renderHome(week, { onStartWorkout });
    expect(screen.getByText('Te toca hoy · martes 17 nov')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Día 1' })).toBeTruthy();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Empezar entreno' }));
    expect(onStartWorkout).toHaveBeenCalledWith(week[0]);
  });

  it('propone el día siguiente al último entrenado', () => {
    renderHome(week, { sessions: [session('d1', new Date(2026, 10, 16, 10))] });
    expect(screen.getByRole('heading', { level: 2, name: 'Día 2' })).toBeTruthy();
    expect(within(screen.getByRole('button', { name: /Día 1/ })).getByText('hecho ayer')).toBeTruthy();
  });

  it('si ya has entrenado hoy lo marca como hecho y enseña el siguiente', async () => {
    const onStartWorkout = vi.fn();
    renderHome(week, { sessions: [session('d1', new Date(2026, 10, 17, 9))], onStartWorkout });
    expect(screen.getByText('Hecho hoy · martes 17 nov')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Empezar entreno' })).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Siguiente' })).toBeTruthy();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Empezar Día 2' }));
    expect(onStartWorkout).toHaveBeenCalledWith(week[1]);
  });

  it('un día ya hecho hoy se puede repetir', async () => {
    const onStartWorkout = vi.fn();
    renderHome(week, { sessions: [session('d1', new Date(2026, 10, 17, 9))], onStartWorkout });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Repetir este día' }));
    expect(onStartWorkout).toHaveBeenCalledWith(week[0]);
  });

  it('elegir otro día lo sube arriba para empezarlo', async () => {
    const user = userEvent.setup();
    const onStartWorkout = vi.fn();
    renderHome(week, { onStartWorkout });
    await user.click(screen.getByRole('button', { name: /Día 3/ }));
    expect(screen.getByText('Día elegido · martes 17 nov')).toBeTruthy();
    expect(within(screen.getByRole('button', { name: /Día 1/ })).getByText('te toca')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Empezar entreno' }));
    expect(onStartWorkout).toHaveBeenCalledWith(week[2]);
  });

  it('un día sin ejercicios no se puede elegir', () => {
    renderHome([...week, day('d4', 'Día 4', [])]);
    const empty = screen.getByRole('button', { name: /Día 4/ });
    expect(empty.disabled).toBe(true);
    expect(within(empty).getByText('sin ejercicios')).toBeTruthy();
  });
});

describe('Home · resumen del día', () => {
  it('usa singular y plural', () => {
    const { unmount } = renderHome([day('d1', 'Día 1', [ex('e1', { sets: 1 })])]);
    expect(screen.getByText('1 ejercicio · 1 serie')).toBeTruthy();
    unmount();
    renderHome([day('d1', 'Día 1', [ex('e1'), ex('e2')])]);
    expect(screen.getByText('2 ejercicios · 6 series')).toBeTruthy();
  });

  it('dice cuándo se hizo por última vez', () => {
    const sessions = [session('d1', new Date(2026, 10, 10, 10)), session('d2', new Date(2026, 10, 11, 10)), session('d3', new Date(2026, 10, 12, 10))];
    renderHome(week, { sessions });
    expect(screen.getByText('1 ejercicio · 3 series · última vez mar 10 nov')).toBeTruthy();
  });

  it('muestra el último peso del ejercicio en este plan aunque haya entrenos de otros', () => {
    const set = (weight) => ({ e1: { 1: { weight, reps: '8', done: true } } });
    const sessions = [
      session('d1', new Date(2026, 9, 1, 10), set('60')),
      session('d1', new Date(2026, 9, 9, 10), set('99'), 'p2'),
      session('d1', new Date(2026, 9, 5, 10), set('65')),
    ];
    renderHome([day('d1', 'Día 1', [ex('e1')])], { sessions });
    expect(screen.getByText('65 kg')).toBeTruthy();
    expect(screen.queryByText('99 kg')).toBeNull();
  });

  it('recuerda el peso de un ejercicio aunque lo hicieras en otro día', () => {
    const sessions = [session('viejo', new Date(2026, 9, 1, 10), { e1: { 1: { weight: '40', reps: '8', done: true } } })];
    renderHome([day('d1', 'Día 1', [ex('e1')])], { sessions });
    expect(screen.getByText('40 kg')).toBeTruthy();
  });

  it('agrupa las superseries', () => {
    renderHome([day('d1', 'Día 1', [ex('e1'), ex('e2', { superset: 'A' }), ex('e3', { superset: 'A' })])]);
    const group = screen.getByText('Superserie').closest('li');
    expect(within(group).getByText('Ejercicio e2')).toBeTruthy();
    expect(within(group).getByText('Ejercicio e3')).toBeTruthy();
    expect(within(group).queryByText('Ejercicio e1')).toBeNull();
  });
});

describe('Home · planes', () => {
  it('el nombre del plan abre Planes', async () => {
    const onOpenPlans = vi.fn();
    renderHome(week, { onOpenPlans });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Full Body' }));
    expect(onOpenPlans).toHaveBeenCalled();
  });

  it.each([
    ['sin días', [], 'No tienes días en tu plan. Crea el primero para empezar.'],
    ['con días vacíos', [day('d1', 'Día 1', [])], 'Tus días aún no tienen ejercicios. Añade alguno para empezar.'],
  ])('%s lleva a editar el plan', async (_label, plan, text) => {
    const onOpenPlan = vi.fn();
    renderHome(plan, { onOpenPlan });
    expect(screen.getByText(text)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Empezar entreno' })).toBeNull();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Editar plan' }));
    expect(onOpenPlan).toHaveBeenCalled();
  });
});
