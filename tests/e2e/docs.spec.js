// Command cards: header link (new tab), list, one card with its official link, terminal error links.
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

async function setLang(page, lang) {
  await page.goto('./');
  await page.evaluate((l) => {
    localStorage.clear();
    localStorage.setItem('comegitmix:v1', JSON.stringify({ lang: l }));
  }, lang);
}

test('the header link opens the documentation in a new tab', async ({ page, context }) => {
  await setLang(page, 'fr');
  await page.goto('./#/puzzle/01-ranger-un-fichier');
  await page.reload();
  const link = page.locator('.app-header .docs-link');
  await expect(link).toHaveAttribute('target', '_blank');
  const [tab] = await Promise.all([context.waitForEvent('page'), link.click()]);
  await tab.waitForLoadState();
  await expect(tab.locator('.docs-card')).toHaveCount(26);
  await expect(tab.locator('.docs-head h1')).toHaveText('Les commandes, en clair');
});

test('a card shows its sections and the official page in the UI language', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await setLang(page, 'fr');
  await page.goto('./#/docs/merge');
  await page.reload();
  await expect(page.locator('.docs-title')).toHaveText('git merge');
  await expect(page.locator('.docs-section h2').first()).toHaveText('À quoi ça sert');
  await expect(page.locator('.docs-official a')).toHaveAttribute('href', 'https://git-scm.com/docs/git-merge/fr');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('.docs-section h2').first()).toHaveText('What it is for');
  await expect(page.locator('.docs-official a')).toHaveAttribute('href', 'https://git-scm.com/docs/git-merge');
  await page.locator('.docs-see a').first().click();
  await expect(page).toHaveURL(/#\/docs\/rebase$/);
  expect(errors).toEqual([]);
});

test('a terminal error links to the card of the command, or to the list when it is unknown', async ({ page }) => {
  await setLang(page, 'en');
  await page.goto('./#/sandbox');
  await page.reload();
  await page.getByTestId('start-solo').click();
  const field = page.locator('.sb-term .terminal-field');
  await field.fill('git merge nowhere');
  await field.press('Enter');
  const last = page.locator('.sb-term .terminal-doc a').last();
  await expect(last).toHaveAttribute('href', '#/docs/merge');
  await expect(last).toHaveAttribute('target', '_blank');
  await field.fill('git frobnicate');
  await field.press('Enter');
  await expect(page.locator('.sb-term .terminal-doc a').last()).toHaveAttribute('href', '#/docs');
});
