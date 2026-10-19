import { expect, test } from './test.js';

const firstSet = (page) => page.locator('.set-row').first();

const startFirstDay = async (page) => {
  await page.goto('./app/');
  await page.locator('.day-card').first().click();
  await expect(page.getByRole('button', { name: '← Salir' })).toBeVisible();
};

test('retoma el entreno en curso tras recargar y lo guarda', async ({ page }) => {
  await startFirstDay(page);
  await firstSet(page).getByRole('spinbutton', { name: /peso/ }).fill('42.5');
  await firstSet(page).getByRole('spinbutton', { name: /repeticiones/ }).fill('8');
  page.once('dialog', (dialog) => dialog.accept());
  await page.reload();
  await expect(firstSet(page).getByRole('spinbutton', { name: /peso/ })).toHaveValue('42.5');
  await page.getByRole('button', { name: /^Guardar entreno/ }).click();
  await expect(page.getByText('Entreno guardado')).toBeVisible();
  const day = page.locator('.day-card').first();
  await expect(day).toContainText('42,5 kg');
  await expect(day).toContainText('Último ·');
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
  await page.keyboard.press('Space');
  await expect(rest).toHaveText('00:01', { timeout: 3000 });
});

test('salir pide confirmación antes de descartar el entreno', async ({ page }) => {
  await startFirstDay(page);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: '← Salir' }).click();
  await expect(page.getByRole('button', { name: '← Salir' })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '← Salir' }).click();
  await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible();
});

test('en móvil la cabecera del entreno se queda fija al hacer scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await startFirstDay(page);
  await page.locator('.exercise-block').last().scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
  const header = await page.locator('.workout-top').boundingBox();
  expect(header.y).toBe(0);
  await expect(page.getByRole('button', { name: '← Salir' })).toBeInViewport();
  await expect(page.getByRole('timer', { name: 'Descanso' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Reiniciar descanso' })).toBeInViewport();
  await expect(page.getByRole('timer', { name: 'Tiempo total' })).toBeInViewport();
  await expect(page.locator('.day-label')).toBeInViewport();
  const weight = page.locator('.exercise-block').nth(2).locator('.set-row').first().getByRole('spinbutton', { name: /peso/ });
  await weight.focus();
  await expect.poll(async () => (await weight.boundingBox()).y).toBeGreaterThanOrEqual(header.y + header.height);
});

test('en móvil el descanso arranca al completar una serie y se reinicia con el botón', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await startFirstDay(page);
  const rest = page.getByRole('timer', { name: 'Descanso' });
  await firstSet(page).getByRole('spinbutton', { name: /peso/ }).fill('40');
  await firstSet(page).getByRole('spinbutton', { name: /repeticiones/ }).fill('10');
  await expect(rest).toHaveText('00:02', { timeout: 4000 });
  await page.getByRole('button', { name: 'Reiniciar descanso' }).click();
  await expect(rest).toHaveText(/^00:0[01]$/);
  const restart = await page.getByRole('button', { name: 'Reiniciar descanso' }).boundingBox();
  expect(restart.width).toBeGreaterThanOrEqual(32);
});
