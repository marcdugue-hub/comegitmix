// Puzzle screen: one choice puzzle (wrong answer, retry, right answer, stars saved) and one typed puzzle.
import { test, expect } from '@playwright/test';

const progressOf = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('comegitmix:v1') || '{}'));

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('comegitmix:v1')) localStorage.setItem('comegitmix:v1', JSON.stringify({ lang: 'en' }));
  });
});

test('choice puzzle: a wrong answer is explained, the right one earns stars and shows the takeaway', async ({ page }) => {
  await page.goto('#/puzzle/04-trois-wip-en-un');
  await expect(page.locator('.puzzle-options .opt')).toHaveCount(4);
  await expect(page.locator('.puzzle-goal')).toBeVisible();
  await expect(page.locator('.scene-render')).toBeVisible();
  await expect(page.locator('[data-action-name="check"]')).toBeDisabled();

  // wrong answer: explanation, scene shows the result, a star is lost
  await page.locator('.opt', { hasText: 'git reset --hard HEAD~3' }).click();
  await page.locator('[data-action-name="check"]').click();
  await expect(page.locator('.puzzle-feedback.is-wrong')).toBeVisible();
  await expect(page.locator('.opt.is-wrong')).toHaveCount(1);
  await expect(page.locator('.puzzle-actions .puzzle-stars')).toHaveAttribute('aria-label', /^2 /);

  // retry with the right answer
  await page.locator('[data-action-name="retry"]').click();
  await page.locator('.opt', { hasText: 'git rebase -i HEAD~3' }).click();
  await page.locator('[data-action-name="check"]').click();
  await expect(page.locator('.puzzle-feedback.is-right')).toBeVisible();
  await expect(page.locator('.puzzle-takeaway')).toContainText('squash');
  await expect(page.locator('.puzzle-stars--final')).toHaveAttribute('aria-label', /^2 /);
  await expect(page.locator('[data-action-name="next"]')).toBeVisible();
  expect((await progressOf(page)).puzzles['04-trois-wip-en-un']).toBe(2);

  // next puzzle
  await page.locator('[data-action-name="next"]').click();
  await expect(page).toHaveURL(/#\/puzzle\/05-/);
  await expect(page.locator('.puzzle-options .opt').first()).toBeVisible();
});

test('typed puzzle: the terminal plays commands, reset works, the right command solves it', async ({ page }) => {
  await page.goto('#/puzzle/13-un-bureau-pour-l-ia');
  const field = page.locator('.terminal-field');
  await expect(field).toBeVisible();

  // a wrong move: the scene changes, the terminal answers, no success
  await field.fill('git worktree add ../autre -b ia/y');
  await field.press('Enter');
  await expect(page.locator('.terminal-entry')).toHaveCount(1);
  await expect(page.locator('.puzzle-note')).toBeVisible();
  await expect(page.locator('.puzzle-feedback.is-right')).toHaveCount(0);

  // hint, then reset
  await page.locator('[data-action-name="hint"]').click();
  await expect(page.locator('.puzzle-hint')).toContainText('git worktree');
  await page.locator('[data-action-name="reset"]').click();
  await expect(page.locator('.terminal-entry')).toHaveCount(0);

  // an unknown command is only an error message
  await field.fill('git nope');
  await field.press('Enter');
  await expect(page.locator('.terminal-error')).toBeVisible();

  await field.fill('git worktree add ../rapport-ia-graphiques -b ia/graphiques');
  await field.press('Enter');
  await expect(page.locator('.puzzle-feedback.is-right')).toBeVisible();
  await expect(page.locator('.puzzle-takeaway')).toContainText('worktree add');
  // 1 wrong move + 1 hint -> 1 star
  await expect(page.locator('.puzzle-stars--final')).toHaveAttribute('aria-label', /^1 /);
  expect((await progressOf(page)).puzzles['13-un-bureau-pour-l-ia']).toBe(1);
  await expect(field).toBeDisabled();
});
