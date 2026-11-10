import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlanList } from './PlanList.jsx';

const day = { id: 'd1', label: 'Día 1', color: '#000000', exercises: [] };

const renderList = (sessions, handlers = {}) => render(
  <PlanList plan={[day]} planId="p1" planName="Full Body" sessions={sessions} onBack={vi.fn()} onRename={vi.fn()}
    onOpenDay={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} onMove={vi.fn()}
    onExportPlan={handlers.onExportPlan ?? vi.fn()} onImportPlan={handlers.onImportPlan ?? vi.fn()} />,
);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PlanList · borrar día', () => {
  it.each([
    [[{ planId: 'p1', dayId: 'd1' }, { planId: 'p1', dayId: 'd1' }, { planId: 'p2', dayId: 'd1' }, { planId: 'p1', dayId: 'd2' }], 'Tienes 2 entrenos guardados de este día.'],
    [[{ planId: 'p1', dayId: 'd1' }, { planId: 'p2', dayId: 'd1' }], 'Tienes 1 entreno guardado de este día.'],
  ])('avisa de cuántos entrenos tiene', async (sessions, text) => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    renderList(sessions);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Borrar Día 1' }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining(text));
  });

  it('no avisa si el día no tiene entrenos', async () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    renderList([]);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Borrar Día 1' }));
    expect(confirm).toHaveBeenCalledWith('¿Borrar "Día 1"?\n\n');
  });
});

describe('PlanList · editar con IA', () => {
  it('explica qué hace', () => {
    renderList([]);
    expect(screen.getByRole('heading', { name: 'Editar con IA' })).toBeTruthy();
    expect(screen.getByText(/Solo cambia este plan, tus entrenos no se tocan\./)).toBeTruthy();
  });

  it('exportar para IA', async () => {
    const onExportPlan = vi.fn();
    renderList([], { onExportPlan });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Exportar para IA' }));
    expect(onExportPlan).toHaveBeenCalledOnce();
  });

  it('importar cambios', () => {
    const onImportPlan = vi.fn();
    const { container } = renderList([], { onImportPlan });
    expect(screen.getByRole('button', { name: 'Importar cambios' })).toBeTruthy();
    const input = container.querySelector('input[type="file"]');
    const file = new File(['{}'], 'plan.json', { type: 'application/json' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onImportPlan).toHaveBeenCalledWith(file);
  });

  it('acepta archivos .txt', () => {
    const { container } = renderList([]);
    const accept = container.querySelector('input[type="file"]').getAttribute('accept');
    expect(accept).toContain('.json');
    expect(accept).toContain('.txt');
    expect(accept).toContain('text/plain');
  });
});
