import fs from 'node:fs';
import { expect, test } from './test.js';

const legacySession = {
  dayId: 'day1',
  date: '2026-10-01T10:00:00.000Z',
  exercises: { squat: { 1: { weight: '60', reps: '8', done: true } } },
};

const seed = async (page, entries) => {
  await page.goto('./app/');
  await page.evaluate((data) => {
    localStorage.clear();
    Object.entries(data).forEach(([key, value]) => localStorage.setItem(key, value));
  }, entries);
  await page.reload();
};

const saveFirstDay = async (page, weight) => {
  await page.locator('.day-card').first().click();
  await page.locator('.set-row').first().getByRole('spinbutton', { name: /peso/ }).fill(weight);
  await page.getByRole('button', { name: /^Guardar entreno/ }).click();
  await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible();
};

test('migra datos de la versión 1 y conserva todo el historial', async ({ page }) => {
  await seed(page, { 'reps-sessions': JSON.stringify([legacySession]) });
  await expect(page.locator('.day-card').first()).toContainText('60 kg');
  expect(await page.evaluate(() => localStorage.getItem('reps-version'))).toBe('2');

  await saveFirstDay(page, '62.5');
  await saveFirstDay(page, '65');
  await expect(page.locator('.day-card').first()).toContainText('65 kg');

  await page.locator('.plan-switcher').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar copia' }).click();
  const backup = JSON.parse(fs.readFileSync(await (await downloadPromise).path(), 'utf8'));
  expect(backup.version).toBe(2);
  expect(backup.sessions.map(s => s.exercises.squat[1].weight)).toEqual(['60', '62.5', '65']);
  expect(backup.sessions.every(s => s.planId === 'plan1')).toBe(true);
});

test('deshace una escritura que se quedó a medias', async ({ page }) => {
  const halfWritten = { activePlanId: 'x', plans: [{ id: 'x', name: 'A medias', days: [] }] };
  await seed(page, {
    'reps-version': '2',
    'reps-plans': JSON.stringify(halfWritten),
    'reps-journal': JSON.stringify({ 'reps-plans': null }),
  });
  await expect(page.getByRole('button', { name: /Full Body/ })).toBeVisible();
  expect(await page.evaluate(() => [localStorage.getItem('reps-journal'), localStorage.getItem('reps-plans')]))
    .toEqual([null, null]);
});

test('con datos de una versión más nueva bloquea la app y no escribe nada', async ({ page }) => {
  const entries = { 'reps-version': '3', 'reps-sessions': '{"formato":"nuevo"}' };
  await seed(page, entries);
  await expect(page.getByRole('heading', { name: 'Actualiza Reps' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Descargar datos' })).toBeVisible();
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(entries);
});
