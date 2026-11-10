import fs from 'node:fs';
import { expect, test } from './test.js';

const sessions = [{
  planId: 'plan1',
  dayId: 'day1',
  date: new Date(2026, 2, 1, 10, 15).toISOString(),
  exercises: { squat: { 1: { weight: '60', reps: '8', done: true } }, bench: { 1: { weight: '50', reps: '8', done: true } } },
  notes: {},
}];

const seed = async (page) => {
  await page.goto('./app/');
  await page.evaluate((data) => {
    localStorage.setItem('reps-version', '2');
    localStorage.setItem('reps-sessions', JSON.stringify(data));
  }, sessions);
  await page.reload();
};

const openEditor = async (page) => {
  await page.getByRole('button', { name: 'Editar plan' }).click();
  await expect(page.getByRole('heading', { name: 'Editar con IA' })).toBeVisible();
};

const exportPlan = async (page) => {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar para IA' }).click();
  const download = await downloadPromise;
  return { name: download.suggestedFilename(), data: JSON.parse(fs.readFileSync(await download.path(), 'utf8')) };
};

const editedByAI = (data) => {
  const [day1, ...rest] = data.plan.days;
  const exercises = day1.exercises
    .filter(ex => ex.id !== 'bench')
    .map(ex => (ex.id === 'squat' ? { ...ex, name: 'Sentadilla trasera' } : ex));
  const edited = { ...data, plan: { ...data.plan, days: [{ ...day1, exercises: [...exercises, { name: 'Remo con mancuernas', sets: 3, reps: '10' }] }, ...rest] } };
  delete edited.history;
  return edited;
};

const upload = (page, data, name = 'reps-plan.json', mimeType = 'application/json') =>
  page.locator('input[type=file]').setInputFiles({ name, mimeType, buffer: Buffer.from(JSON.stringify(data)) });

test('exporta un plan para IA', async ({ page }) => {
  await seed(page);
  await openEditor(page);
  const { name, data } = await exportPlan(page);
  expect(name).toMatch(/^reps-plan-full-body-\d{4}-\d{2}-\d{2}\.json$/);
  expect(data).toMatchObject({ app: 'reps', kind: 'plan', version: 2 });
  expect(data.plan.name).toBe('Full Body');
  expect(data.history[0].exercises[0]).toEqual({ id: 'squat', name: 'Sentadilla', sets: ['60 kg × 8'] });
});

test('importa los cambios de la IA y conserva los entrenos', async ({ page }) => {
  await seed(page);
  await openEditor(page);
  const { data } = await exportPlan(page);
  await upload(page, editedByAI(data));
  await expect(page.getByRole('heading', { name: 'Revisar cambios' })).toBeVisible();
  await expect(page.getByText('+ Remo con mancuernas · 3×10')).toBeVisible();
  await expect(page.getByText('− Press de banca · sus entrenos se conservan')).toBeVisible();
  await expect(page.getByText('Sentadilla trasera: antes «Sentadilla»')).toBeVisible();
  await page.getByRole('button', { name: 'Aplicar cambios' }).click();
  await expect(page.getByText('Plan actualizado')).toBeVisible();
  await page.reload();
  const stored = await page.evaluate(() => ({
    sessions: JSON.parse(localStorage.getItem('reps-sessions')),
    plans: JSON.parse(localStorage.getItem('reps-plans')),
  }));
  expect(stored.sessions).toEqual(sessions);
  const day1 = stored.plans.plans[0].days[0].exercises;
  expect(day1.find(ex => ex.id === 'squat').name).toBe('Sentadilla trasera');
  expect(day1.some(ex => ex.id === 'bench')).toBe(false);
  expect(day1.at(-1)).toMatchObject({ name: 'Remo con mancuernas', sets: 3, reps: '10' });
  await expect(page.locator('.day-card', { hasText: 'Día 1' })).toContainText('Sentadilla trasera');
});

test('importa un plan que llega como .txt', async ({ page }) => {
  await seed(page);
  await openEditor(page);
  const { data } = await exportPlan(page);
  await upload(page, editedByAI(data), 'plan.txt', 'text/plain');
  await expect(page.getByRole('heading', { name: 'Revisar cambios' })).toBeVisible();
});

test('la copia completa avisa si recibe un plan', async ({ page }) => {
  await page.goto('./app/');
  await page.locator('.plan-switcher').click();
  await expect(page.getByRole('heading', { name: 'Planes' })).toBeVisible();
  await upload(page, { app: 'reps', kind: 'plan', version: 2, plan: { id: 'plan1', name: 'Otro', days: [] } });
  await expect(page.getByText('Este archivo es de un solo plan')).toBeVisible();
  await expect(page.getByText('Full Body')).toBeVisible();
});
