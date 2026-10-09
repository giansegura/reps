import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from './test.js';

const backupPath = path.join(import.meta.dirname, 'fixtures', 'backup.json');

const openPlans = async (page) => {
  await page.goto('./');
  await page.locator('.plan-switcher').click();
  await expect(page.getByRole('heading', { name: 'Planes' })).toBeVisible();
};

test('exporta una copia válida', async ({ page }) => {
  await openPlans(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar copia' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^reps-\d{4}-\d{2}-\d{2}\.json$/);
  const backup = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  expect(backup).toMatchObject({ app: 'reps', version: 1 });
  expect(backup.plans.plans[0].name).toBe('Full Body');
});

test('rechaza un archivo que no es una copia', async ({ page }) => {
  await openPlans(page);
  await page.locator('input[type=file]').setInputFiles({
    name: 'otra-cosa.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"hola":1}'),
  });
  await expect(page.getByText('Archivo no válido')).toBeVisible();
  await expect(page.getByText('Full Body')).toBeVisible();
});

test('importa una copia y la conserva tras recargar', async ({ page }) => {
  await openPlans(page);
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('input[type=file]').setInputFiles(backupPath);
  await expect(page.getByText('Datos importados')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /Torso \/ Pierna/ })).toBeVisible();
  const torso = page.locator('.day-card', { hasText: 'Torso' });
  await expect(torso).toContainText('Press inclinado');
  await expect(torso).toContainText('30 kg');
  await expect(torso).toContainText('Último ·');
});

test('cancelar la importación no cambia nada', async ({ page }) => {
  await openPlans(page);
  const dialog = page.waitForEvent('dialog');
  await page.locator('input[type=file]').setInputFiles(backupPath);
  await (await dialog).dismiss();
  await page.getByRole('button', { name: '← Volver' }).click();
  await expect(page.getByRole('button', { name: /Full Body/ })).toBeVisible();
  await expect(page.getByText('Datos importados')).toHaveCount(0);
});

test('arranca con datos dañados y guarda una copia aparte', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.setItem('reps-plans', '{"activePlanId":"x","plans":[{"id":"x"}]}');
    localStorage.setItem('reps-sessions', '[null]');
  });
  await page.reload();
  await expect(page.getByText('datos dañados')).toBeVisible();
  await expect(page.getByRole('button', { name: /Full Body/ })).toBeVisible();
  const copies = await page.evaluate(() => [
    localStorage.getItem('reps-plans-corrupt'),
    localStorage.getItem('reps-sessions-corrupt'),
  ]);
  expect(copies).toEqual(['{"activePlanId":"x","plans":[{"id":"x"}]}', '[null]']);
});
