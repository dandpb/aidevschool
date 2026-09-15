import { test, expect } from '@playwright/test';

test('codexDojo core dashboard accessibility', async ({ page }) => {
  await page.goto('http://localhost:5180');

  // Wait for load
  await page.waitForTimeout(1000);

  // Check that nav buttons have aria-label
  const navButtons = await page.locator('.nav-button');
  const navCount = await navButtons.count();
  for (let i = 0; i < navCount; i++) {
    const btn = navButtons.nth(i);
    const label = await btn.getAttribute('aria-label');
    const title = await btn.getAttribute('title');
    expect(label).toBeTruthy();
    expect(label).toMatch(/^Ir para /);
    expect(title).toBe(label);
  }

  // Go to Roadmap to check filter buttons
  await page.click('button[data-view="roadmap"]');
  await page.waitForTimeout(1000);

  const filterButtons = await page.locator('.filter-button');
  const filterCount = await filterButtons.count();
  for (let i = 0; i < filterCount; i++) {
    const btn = filterButtons.nth(i);
    const label = await btn.getAttribute('aria-label');
    const title = await btn.getAttribute('title');
    expect(label).toBeTruthy();
    expect(label).toMatch(/^Filtrar por /);
    expect(title).toBe(label);
  }
});
