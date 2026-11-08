// Accessibility (SPEC §5): a keyboard-only path home -> sandbox command -> mission step with a visible focus,
// accessible names on every control, and no animation under prefers-reduced-motion.
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });

/** Presses Tab until the focused element matches `selector` (fails after `max` presses). */
async function tabTo(page, selector, max = 120) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate((s) => document.activeElement?.matches(s), selector)) return;
  }
  throw new Error(`focus never reached ${selector}`);
}

const focusVisible = (page) => page.evaluate(() => {
  const e = document.activeElement;
  const cs = getComputedStyle(e);
  const ring = (x) => x && x !== 'none';
  const wrap = e.closest('.terminal-input');
  return (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || ring(cs.boxShadow) || (wrap && ring(getComputedStyle(wrap).boxShadow));
});

test('keyboard only: home -> sandbox start -> a command -> a mission step', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  // the home re-renders once the mission and puzzle titles are read: wait for it before tabbing
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.home-row-title').first()).not.toHaveText(/^01-/);

  await tabTo(page, '.home-card--sandbox');
  expect(await focusVisible(page)).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/sandbox/);

  // start picker dialog: reachable and usable with the keyboard
  await expect(page.getByRole('dialog')).toBeVisible();
  await tabTo(page, '[data-testid="start-solo"]');
  expect(await focusVisible(page)).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // a palette command with the keyboard
  await tabTo(page, '[data-command="status"]');
  expect(await focusVisible(page)).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.locator('.sb-term .terminal-cmd').last()).toHaveText('git status');

  // a typed command
  await tabTo(page, '.sb-term .terminal-field');
  expect(await focusVisible(page)).toBe(true);
  await page.keyboard.type('git branch feature/keyboard');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-testid=scene] [data-action=branch][data-branch="feature/keyboard"]')).toHaveCount(1);

  // header tab to the mission, then validate the first step by typing
  await tabTo(page, 'header nav a[href^="#/mission"]');
  await page.keyboard.press('Enter');
  await expect(page.locator('.mission-title')).toBeVisible();
  await tabTo(page, '.mission-terminal input');
  await page.keyboard.type('git status');
  await page.keyboard.press('Enter');
  await expect(page.locator('.mission-step.is-done')).toHaveCount(1);
  // the step list is made of real buttons reachable by Tab
  await page.keyboard.press('Shift+Tab');
  await tabTo(page, '.mission-card [data-act]');
  expect(await focusVisible(page)).toBe(true);
});

test('every control has an accessible name and the scene has a text summary', async ({ page }) => {
  for (const route of ['#/', '#/sandbox?start=deux-ia', '#/sandbox?start=conflit', '#/mission/06-relire-une-mr', '#/puzzle/04-trois-wip-en-un', '#/puzzle/11-quel-diff']) {
    await page.goto(`./${route}`);
    await page.waitForLoadState('networkidle');
    const unnamed = () => page.evaluate(() => [...document.querySelectorAll('button, a[href], input, select, textarea, [role="button"]')]
      .filter((el) => el.getBoundingClientRect().width > 0)
      .filter((el) => !(el.getAttribute('aria-label') || el.textContent.trim() || el.getAttribute('title') || el.labels?.[0]?.textContent.trim() || el.getAttribute('aria-labelledby')))
      .map((el) => el.outerHTML.slice(0, 120)));
    await expect.poll(unnamed, { message: route }).toEqual([]); // some labels are filled once the content is read
  }
  await page.goto('./#/sandbox?start=deux-ia');
  await expect(page.locator('[data-testid=scene] .sr-only li').first()).toBeAttached();
});

for (const reduce of [true, false]) {
  test(`prefers-reduced-motion ${reduce ? 'reduce: no animation' : 'no-preference: scene animates'}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
    await page.goto('./#/sandbox?start=solo');
    const field = page.locator('.sb-term .terminal-field');
    await field.fill('git switch -c feature/motion');
    await field.press('Enter');
    await field.fill('git add .');
    await field.press('Enter');
    await field.fill('git commit -m "motion"');
    await field.press('Enter');
    const running = await page.evaluate(() => document.getAnimations()
      .filter((a) => a.playState === 'running' && Number(a.effect?.getTiming().duration) > 50).length);
    if (reduce) expect(running).toBe(0);
    else expect(running).toBeGreaterThan(0);
  });
}
