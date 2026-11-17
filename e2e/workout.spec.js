import { expect, test } from './test.js';

const weight = (page) => page.getByRole('spinbutton', { name: /peso en kilos/ });
const reps = (page) => page.getByRole('spinbutton', { name: /repeticiones/ });
const progress = (page) => page.getByRole('button', { name: /series hechas\. Ver todos los ejercicios$/ });

const startFirstDay = async (page) => {
  await page.goto('./app/');
  await page.getByRole('button', { name: 'Empezar entreno' }).click();
  await expect(page.getByRole('button', { name: 'Serie hecha' })).toBeVisible();
};

test('retoma el entreno en curso tras recargar y lo guarda', async ({ page }) => {
  await startFirstDay(page);
  await weight(page).fill('42.5');
  await reps(page).fill('8');
  await page.reload();
  await expect(page.getByRole('alertdialog', { name: 'Tienes un entreno sin terminar' })).toContainText('Full Body · Día 1');
  await page.getByRole('button', { name: 'Retomar' }).click();
  await expect(weight(page)).toHaveValue('42.5');
  await page.getByRole('button', { name: 'Serie hecha' }).click();
  await page.getByRole('button', { name: 'Terminar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Te quedan 14 series' })).toBeVisible();
  await page.getByRole('button', { name: /^Guardar entreno/ }).click();
  await expect(page.getByText('Entreno guardado')).toBeVisible();
  await expect(page.getByText(/^Hecho hoy/)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Día 1' })).toBeVisible();
  await page.getByRole('button', { name: 'Progreso', exact: true }).click();
  await expect(page.locator('.recent-row')).toContainText('42,5 kg × 8');
});

test('las series del último entreno llegan rellenas pero sin marcar', async ({ page }) => {
  await page.goto('./app/');
  await page.evaluate(() => {
    localStorage.setItem('reps-version', '2');
    localStorage.setItem('reps-sessions', JSON.stringify([{
      planId: 'plan1',
      dayId: 'day1',
      date: '2026-10-01T10:00:00.000Z',
      exercises: { squat: { 1: { weight: '60', reps: '8', done: true } } },
      notes: {},
    }]));
  });
  await page.reload();
  await expect(page.getByRole('heading', { level: 2, name: 'Día 2' })).toBeVisible();
  await page.getByRole('button', { name: /^Día 1/ }).click();
  await page.getByRole('button', { name: 'Empezar entreno' }).click();
  await expect(weight(page)).toHaveValue('60');
  await expect(reps(page)).toHaveValue('8');
  await expect(page.getByText('Última vez 60 kg × 8')).toBeVisible();
  await expect(progress(page)).toHaveAccessibleName(/^0 de 15 /);
  await page.getByRole('button', { name: 'Subir peso' }).click();
  await expect(weight(page)).toHaveValue('62.5');
  await expect(progress(page)).toHaveAccessibleName(/^0 de 15 /);
  await page.getByRole('button', { name: 'Serie hecha' }).click();
  await expect(progress(page)).toHaveAccessibleName(/^1 de 15 /);
  await expect(page.getByRole('button', { name: 'Corregir serie 1 de Sentadilla' })).toContainText('62,5 kg × 8');
  await page.getByRole('button', { name: 'Terminar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Guardar entreno, 1 de 15 series' })).toBeEnabled();
});

test('la nota admite espacios y el espacio fuera de un campo arranca el descanso', async ({ page }) => {
  await startFirstDay(page);
  await page.getByRole('button', { name: 'Añadir nota a Sentadilla' }).click();
  const note = page.getByRole('textbox', { name: 'Nota de Sentadilla' });
  await note.pressSequentially('codos pegados');
  await expect(note).toHaveValue('codos pegados');
  const rest = page.getByRole('timer', { name: 'Descanso' });
  await expect(rest).toHaveText('00:00');
  await page.getByRole('button', { name: 'Guardar nota' }).click();
  await expect(page.getByRole('button', { name: /Nota de Sentadilla: codos pegados/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar nota de Sentadilla' })).toBeFocused();
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('Space');
  await expect(rest).toHaveText('00:01', { timeout: 3000 });
});

test('salir pide confirmación antes de descartar el entreno', async ({ page }) => {
  await startFirstDay(page);
  await page.getByRole('button', { name: 'Salir sin guardar' }).click();
  const dialog = page.getByRole('alertdialog', { name: '¿Salir sin guardar?' });
  await dialog.getByRole('button', { name: 'Seguir entrenando' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Serie hecha' })).toBeVisible();
  await page.getByRole('button', { name: 'Salir sin guardar' }).click();
  await dialog.getByRole('button', { name: 'Salir sin guardar' }).click();
  await expect(page.getByRole('button', { name: 'Empezar entreno' })).toBeVisible();
});

test('la superserie alterna los ejercicios y solo descansa al acabar la ronda', async ({ page }) => {
  await page.goto('./app/');
  await page.getByRole('button', { name: 'Planes', exact: true }).click();
  await page.getByRole('button', { name: 'Editar Full Body' }).click();
  await page.getByRole('button', { name: /^Día 1/ }).click();
  await page.getByRole('button', { name: 'Editar Press de banca' }).click();
  await page.getByRole('combobox', { name: 'Superserie con' }).selectOption({ label: 'Sentadilla' });
  await page.getByRole('button', { name: 'Menos descanso' }).click();
  await expect(page.getByRole('group', { name: 'Aviso de descanso' }).getByRole('status')).toHaveText('1:45');
  await page.getByRole('button', { name: 'Día 1', exact: true }).click();
  await expect(page.locator('.edit-superset')).toContainText('Sentadilla');
  await expect(page.locator('.edit-superset')).toContainText('Press de banca');
  await page.getByRole('button', { name: 'Full Body', exact: true }).click();
  await page.getByRole('button', { name: 'Planes', exact: true }).click();
  await page.getByRole('button', { name: 'Hoy', exact: true }).click();
  await page.getByRole('button', { name: 'Empezar entreno' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sentadilla' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Después.*Press de banca, sin descanso/ })).toBeVisible();
  await page.getByRole('button', { name: 'Serie hecha' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Press de banca' })).toBeVisible();
  await expect(page.getByText('sin descanso', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Serie hecha' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sentadilla' })).toBeVisible();
  await expect(page.getByText('aviso 1:45')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Ronda 2 de 3, Sentadilla' })).toBeVisible();
});

test('en móvil la cabecera y el botón de serie hecha se quedan fijos al hacer scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 520 });
  await startFirstDay(page);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(40);
  const header = await page.locator('.workout-top').boundingBox();
  expect(header.y).toBe(0);
  await expect(page.getByRole('button', { name: 'Salir sin guardar' })).toBeInViewport();
  await expect(page.getByRole('timer', { name: 'Tiempo total' })).toBeInViewport();
  await expect(page.getByRole('timer', { name: 'Descanso' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Reiniciar descanso' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Serie hecha' })).toBeInViewport();
  await weight(page).focus();
  await expect.poll(async () => (await weight(page).boundingBox()).y).toBeGreaterThanOrEqual(header.y + header.height);
});

test('en móvil el descanso arranca al marcar una serie y se reinicia con el botón', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await startFirstDay(page);
  const rest = page.getByRole('timer', { name: 'Descanso' });
  await weight(page).fill('40');
  await reps(page).fill('10');
  await expect(rest).toHaveText('00:00');
  await page.getByRole('button', { name: 'Serie hecha' }).click();
  await expect(rest).toHaveText('00:02', { timeout: 4000 });
  await page.getByRole('button', { name: 'Reiniciar descanso' }).click();
  await expect(rest).toHaveText(/^00:0[01]$/);
  for (const name of ['Reiniciar descanso', 'Subir peso', 'Bajar peso', 'Una repetición más', 'Serie hecha']) {
    const box = await page.getByRole('button', { name, exact: true }).boundingBox();
    expect(Math.min(box.width, box.height), name).toBeGreaterThanOrEqual(44);
  }
});
