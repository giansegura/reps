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
  await page.getByRole('button', { name: 'Planes', exact: true }).click();
  await page.getByRole('button', { name: 'Editar Full Body' }).click();
  await expect(page.getByRole('heading', { name: 'Editar con IA' })).toBeVisible();
};

const change = (page, name) => page.locator('.import-item', { has: page.getByText(name, { exact: true }) });

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
  await expect(page.getByText('1 ejercicio nuevo · 1 ejercicio quitado · 1 con cambios')).toBeVisible();
  await expect(change(page, 'Remo con mancuernas')).toContainText('Ejercicio nuevo · 3×10');
  await expect(change(page, 'Press de banca')).toContainText('Se quita · sus entrenos se conservan');
  await expect(change(page, 'Sentadilla trasera')).toContainText('Antes «Sentadilla»');
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
  await page.getByRole('button', { name: /^Día 1/ }).click();
  await expect(page.locator('.hero')).toContainText('Sentadilla trasera');
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
  await page.getByRole('button', { name: 'Planes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Planes' })).toBeVisible();
  await upload(page, { app: 'reps', kind: 'plan', version: 2, plan: { id: 'plan1', name: 'Otro', days: [] } });
  await expect(page.getByText('Este archivo es de un solo plan')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Full Body' })).toBeVisible();
});

test('importa superseries y descansos puestos por la IA', async ({ page }) => {
  await seed(page);
  await openEditor(page);
  const { data } = await exportPlan(page);
  expect(data.instructions).toContain('«superset» (opcional)');
  const [day1, ...rest] = data.plan.days;
  const exercises = day1.exercises.map((ex) => {
    if (ex.id === 'squat') return { ...ex, superset: 'A', rest: 90 };
    if (ex.id === 'bench') return { ...ex, superset: 'A' };
    return ex;
  });
  await upload(page, { ...data, plan: { ...data.plan, days: [{ ...day1, exercises }, ...rest] } });
  await expect(change(page, 'Sentadilla')).toContainText('Descanso 2:00 → 1:30 · en superserie con Press de banca');
  await expect(change(page, 'Press de banca')).toContainText('En superserie con Sentadilla');
  await page.getByRole('button', { name: 'Aplicar cambios' }).click();
  await expect(page.getByText('Plan actualizado')).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('reps-plans')).plans[0].days[0].exercises);
  expect(stored[0]).toMatchObject({ id: 'squat', superset: 'A', rest: 90 });
  expect(stored[1]).toMatchObject({ id: 'bench', superset: 'A' });
  await page.getByRole('button', { name: /^Día 1/ }).click();
  await expect(page.locator('.edit-superset')).toContainText('Press de banca');
});
