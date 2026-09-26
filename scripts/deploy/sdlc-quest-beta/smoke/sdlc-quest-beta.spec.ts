import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* AID-2674 — beta smoke: plays the full campaign (missions 1-5, the deploy
 * station included) through the production gate task on the live URL and
 * fails on any console/page error. Answers are derived from the engine's own
 * src/data.js at runtime, so content updates do not stale this spec.
 * AID-2704/F2: runs on a clean clone — @playwright/test pinned in
 * smoke/package.json; __dirname derived ESM-safely (package is type:module);
 * repo root is four levels up from smoke/, not three.
 * Run (from this dir): npm install && npx playwright install chromium && npx playwright test */

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);
const QUEST_URL = process.env.QUEST_URL || 'https://aidevschool-sdlcquest.netlify.app';
const DATA = require(path.resolve(__dirname, '../../../../engines/sdlc-quest/src/data.js'));
const missions = DATA.missions.map((m) => ({
  id: m.id,
  tasks: m.tasks.map((t) => ({ id: t.id, type: t.type, answer: t.answer, items: t.items })),
}));

type Task = { id: string; type: string; answer: any; items?: { id: string; answer: string }[] };

async function solve(page: any, task: Task) {
  const t = task.type;
  if (t === 'select' || t === 'diff') {
    for (const id of task.answer) await page.click(`[data-option="${id}"]`);
  } else if (t === 'choice' || t === 'patch') {
    await page.click(`[data-option="${task.answer}"]`);
  } else if (t === 'classify') {
    for (const item of task.items!) await page.selectOption(`select[data-field="${item.id}"]`, item.answer);
  } else if (t === 'order') {
    for (const step of task.answer) await page.click(`[data-step="${step}"]`);
  } else if (t === 'gate') {
    for (const [field, value] of Object.entries(task.answer)) await page.selectOption(`select[data-field="${field}"]`, value);
  } else if (t === 'incident') {
    for (const action of ['diagnose', 'pause', 'verify', 'escalate', 'record']) {
      await page.click(`[data-incident="${action}"]`);
      await page.waitForTimeout(150);
    }
  }
}

test('sdlc-quest beta: campaign through the production gate (missions 1-5)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e: Error) => errors.push('pageerror: ' + e.message));
  page.on('console', (m: any) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(QUEST_URL + '/', { waitUntil: 'load' });
  await expect(page.locator('#world')).toBeVisible();
  await expect(page.locator('#progress-fraction')).toHaveText('0/18');
  await page.screenshot({ path: 'shots/sdlc-01-home-public.png' });

  await page.click('#start-mission');
  for (let mi = 0; mi <= 4; mi++) {
    for (let ti = 0; ti < missions[mi].tasks.length; ti++) {
      const task = missions[mi].tasks[ti];
      await solve(page, task);
      const alreadyGood = await page.evaluate(() => document.querySelector('#feedback-slot .feedback.good') !== null);
      if (!alreadyGood) {
        await page.click('#verify-btn');
        await page.waitForFunction(() => document.querySelector('#feedback-slot .feedback.good') !== null, null, { timeout: 20000 });
      }
      if (task.id === 'gate') await page.screenshot({ path: 'shots/sdlc-03-gate-authorized.png' });
      await page.click('#verify-btn');
      await page.waitForTimeout(250);
      if (ti === missions[mi].tasks.length - 1) {
        await page.click('[data-action="advance"]');
        await page.waitForTimeout(250);
      }
    }
  }
  await page.click('[data-action="close"]');
  await expect(page.locator('#progress-fraction')).toHaveText('15/18');
  const stats = await page.evaluate(() => (window as any).SDLCQuest.getStats());
  expect(stats.done).toBe(15);
  expect(stats.completed).toBe(5);
  await page.screenshot({ path: 'shots/sdlc-04-map-15of18.png', fullPage: true });
  await expect(page.locator('#harness-banner')).toBeVisible();
  expect(errors, 'no JS/console errors on the public surface: ' + errors.join(' | ')).toEqual([]);
});
