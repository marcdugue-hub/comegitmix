// FR / EN (SPEC §4): browser-language detection on first launch, instant toggle on every screen (no reload),
// the choice remembered after a reload, singular / plural in engine explanations.
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('comegitmix:v1') || '{}'));
const toggle = (page, name) => page.locator('header').getByRole('button', { name });

for (const [locale, lang, title] of [['fr-FR', 'fr', 'Comprenez Git'], ['en-US', 'en', 'Understand Git'], ['de-DE', 'en', 'Understand Git']]) {
  test.describe(`first launch with a ${locale} browser`, () => {
    test.use({ locale });
    test(`starts in ${lang}`, async ({ page }) => {
      await page.goto('./');
      await expect(page.locator('h1')).toContainText(title);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(toggle(page, lang === 'fr' ? 'Français' : 'English')).toHaveAttribute('aria-pressed', 'true');
    });
  });
}

test.describe('toggle', () => {
  test.use({ locale: 'fr-FR' });

  test('switches instantly on the home, sandbox, mission and puzzle, and is remembered after a reload', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('./');
    await page.evaluate(() => { localStorage.clear(); window.__noReload = true; });

    // home
    await expect(page.locator('h1')).toContainText('Comprenez Git');
    await toggle(page, 'English').click();
    await expect(page.locator('h1')).toContainText('Understand Git');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('.home-card--sandbox')).toContainText('Open the sandbox');
    expect((await stored(page)).lang).toBe('en');
    await toggle(page, 'Français').click();
    await expect(page.locator('h1')).toContainText('Comprenez Git');

    // sandbox: the panel and the scene are translated, the session is kept
    await page.goto('./#/sandbox?start=solo');
    await expect(page.locator('.sb-title, h2').first()).toContainText('Tout essayer');
    await expect(page.getByTestId('scene')).toContainText('Sur votre poste');
    await toggle(page, 'English').click();
    await expect(page.locator('.sb-title, h2').first()).toContainText('Try everything');
    await expect(page.getByTestId('scene')).toContainText('On your computer');
    await expect(page.locator('header nav')).toContainText('Sandbox');

    // mission: narrative content comes from the English file
    await page.goto('./#/mission/01-premiere-photo');
    await expect(page.locator('.mission-title')).toContainText('A first snapshot');
    await toggle(page, 'Français').click();
    await expect(page.locator('.mission-title')).toContainText('Une première photo');

    // puzzle
    await page.goto('./#/puzzle/01-ranger-un-fichier');
    await expect(page.locator('.puzzle-title')).toContainText('Ranger un fichier dans la photo');
    await toggle(page, 'English').click();
    await expect(page.locator('.puzzle-title')).toContainText('Put one file in the snapshot');

    // all of the above happened without reloading the page
    expect(await page.evaluate(() => window.__noReload)).toBe(true);

    // remembered after a reload, even with a French browser
    await page.reload();
    await expect(page.locator('.puzzle-title')).toContainText('Put one file in the snapshot');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.goto('./#/');
    await expect(page.locator('h1')).toContainText('Understand Git');
    expect(errors).toEqual([]);
  });

  test('engine explanations agree in number (1 file / 2 files) in both languages', async ({ page }) => {
    await page.goto('./#/sandbox?start=equipe'); // the open folder starts clean
    const field = page.locator('.sb-term .terminal-field');
    const run = async (cmd) => { await field.fill(cmd); await field.press('Enter'); };
    const files = page.locator('[data-testid=scene] .is-active [data-action=click][data-path$=".md"]');
    await files.nth(0).click();
    await run('git status');
    await expect(page.getByTestId('explanation')).toContainText('1 fichier a changé');
    await toggle(page, 'English').click();
    await run('git status');
    await expect(page.getByTestId('explanation')).toContainText('1 file has changed');
    await files.nth(1).click();
    await run('git status');
    await expect(page.getByTestId('explanation')).toContainText('2 files have changed');
  });
});
