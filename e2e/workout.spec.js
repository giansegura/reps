import { expect, test } from './test.js';

const weight = (page, set = 1) => page.getByRole('spinbutton', { name: `Sentadilla, serie ${set}, peso en kilos` });
const reps = (page, set = 1) => page.getByRole('spinbutton', { name: new RegExp(`^Sentadilla, serie ${set}, repeticiones`) });
const check = (page, set, exercise = 'Sentadilla') =>
  page.getByRole('button', { name: `Marcar serie ${set} de ${exercise}` });
const nextUp = (page) => page.locator('[aria-current="step"]');
const doneCount = (page) => page.getByText(/series hechas$/);
const more = (page) => page.getByRole('button', { name: /^Notas y progreso de Sentadilla/ });

const startFirstDay = async (page) => {
  await page.goto('./app/');
  await page.getByRole('button', { name: 'Empezar entreno' }).click();
  await expect(check(page, 1)).toBeVisible();
};

test('retoma el entreno en curso tras recargar y lo guarda', async ({ page }) => {
  await startFirstDay(page);
  await weight(page).fill('42.5');
  await reps(page).fill('8');
  await page.reload();
  await expect(page.getByRole('alertdialog', { name: 'Tienes un entreno sin terminar' })).toContainText('Full Body · Día 1');
  await page.getByRole('button', { name: 'Retomar' }).click();
  await expect(weight(page)).toHaveValue('42.5');
  await check(page, 1).click();
  await page.getByRole('button', { name: 'Terminar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Te quedan 14 series' })).toBeVisible();
  await page.getByRole('button', { name: /^Guardar entreno/ }).click();
  await expect(page.getByText('Entreno guardado')).toBeVisible();
  await expect(page.getByText(/^Hecho hoy/)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Día 1' })).toBeVisible();
  await page.getByRole('button', { name: 'Progreso', exact: true }).click();
  await expect(page.locator('.recent-row')).toContainText('42,5 kg × 8');
});

test('las series del último entreno llegan rellenas pero sin marcar', async ({ page }) => {
  await page.goto('./app/');
  await page.evaluate(() => {
    localStorage.setItem('reps-version', '2');
    localStorage.setItem('reps-sessions', JSON.stringify([{
      planId: 'plan1',
      dayId: 'day1',
      date: '2026-10-01T10:00:00.000Z',
      exercises: { squat: { 1: { weight: '60', reps: '8', done: true } } },
      notes: {},
    }]));
  });
  await page.reload();
  await expect(page.getByRole('heading', { level: 2, name: 'Día 2' })).toBeVisible();
  await page.getByRole('button', { name: /^Día 1/ }).click();
  await page.getByRole('button', { name: 'Empezar entreno' }).click();
  await expect(weight(page)).toHaveValue('60');
  await expect(reps(page)).toHaveValue('8');
  await expect(nextUp(page)).toHaveAccessibleName('Marcar serie 1 de Sentadilla');
  await expect(doneCount(page)).toHaveText('0 de 15 series hechas');
  await weight(page).fill('62.5');
  await expect(doneCount(page)).toHaveText('0 de 15 series hechas');
  await check(page, 1).click();
  await expect(doneCount(page)).toHaveText('1 de 15 series hechas');
  await expect(check(page, 1)).toHaveAttribute('aria-pressed', 'true');
  await expect(nextUp(page)).toHaveAccessibleName('Marcar serie 2 de Sentadilla');
  await expect(weight(page)).toHaveValue('62.5');
  await page.getByRole('button', { name: 'Terminar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Guardar entreno, 1 de 15 series' })).toBeEnabled();
});

test('la nota admite espacios y el espacio fuera de un campo arranca el descanso', async ({ page }) => {
  await startFirstDay(page);
  await more(page).click();
  await page.getByRole('button', { name: 'Añadir nota' }).click();
  const note = page.getByRole('textbox', { name: 'Nota de Sentadilla' });
  await note.pressSequentially('codos pegados');
  await expect(note).toHaveValue('codos pegados');
  const rest = page.getByRole('timer', { name: 'Descanso' });
  await expect(rest).toHaveText('00:00');
  await page.getByRole('button', { name: 'Guardar nota' }).click();
  await expect(more(page)).toHaveAccessibleName('Notas y progreso de Sentadilla, con nota de hoy');
  await expect(more(page)).toBeFocused();
  await more(page).click();
  await expect(page.getByRole('dialog', { name: 'Sentadilla' })).toContainText('codos pegados');
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('Space');
  await expect(rest).toHaveText('00:01', { timeout: 3000 });
});

test('salir pide confirmación antes de descartar el entreno', async ({ page }) => {
  await startFirstDay(page);
  await page.getByRole('button', { name: 'Salir sin guardar' }).click();
  const dialog = page.getByRole('alertdialog', { name: '¿Salir sin guardar?' });
  await dialog.getByRole('button', { name: 'Seguir entrenando' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(check(page, 1)).toBeVisible();
  await page.getByRole('button', { name: 'Salir sin guardar' }).click();
  await dialog.getByRole('button', { name: 'Salir sin guardar' }).click();
  await expect(page.getByRole('button', { name: 'Empezar entreno' })).toBeVisible();
});

test('las flechas y el índice pasan de un ejercicio a otro', async ({ page }) => {
  await startFirstDay(page);
  await page.getByRole('button', { name: 'Ejercicio siguiente' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Press de banca' })).toBeVisible();
  await page.getByRole('button', { name: 'Ejercicio 2 de 5. Ver todos los ejercicios' }).click();
  await page.getByRole('dialog', { name: 'Ejercicios de hoy' }).getByRole('button', { name: /Sentadilla/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sentadilla' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ejercicio anterior' })).toBeDisabled();
});

test('la superserie enseña los dos ejercicios y va alternando la serie que toca', async ({ page }) => {
  await page.goto('./app/');
  await page.getByRole('button', { name: 'Planes', exact: true }).click();
  await page.getByRole('button', { name: 'Editar Full Body' }).click();
  await page.getByRole('button', { name: /^Día 1/ }).click();
  await page.getByRole('button', { name: 'Editar Press de banca' }).click();
  await page.getByRole('combobox', { name: 'Superserie con' }).selectOption({ label: 'Sentadilla' });
  await page.getByRole('button', { name: 'Menos descanso' }).click();
  await expect(page.getByRole('group', { name: 'Aviso de descanso' }).getByRole('status')).toHaveText('1:45');
  await page.getByRole('button', { name: 'Día 1', exact: true }).click();
  await expect(page.locator('.edit-superset')).toContainText('Sentadilla');
  await expect(page.locator('.edit-superset')).toContainText('Press de banca');
  await page.getByRole('button', { name: 'Full Body', exact: true }).click();
  await page.getByRole('button', { name: 'Planes', exact: true }).click();
  await page.getByRole('button', { name: 'Hoy', exact: true }).click();
  await page.getByRole('button', { name: 'Empezar entreno' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Superserie · ronda 1 de 3' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Sentadilla', 'Press de banca']);
  await expect(page.getByRole('button', { name: 'Ejercicio 1 y 2 de 5. Ver todos los ejercicios' })).toBeVisible();
  await expect(nextUp(page)).toHaveAccessibleName('Marcar serie 1 de Sentadilla');
  await page.setViewportSize({ width: 390, height: 560 });
  await check(page, 1).click();
  await expect(nextUp(page)).toHaveAccessibleName('Marcar serie 1 de Press de banca');
  const nav = await page.locator('.workout-foot').boundingBox();
  await expect.poll(async () => {
    const row = await nextUp(page).boundingBox();
    return row.y + row.height;
  }).toBeLessThanOrEqual(nav.y);
  await check(page, 1, 'Press de banca').click();
  await expect(nextUp(page)).toHaveAccessibleName('Marcar serie 2 de Sentadilla');
  await expect(page.getByRole('heading', { level: 1, name: 'Superserie · ronda 2 de 3' })).toBeVisible();
});

test('en móvil la cabecera y las flechas se quedan fijas al hacer scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 400 });
  await startFirstDay(page);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(40);
  const header = await page.locator('.workout-top').boundingBox();
  expect(header.y).toBe(0);
  await expect(page.getByRole('button', { name: 'Salir sin guardar' })).toBeInViewport();
  await expect(page.getByRole('timer', { name: 'Tiempo total' })).toBeInViewport();
  await expect(page.getByRole('timer', { name: 'Descanso' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Reiniciar descanso' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Ejercicio siguiente' })).toBeInViewport();
  await weight(page).focus();
  await expect.poll(async () => (await weight(page).boundingBox()).y).toBeGreaterThanOrEqual(header.y + header.height);
});

test('en móvil el descanso arranca al marcar una serie y se reinicia con el botón', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await startFirstDay(page);
  const rest = page.getByRole('timer', { name: 'Descanso' });
  await weight(page).fill('40');
  await reps(page).fill('10');
  await expect(rest).toHaveText('00:00');
  await check(page, 1).click();
  await expect(rest).toHaveText('00:02', { timeout: 4000 });
  await page.getByRole('button', { name: 'Reiniciar descanso' }).click();
  await expect(rest).toHaveText(/^00:0[01]$/);
  const targets = [
    page.getByRole('button', { name: 'Reiniciar descanso' }),
    check(page, 1),
    check(page, 2),
    check(page, 3),
    weight(page, 2),
    reps(page, 3),
    more(page),
    page.getByRole('button', { name: 'Ejercicio siguiente' }),
    page.getByRole('button', { name: /Ver todos los ejercicios/ }),
  ];
  for (const target of targets) {
    const box = await target.boundingBox();
    expect(Math.min(box.width, box.height), await target.getAttribute('aria-label')).toBeGreaterThanOrEqual(44);
  }
});

test('en un móvil estrecho la cabecera cabe sin desbordar la página', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await startFirstDay(page);
  await expect(page.getByRole('button', { name: 'Terminar', exact: true })).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});
