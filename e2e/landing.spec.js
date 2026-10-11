import { expect, test } from './test.js';

test('la landing explica Reps y lleva a la app', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle(/Reps/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Apunta lo que levantas');
  await page.getByRole('link', { name: 'Empezar →' }).click();
  await expect(page).toHaveURL(/\/reps\/app\/$/);
  await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible();
});

test('la app instalada se salta la landing', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query) => (query === '(display-mode: standalone)'
      ? { matches: true, media: query, addEventListener() {}, removeEventListener() {} }
      : original(query));
  });
  await page.goto('./');
  await expect(page).toHaveURL(/\/reps\/app\/$/);
});

test('el manifest abre la app y conserva su identidad', async ({ page }) => {
  const manifest = await (await page.request.get('manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ id: '/reps/', start_url: '/reps/app/', scope: '/reps/app/' });
});
