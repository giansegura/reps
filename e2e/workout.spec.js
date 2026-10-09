import { expect, test } from './test.js';

const firstSet = (page) => page.locator('.set-row').first();

const startFirstDay = async (page) => {
  await page.goto('./');
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
  await expect(page.locator('.rest-timer')).toHaveCount(0);
  await page.getByRole('button', { name: 'Guardar nota' }).click();
  await expect(page.getByRole('button', { name: /Nota de Sentadilla: codos pegados/ })).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: /^Descanso/ })).toBeVisible();
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
