import { expect, test } from './test.js';

test('el primer uso muestra el plan de ejemplo', async ({ page }) => {
  await page.goto('./app/');
  await expect(page).toHaveTitle('Reps');
  await expect(page.getByRole('button', { name: /Full Body/ })).toBeVisible();
  await expect(page.locator('.day-card')).toHaveCount(3);
});

test('el aviso de instalación se recuerda al descartarlo', async ({ page }) => {
  await page.goto('./app/');
  await page.getByRole('button', { name: 'Entendido' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible();
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
  await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible();
  await expect(page.locator('.day-card')).toHaveCount(3);
});

test('el teclado virtual encoge la página para que la cabecera fija siga a la vista', async ({ page }) => {
  await page.goto('./app/');
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /interactive-widget=resizes-content/);
});
