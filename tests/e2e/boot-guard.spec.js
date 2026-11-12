// Boot guard: a normal start shows no error panel; a blocked game file, a file:// page or a start that
// never finishes replaces the blank page with the explained panel, in the browser's language.
import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

test('normal start: no error panel', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.home-card')).toHaveCount(3);
  await expect(page.locator('.boot-error')).toHaveCount(0);
});

test('a blocked game file shows the panel, network first, with a language switch', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'fr-FR' });
  const page = await context.newPage();
  await page.route('**/src/engine/state.js', (route) => route.abort('blockedbyclient'));
  await page.goto('./');
  const panel = page.locator('.boot-error');
  await expect(panel.locator('h1')).toHaveText("Le jeu n'a pas pu démarrer");
  await expect(panel.locator('.boot-error-likely h2')).toContainText('réseau');
  await expect(panel.locator('.boot-error-reasons li')).toHaveCount(4);
  await expect(page.locator('#app')).toBeHidden();
  await panel.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('.boot-error h1')).toHaveText('The game could not start');
  await context.close();
});

test('opened from file:// shows the "local file" cause first', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();
  await page.goto(pathToFileURL(resolve('index.html')).href);
  await expect(page.locator('.boot-error-likely h2')).toHaveText('The file was opened directly from the computer');
  await context.close();
});

test('a start that never finishes shows the panel after the timeout', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();
  await page.addInitScript(() => { window.COMEGITMIX_BOOT_TIMEOUT = 1000; });
  await page.route('**/src/i18n/en.json', () => {}); // never answered
  await page.goto('./');
  await expect(page.locator('.boot-error h1')).toHaveText('The game could not start');
  await page.locator('.boot-error-details summary').click();
  await expect(page.locator('.boot-error-details')).toContainText('after 1 seconds');
  await context.close();
});
