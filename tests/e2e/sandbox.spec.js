// Sandbox end to end (docs/SANDBOX.md §11): start picker, palette, terminal, scene clicks, AI, undo, conflict.
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

async function freshSandbox(page, start) {
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('comegitmix:v1', JSON.stringify({ lang: 'en' }));
  });
  await page.goto('./#/sandbox');
  await page.reload();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByTestId(`start-${start}`).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('scene')).toBeVisible();
}

const terminalInput = (page) => page.locator('.sb-term .terminal-field');
async function type(page, text) {
  await terminalInput(page).fill(text);
  await terminalInput(page).press('Enter');
}
const commits = (page) => page.locator('[data-testid=scene] .commit-hit');
const badge = (page, desk, path) => page.locator(`[data-testid=scene] .badge[data-file="${desk}|${path}"]`);
const lastCommand = (page) => page.locator('.sb-term .terminal-cmd').last();

test('play the sandbox: palette, file click, terminal, AI, undo', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await freshSandbox(page, 'deux-ia');

  // every start is offered, including "Conflict ready to resolve" (checked in the other test)
  const before = await commits(page).count();

  // create a branch from the palette: the command is shown, then run
  await page.locator('[data-command=branch]').click();
  const field = page.locator('.sb-ask-input');
  await expect(field).toBeVisible();
  await field.fill('feature/demo');
  await page.locator('.sb-ask button[type=submit]').click();
  await expect(lastCommand(page)).toHaveText('git branch feature/demo');
  await expect(page.locator('[data-testid=scene] [data-action=branch][data-branch="feature/demo"]')).toHaveCount(1);

  // click a file of the active desk: it becomes M
  await page.locator('[data-testid=scene] [data-action=click][data-desk=w1][data-path="intro.md"]').click();
  await expect(badge(page, 'w1', 'intro.md')).toHaveText('M');
  await expect(lastCommand(page)).toContainText('intro.md');

  // stage and commit from the terminal: a new commit dot appears
  await type(page, 'git add intro.md');
  await expect(badge(page, 'w1', 'intro.md')).toHaveText('M'); // staged M (blue)
  await type(page, 'git commit -m "intro reworked"');
  await expect(commits(page)).toHaveCount(before + 1);
  await expect(badge(page, 'w1', 'intro.md')).toHaveCount(0);

  // a played error: explanation, nothing changes
  await type(page, 'git commit -m "again"');
  await expect(page.locator('.sb-term .terminal-error').last()).toBeVisible();
  await expect(commits(page)).toHaveCount(before + 1);

  // make the AI work: one more commit, marked AI, and a "what the AI did" text
  await page.getByTestId('ai-work').click();
  await expect(commits(page)).toHaveCount(before + 2);
  await expect(page.locator('.sb-ai-text')).toBeVisible();

  // undo / redo
  await page.getByTestId('undo').click();
  await expect(commits(page)).toHaveCount(before + 1);
  await page.getByTestId('redo').click();
  await expect(commits(page)).toHaveCount(before + 2);

  // the session survives a reload and a language switch
  await page.reload();
  await expect(commits(page)).toHaveCount(before + 2);
  await page.locator('[data-lang=fr]').click();
  await expect(page.locator('.sb-title')).toContainText('Tout essayer');
  await expect(commits(page)).toHaveCount(before + 2);
  await page.locator('[data-lang=en]').click();
  await expect(page.locator('.sb-title')).toContainText('Try everything');

  expect(errors).toEqual([]);
});

test('conflict start: merge, resolve on the conflict screen, commit', async ({ page }) => {
  await freshSandbox(page, 'conflit');
  const before = await commits(page).count();
  await type(page, 'git merge ia/resume');
  await expect(page.locator('.sb-term .terminal-warning').last()).toBeVisible();
  await expect(badge(page, 'w1', 'plan.md')).toHaveText('!');

  await page.locator('[data-testid=scene] [data-action=diff][data-desk=w1][data-path="plan.md"]').click();
  const screen = page.locator('.conflict-screen');
  await expect(screen).toBeVisible();
  await screen.locator('[data-action=resolve][data-side=theirs]').click();
  await expect(badge(page, 'w1', 'plan.md')).toHaveText('M');
  await screen.locator('[data-action=close]').click();

  await type(page, 'git add plan.md');
  await type(page, 'git commit -m "merge ia/resume"');
  await expect(commits(page)).toHaveCount(before + 1);
  await expect(badge(page, 'w1', 'plan.md')).toHaveCount(0);
});

test('copy as start, then paste it back', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await freshSandbox(page, 'solo');
  await type(page, 'git switch -c feature/x');
  await page.locator('[data-testid=scene] [data-action=create][data-desk=w1][data-dir=""]').click();
  const count = await commits(page).count();
  const chips = await page.locator('[data-testid=scene] [data-action=branch]').count();
  await page.getByTestId('copy-start').click();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('```git-setup');
  await page.getByTestId('paste-start').click();
  await page.getByTestId('paste-area').fill(text);
  await page.getByTestId('paste-use').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(commits(page)).toHaveCount(count);
  await expect(page.locator('[data-testid=scene] [data-action=branch]')).toHaveCount(chips);
  await expect(page.locator('[data-testid=scene] .badge--U[data-file]')).toHaveCount(1);
});
