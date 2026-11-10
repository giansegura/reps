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

describe('Plans · exportar historial', () => {
  it('ofrece un botón para exportar el historial para IA', async () => {
    const onExportHistory = vi.fn();
    render(
      <Plans plans={plans} activePlanId="p1" sessions={[]} onBack={vi.fn()} onActivate={vi.fn()} onEdit={vi.fn()}
        onDuplicate={vi.fn()} onRemove={vi.fn()} onCreate={vi.fn()} onExport={vi.fn()} onExportHistory={onExportHistory} onImport={vi.fn()} />,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Exportar historial para IA' }));
    expect(onExportHistory).toHaveBeenCalledOnce();
  });
});

describe('Plans · tus datos', () => {
  it('explica cada archivo', () => {
    render(
      <Plans plans={plans} activePlanId="p1" sessions={[]} onBack={vi.fn()} onActivate={vi.fn()} onEdit={vi.fn()}
        onDuplicate={vi.fn()} onRemove={vi.fn()} onCreate={vi.fn()} onExport={vi.fn()} onExportHistory={vi.fn()} onImport={vi.fn()} />,
    );
    expect(screen.getByText('Se guardan solo en este dispositivo.')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Copia de seguridad' })).toBeTruthy();
    expect(screen.getByText('Todos tus planes y entrenos en un archivo. Sirve para recuperarlos o pasarlos a otro móvil. Importar una copia reemplaza todo lo que tengas.')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Historial para IA' })).toBeTruthy();
    expect(screen.getByText('Un archivo de texto con todos tus entrenos para que una IA analice tu progreso. La IA solo lo lee, la app no puede volver a importarlo.')).toBeTruthy();
    expect(screen.getByText('Para que una IA te cambie un plan, ábrelo y usa «Editar con IA».')).toBeTruthy();
    expect(screen.queryByText(/listo para pegar o adjuntar/)).toBeNull();
  });
});
