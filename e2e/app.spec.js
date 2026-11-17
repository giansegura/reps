import { expect, test } from './test.js';

test('el primer uso muestra el plan de ejemplo y propone su primer día', async ({ page }) => {
  await page.goto('./app/');
  await expect(page).toHaveTitle('Reps');
  await expect(page.getByRole('button', { name: 'Full Body' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Día 1' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Empezar entreno' })).toBeVisible();
  await expect(page.locator('.day-row')).toHaveCount(2);
});

test('el aviso de instalación se recuerda al descartarlo', async ({ page }) => {
  await page.goto('./app/');
  await page.getByRole('button', { name: 'Entendido' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Empezar entreno' })).toBeVisible();
  await expect(page.getByText('Instálala para usarla')).toHaveCount(0);
});

test('publica un manifest instalable', async ({ page }) => {
  const response = await page.request.get('manifest.webmanifest');
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({ name: 'Reps', display: 'standalone', lang: 'es' });
});

test('abre sin conexión', async ({ page, context }) => {
  await page.goto('./app/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Empezar entreno' })).toBeVisible();
  await expect(page.locator('.day-row')).toHaveCount(2);
});

test('las pestañas llevan a Progreso y a Planes y vuelven', async ({ page }) => {
  await page.goto('./app/');
  await page.getByRole('button', { name: 'Progreso', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Progreso' })).toBeVisible();
  await page.getByRole('button', { name: 'Planes', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Planes' })).toBeVisible();
  await page.getByRole('button', { name: 'Hoy', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Empezar entreno' })).toBeVisible();
});

test('en móvil los botones principales se pulsan bien con el dedo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./app/');
  for (const name of ['Empezar entreno', 'Full Body', 'Hoy', 'Progreso', 'Planes']) {
    const box = await page.getByRole('button', { name, exact: true }).boundingBox();
    expect(box.height, name).toBeGreaterThanOrEqual(44);
  }
});

test('el teclado virtual encoge la página para que la cabecera fija siga a la vista', async ({ page }) => {
  await page.goto('./app/');
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /interactive-widget=resizes-content/);
});
