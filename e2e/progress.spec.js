import { expect, test } from './test.js';

const squatSession = (date, weight) => ({
  planId: 'plan1',
  dayId: 'day1',
  date: date.toISOString(),
  exercises: {
    squat: Object.fromEntries([1, 2, 3].map(n => [n, { weight, reps: '8', done: true }])),
  },
  notes: {},
});

const seed = async (page) => {
  await page.clock.setFixedTime(new Date(2026, 9, 21, 12));
  const sessions = [squatSession(new Date(2026, 9, 12, 10), '50'), squatSession(new Date(2026, 9, 19, 10), '60')];
  await page.goto('./app/');
  await page.evaluate((data) => {
    localStorage.clear();
    Object.entries(data).forEach(([key, value]) => localStorage.setItem(key, value));
  }, { 'reps-version': '2', 'reps-sessions': JSON.stringify(sessions) });
  await page.reload();
};

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await seed(page);
});

test('progreso desde el inicio', async ({ page }) => {
  await page.getByRole('button', { name: 'Progreso' }).click();
  await expect(page.getByRole('combobox', { name: 'Ejercicio' })).toHaveValue('day1:squat');
  await expect(page.getByRole('combobox', { name: 'Ejercicio' }).locator('option:checked')).toHaveText('Sentadilla');
  await expect(page.getByText('1.440 kg', { exact: true })).toBeVisible();
  await expect(page.getByText('▲ 20 %')).toBeVisible();
  await page.getByRole('button', { name: 'Mes' }).click();
  await expect(page.getByRole('list', { name: 'Evolución' }).getByRole('listitem')).toHaveCount(6);
});

test('progreso desde el entreno sin perderlo', async ({ page }) => {
  await page.locator('.day-card').first().click();
  const weight = page.locator('.set-row').first().getByRole('spinbutton', { name: /peso/ });
  await weight.fill('40');
  await page.getByRole('button', { name: 'Progreso de Sentadilla' }).click();
  const dialog = page.getByRole('dialog', { name: 'Sentadilla' });
  await expect(dialog.getByText('1.440 kg', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cerrar' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(weight).toHaveValue('40');
  await expect(page.getByRole('timer', { name: 'Descanso' })).toBeVisible();
});

test('los selectores se pulsan bien con el dedo', async ({ page }) => {
  await page.getByRole('button', { name: 'Progreso' }).click();
  for (const name of ['Semana', 'Mes', 'Volumen', 'Peso máx.']) {
    const box = await page.getByRole('button', { name, exact: true }).boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(40);
  }
});
