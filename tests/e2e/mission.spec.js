// Mission screen: mission 1 played end to end (typed commands + a scene click), mission 6 part A (stepper) played
// to its part end, stepper navigation and URL restoration, language switch, comparison screen.
import { test, expect } from '@playwright/test';

async function freshStart(page, lang = 'fr') {
  await page.goto('/');
  await page.evaluate((l) => localStorage.setItem('comegitmix:v1', JSON.stringify({ v: 1, lang: l })), lang);
  await page.reload(); // the language is read at startup
}

async function type(page, command) {
  const input = page.locator('.mission-terminal input');
  await input.fill(command);
  await input.press('Enter');
}

const done = (page) => page.locator('.mission-step.is-done');

test('mission 1 is playable end to end and marked done', async ({ page }) => {
  await freshStart(page);
  await page.goto('/#/mission/01-premiere-photo');
  await expect(page.locator('.mission-steps li')).toHaveCount(4);
  await expect(page.locator('.mission-duo img')).toHaveAttribute('src', 'assets/duo-rond.png');
  await expect(page.locator('.mission-card .mission-cmd')).toContainText('git status');
  // zone ① shows origin locked until mission 5
  await expect(page.locator('.git-layer')).toContainText('5');

  // hint on demand
  await page.locator('.mission-card [data-act="hint"]').click();
  await expect(page.locator('.mission-hint')).toBeVisible();

  await type(page, 'git status');
  await expect(done(page)).toHaveCount(1);
  await expect(page.locator('.mission-happened')).toBeVisible();
  await expect(page).toHaveURL(/step=2/);

  // instruction step: click plan.md in the folder
  await page.locator('.tiles-layer [data-action="click"][data-path="plan.md"]').click();
  await expect(done(page)).toHaveCount(2);

  // the Run button plays the suggested command
  await page.locator('.mission-card [data-act="run"]').click();
  await expect(done(page)).toHaveCount(3);
  await expect(page.locator('.terminal-log')).toContainText('git add intro.md');

  await type(page, 'git commit -m "Introduction revue"');
  const end = page.locator('[data-end="mission"]');
  await expect(end).toBeVisible();
  await expect(end.locator('.mission-takeaway')).toBeVisible();
  await expect(end.locator('[data-next="mission"]')).toHaveAttribute('href', '#/mission/02-une-voie-pour-l-ia');
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('comegitmix:v1')));
  expect(progress.missions['01-premiere-photo']).toBe(true);
});

test('a wrong command does not validate the step', async ({ page }) => {
  await freshStart(page);
  await page.goto('/#/mission/01-premiere-photo');
  await type(page, 'git log');
  await expect(page.locator('.terminal-log')).toContainText('git log');
  await expect(done(page)).toHaveCount(0);
  await type(page, 'git sttaus');
  await expect(page.locator('.terminal-error')).toBeVisible();
  await expect(done(page)).toHaveCount(0);
});

test('mission 6 part A (stepper) is playable to its part end', async ({ page }) => {
  await freshStart(page);
  await page.goto('/#/mission/06-relire-une-mr');
  await expect(page.locator('.mission-part')).toHaveCount(2);
  await expect(page.locator('.mission-work-state')).toHaveClass(/is-visible/);
  await type(page, 'git status');
  await type(page, 'git stash');
  await expect(done(page)).toHaveCount(2);
  await expect(page.locator('.mission-work-state')).toHaveClass(/is-stashed/);
  await type(page, 'git fetch origin');
  await type(page, 'git switch ia/graphiques');
  await expect(done(page)).toHaveCount(4);
  await type(page, 'git diff main...ia/graphiques');
  await expect(page.locator('.diff-screen')).toBeVisible();
  await expect(done(page)).toHaveCount(5);
  await page.keyboard.press('Escape');
  await expect(page.locator('.diff-screen')).toHaveCount(0);
  // site action as a button
  await page.locator('.mission-card [data-act="web"]').click();
  await expect(done(page)).toHaveCount(6);
  await expect(page.locator('.git-layer .mr-card')).toContainText(/Approuv/);
  await type(page, 'git switch main && git stash pop');
  const partEnd = page.locator('[data-end="part"]');
  await expect(partEnd).toBeVisible();
  await expect(page).toHaveURL(/part=A&step=8/);
  await expect(page.locator('.mission-work-state')).toHaveClass(/is-visible/);
  // link to part B
  await partEnd.locator('[data-act="part"]').click();
  await expect(page).toHaveURL(/part=B&step=1/);
  await expect(done(page)).toHaveCount(0);
});

test('stepper: clickable steps, Previous, and the step restored from the URL and after a language switch', async ({ page }) => {
  await freshStart(page);
  await page.goto('/#/mission/06-relire-une-mr?part=A&step=5');
  await expect(done(page)).toHaveCount(4);
  await expect(page.locator('.mission-work-state')).toHaveClass(/is-stashed/);
  await page.locator('.mission-card [data-act="prev"]').click();
  await expect(done(page)).toHaveCount(3);
  await expect(page).toHaveURL(/part=A&step=4/);
  await page.locator('.mission-step-btn[data-step="0"]').click();
  await expect(done(page)).toHaveCount(0);
  await expect(page.locator('.mission-work-state')).toHaveClass(/is-visible/);
  await page.locator('.mission-step-btn[data-step="6"]').click();
  await expect(done(page)).toHaveCount(6);
  await page.reload();
  await expect(done(page)).toHaveCount(6);
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('.mission-card')).toContainText('Back to main');
  await expect(done(page)).toHaveCount(6);
});

test('comparison screen lists both parts with the desk chips', async ({ page }) => {
  await freshStart(page, 'en');
  await page.goto('/#/mission/06b-deux-facons');
  await expect(page.locator('.compare-col')).toHaveCount(2);
  await expect(page.locator('.compare-col').first().locator('.compare-row')).toHaveCount(7);
  await expect(page.locator('.compare-chip').first()).toHaveText('desk untouched');
  await page.locator('.compare-replay').first().click();
  await expect(page).toHaveURL(/06-relire-une-mr\?part=A&step=1/);
  await expect(page.locator('.mission-panel')).toBeVisible();
});
