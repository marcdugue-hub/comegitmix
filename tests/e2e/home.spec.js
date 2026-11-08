// Home screen: three mode cards, the mission list numbered 1 to 7 (the comparison screen has no number),
// the puzzle list, navigation to every mode and back, the Resume card after playing.
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.clear();
      localStorage.setItem('comegitmix:v1', JSON.stringify({ lang: 'en' }));
      sessionStorage.setItem('seeded', '1');
    }
  });
});

test('home shows the three modes, the missions 1 to 7 and the puzzles', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('h1')).toContainText('Understand Git');

  const cards = page.locator('.home-card');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText('Mission');
  await expect(cards.nth(1)).toContainText('Puzzle');
  await expect(cards.nth(2)).toContainText('Sandbox');
  await expect(page.locator('.home-card--mission .eyebrow')).toHaveText(/^7 missions/);
  await expect(page.locator('.home-card--puzzle .eyebrow')).toHaveText(/^14 challenges/);

  // missions: numbered 1..7 in the recommended order; the comparison screen (06b) is listed without a number
  const missionRows = page.locator('section[aria-labelledby="home-missions"] .home-row');
  await expect(missionRows).toHaveCount(8);
  const numbers = (await missionRows.locator('.home-row-n').allTextContents()).filter(Boolean);
  expect(numbers).toEqual(['1', '2', '3', '4', '5', '6', '7']);
  await expect(missionRows.first()).toContainText('A first snapshot');
  await expect(missionRows.first()).toContainText('Up next');
  await expect(missionRows.last()).toContainText('A readable history');
  await expect(missionRows.nth(6)).toHaveAttribute('href', '#/mission/06b-deux-facons');

  await expect(page.locator('section[aria-labelledby="home-puzzles"] .home-row')).toHaveCount(14);
  expect(errors).toEqual([]);
});

test('navigation: cards, header tabs, mission and puzzle rows, back to the home', async ({ page }) => {
  await page.goto('./');

  await page.locator('.home-card--mission').click();
  await expect(page).toHaveURL(/#\/mission\/01-premiere-photo(\?step=1)?$/);
  await expect(page.locator('.mission-title')).toContainText('A first snapshot');

  await page.goBack();
  await expect(page.locator('.home-card')).toHaveCount(3);
  await page.locator('.home-card--puzzle').click();
  await expect(page).toHaveURL(/#\/puzzle\/01-/);
  await expect(page.locator('.puzzle-title')).toBeVisible();

  // header tabs
  await page.locator('header').getByRole('link', { name: 'Sandbox' }).click();
  await expect(page).toHaveURL(/#\/sandbox/);
  await expect(page.getByRole('dialog')).toBeVisible(); // start picker on a fresh sandbox
  await page.getByTestId('start-solo').click();
  await expect(page.getByTestId('scene')).toBeVisible();

  // the brand goes home; the Resume card now offers the last screen
  await page.locator('header a[href="#/"]').first().click();
  await expect(page.locator('.home-card')).toHaveCount(3);
  await expect(page.locator('.home-resume')).toBeVisible();

  // a mission row and a puzzle row
  await page.locator('section[aria-labelledby="home-missions"] .home-row').nth(4).click();
  await expect(page).toHaveURL(/#\/mission\/05-partager-avec-l-equipe(\?step=1)?$/);
  await page.goto('./#/');
  await page.locator('section[aria-labelledby="home-puzzles"] .home-row').nth(10).click();
  await expect(page).toHaveURL(/#\/puzzle\/11-quel-diff$/);

  // an unknown route falls back to the home
  await page.goto('./#/nowhere/at-all');
  await expect(page.locator('.home-card')).toHaveCount(3);
});
