import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Plans } from './Plans.jsx';

const plans = [
  { id: 'p1', name: 'Torso', days: [{ id: 'd1', label: 'Día 1', color: '#000000', exercises: [{ id: 'e1' }, { id: 'e2' }] }] },
  { id: 'p2', name: 'Pierna', days: [] },
];

const renderPlans = (props = {}) => render(
  <Plans plans={plans} activePlanId="p1" sessions={[]} onActivate={vi.fn()} onEdit={vi.fn()} onDuplicate={vi.fn()}
    onRemove={vi.fn()} onCreate={vi.fn()} onExport={vi.fn()} onExportHistory={vi.fn()} onImport={vi.fn()} {...props} />,
);

describe('Plans · lista', () => {
  it('marca el plan activo y resume cada uno', () => {
    renderPlans();
    const active = screen.getByRole('region', { name: 'Torso' });
    expect(active.textContent).toContain('Activo');
    expect(active.textContent).toContain('1 día · 2 ejercicios');
    expect(screen.getByRole('region', { name: 'Pierna' }).textContent).toContain('0 días · 0 ejercicios');
  });

  it('activar, editar y duplicar', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    const onEdit = vi.fn();
    const onDuplicate = vi.fn();
    renderPlans({ onActivate, onEdit, onDuplicate });
    await user.click(screen.getByRole('button', { name: 'Activar Pierna' }));
    await user.click(screen.getByRole('button', { name: 'Editar Pierna' }));
    await user.click(screen.getByRole('button', { name: 'Duplicar Torso' }));
    expect(onActivate).toHaveBeenCalledWith('p2');
    expect(onEdit).toHaveBeenCalledWith('p2');
    expect(onDuplicate).toHaveBeenCalledWith('p1');
    expect(screen.queryByRole('button', { name: 'Activar Torso' })).toBeNull();
  });

  it('un plan que no está activo se duplica desde su menú', async () => {
    const user = userEvent.setup();
    const onDuplicate = vi.fn();
    renderPlans({ onDuplicate });
    await user.click(screen.getByRole('button', { name: 'Más opciones de Pierna' }));
    await user.click(screen.getByRole('button', { name: 'Duplicar plan' }));
    expect(onDuplicate).toHaveBeenCalledWith('p2');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('nuevo plan', async () => {
    const onCreate = vi.fn();
    renderPlans({ onCreate });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Nuevo plan' }));
    expect(onCreate).toHaveBeenCalledOnce();
  });
});

describe('Plans · borrar plan', () => {
  const sessions = [{ planId: 'p2', dayId: 'd1' }, { planId: 'p2', dayId: 'd1' }, { planId: 'p2', dayId: 'd2' }, { planId: 'p1', dayId: 'd9' }];

  const askToRemove = async (user, name) => {
    await user.click(screen.getByRole('button', { name: `Más opciones de ${name}` }));
    await user.click(screen.getByRole('button', { name: 'Borrar plan' }));
    return screen.getByRole('alertdialog', { name: `¿Borrar «${name}»?` });
  };

  it('cuenta entrenos, no días, y no borra si se cancela', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderPlans({ sessions, onRemove });
    const dialog = await askToRemove(user, 'Pierna');
    expect(dialog.textContent).toContain('Tienes 3 entrenos guardados de este plan.');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('borra al confirmar', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderPlans({ onRemove });
    const dialog = await askToRemove(user, 'Pierna');
    expect(dialog.textContent).not.toContain('entrenos guardados');
    await user.click(screen.getAllByRole('button', { name: 'Borrar plan' }).at(-1));
    expect(onRemove).toHaveBeenCalledWith('p2');
  });

  it('no deja borrar el único plan', async () => {
    const user = userEvent.setup();
    renderPlans({ plans: [plans[0]] });
    await user.click(screen.getByRole('button', { name: 'Más opciones de Torso' }));
    expect(screen.getByRole('button', { name: 'Borrar plan' }).disabled).toBe(true);
    expect(screen.getByText('No puedes borrar tu único plan.')).toBeTruthy();
  });
});

describe('Plans · exportar historial', () => {
  it('ofrece un botón para exportar el historial para IA', async () => {
    const onExportHistory = vi.fn();
    renderPlans({ onExportHistory });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Exportar historial para IA' }));
    expect(onExportHistory).toHaveBeenCalledOnce();
  });
});

describe('Plans · tus datos', () => {
  it('explica cada archivo', () => {
    renderPlans();
    expect(screen.getByText('Se guardan solo en este dispositivo.')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Copia de seguridad' })).toBeTruthy();
    expect(screen.getByText('Todos tus planes y entrenos en un archivo. Sirve para recuperarlos o pasarlos a otro móvil. Importar una copia reemplaza todo lo que tengas.')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Historial para IA' })).toBeTruthy();
    expect(screen.getByText('Un archivo de texto con todos tus entrenos para que una IA analice tu progreso. La IA solo lo lee, la app no puede volver a importarlo.')).toBeTruthy();
    expect(screen.getByText('Para que una IA te cambie un plan, ábrelo y usa «Editar con IA».')).toBeTruthy();
    expect(screen.queryByText(/listo para pegar o adjuntar/)).toBeNull();
  });
});
