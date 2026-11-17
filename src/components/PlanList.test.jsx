import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PlanList } from './PlanList.jsx';

const days = [
  { id: 'd1', label: 'Día 1', color: '#000000', exercises: [{ id: 'e1' }] },
  { id: 'd2', label: 'Día 2', color: '#000000', exercises: [] },
];

const renderList = (props = {}) => render(
  <PlanList plan={days} planName="Full Body" onBack={vi.fn()} onRename={vi.fn()} onOpenDay={vi.fn()} onAdd={vi.fn()}
    onMove={vi.fn()} onExportPlan={vi.fn()} onImportPlan={vi.fn()} {...props} />,
);

describe('PlanList · días', () => {
  it('lista los días con sus ejercicios y los abre', async () => {
    const onOpenDay = vi.fn();
    renderList({ onOpenDay });
    expect(screen.getByRole('button', { name: /^Día 1/ }).textContent).toContain('1 ejercicio');
    await userEvent.setup().click(screen.getByRole('button', { name: /^Día 2/ }));
    expect(onOpenDay).toHaveBeenCalledWith('d2');
  });

  it('reordena con las flechas, sin salirse de la lista', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    renderList({ onMove });
    expect(screen.getByRole('button', { name: 'Subir Día 1' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Bajar Día 2' }).disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Bajar Día 1' }));
    await user.click(screen.getByRole('button', { name: 'Subir Día 2' }));
    expect(onMove.mock.calls).toEqual([['d1', 1], ['d2', -1]]);
  });

  it('no ofrece borrar un día junto a las flechas', () => {
    renderList();
    expect(screen.queryByRole('button', { name: /Borrar/ })).toBeNull();
  });

  it('añadir día, renombrar y volver', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onRename = vi.fn();
    const onBack = vi.fn();
    renderList({ onAdd, onRename, onBack });
    await user.click(screen.getByRole('button', { name: 'Añadir día' }));
    await user.type(screen.getByRole('textbox', { name: 'Nombre del plan' }), 'x');
    await user.click(screen.getByRole('button', { name: 'Planes' }));
    expect(onAdd).toHaveBeenCalledOnce();
    expect(onRename).toHaveBeenCalledWith('Full Bodyx');
    expect(onBack).toHaveBeenCalledOnce();
  });
});

describe('PlanList · editar con IA', () => {
  it('explica qué hace', () => {
    renderList();
    expect(screen.getByRole('heading', { name: 'Editar con IA' })).toBeTruthy();
    expect(screen.getByText(/Solo cambia este plan, tus entrenos no se tocan\./)).toBeTruthy();
  });

  it('exportar para IA', async () => {
    const onExportPlan = vi.fn();
    renderList({ onExportPlan });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Exportar para IA' }));
    expect(onExportPlan).toHaveBeenCalledOnce();
  });

  it('importar cambios', () => {
    const onImportPlan = vi.fn();
    const { container } = renderList({ onImportPlan });
    expect(screen.getByRole('button', { name: 'Importar cambios' })).toBeTruthy();
    const input = container.querySelector('input[type="file"]');
    const file = new File(['{}'], 'plan.json', { type: 'application/json' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onImportPlan).toHaveBeenCalledWith(file);
  });

  it('acepta archivos .txt', () => {
    const { container } = renderList();
    const accept = container.querySelector('input[type="file"]').getAttribute('accept');
    expect(accept).toContain('.json');
    expect(accept).toContain('.txt');
    expect(accept).toContain('text/plain');
  });
});
