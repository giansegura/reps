import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from './test.js';

const backupPath = path.join(import.meta.dirname, 'fixtures', 'backup.json');

const openPlans = async (page) => {
  await page.goto('./app/');
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
  expect(backup).toMatchObject({ app: 'reps', version: 2 });
  expect(backup.plans.plans[0].name).toBe('Full Body');
});

test('avisa al exportar el historial para IA sin entrenos', async ({ page }) => {
  await openPlans(page);
  await page.getByRole('button', { name: 'Exportar historial para IA' }).click();
  await expect(page.getByText('Aún no hay entrenos que exportar')).toBeVisible();
});

test('exporta el historial para IA en markdown', async ({ page }) => {
  await page.goto('./app/');
  await page.evaluate(() => {
    localStorage.setItem('reps-version', '2');
    localStorage.setItem('reps-sessions', JSON.stringify([{
      planId: 'plan1',
      dayId: 'day1',
      date: new Date(2026, 2, 1, 10, 15).toISOString(),
      exercises: { squat: { 1: { weight: '60', reps: '8', done: true }, 2: { weight: '62,5', reps: '6', done: true } } },
      notes: { squat: 'Buenas sensaciones' },
    }]));
  });
  await page.reload();
  await page.locator('.plan-switcher').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar historial para IA' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^reps-historial-\d{4}-\d{2}-\d{2}\.md$/);
  const text = fs.readFileSync(await download.path(), 'utf8');
  expect(text).toContain('# Historial de entrenamientos · Reps');
  expect(text).toContain('Entrenos: 1 (del 2026-03-01 al 2026-03-01)');
  expect(text).toContain('### Full Body\n- Día 1: Sentadilla (3×8)');
  expect(text).toContain('### 2026-03-01 · domingo 10:15 · Full Body › Día 1\n- Sentadilla: 60 kg × 8, 62.5 kg × 6\n  Nota: "Buenas sensaciones"\n');
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
  await page.goto('./app/');
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
