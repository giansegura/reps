import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlanList } from './PlanList.jsx';

const day = { id: 'd1', label: 'Día 1', color: '#000000', exercises: [] };

const renderList = (sessions) => render(
  <PlanList plan={[day]} planName="Full Body" sessions={sessions} onBack={vi.fn()} onRename={vi.fn()}
    onOpenDay={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} onMove={vi.fn()} />,
);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PlanList · borrar día', () => {
  it.each([
    [[{ dayId: 'd1' }, { dayId: 'd1' }, { dayId: 'd2' }], 'Tienes 2 entrenos guardados de este día.'],
    [[{ dayId: 'd1' }], 'Tienes 1 entreno guardado de este día.'],
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
