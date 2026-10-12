import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Plans } from './Plans.jsx';

const plans = [
  { id: 'p1', name: 'Torso', days: [] },
  { id: 'p2', name: 'Pierna', days: [] },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Plans · borrar plan', () => {
  it('cuenta entrenos, no días', async () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    const sessions = [{ planId: 'p2', dayId: 'd1' }, { planId: 'p2', dayId: 'd1' }, { planId: 'p2', dayId: 'd2' }, { planId: 'p1', dayId: 'd9' }];
    render(
      <Plans plans={plans} activePlanId="p1" sessions={sessions} onBack={vi.fn()} onActivate={vi.fn()} onEdit={vi.fn()}
        onDuplicate={vi.fn()} onRemove={vi.fn()} onCreate={vi.fn()} onExport={vi.fn()} onImport={vi.fn()} />,
    );
    await userEvent.setup().click(screen.getAllByRole('button', { name: 'Borrar plan' })[1]);
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Tienes 3 entrenos guardados de este plan.'));
  });
});
