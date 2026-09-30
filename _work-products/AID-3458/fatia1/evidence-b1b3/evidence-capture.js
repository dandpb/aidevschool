// AID-3458 B1–B3 evidence capture — usage: node evidence-capture.js <html> <outDir> <prefix>
const { chromium } = require('/paperclip/instances/default/projects/f2527e0b-9532-456c-bef8-b7380cd34f9c/3cbab3d6-45a5-478c-9212-e1484aacbb04/_default/engines/codexdojo-os-prototype/node_modules/playwright-core');
const [,, htmlPath, outDir, prefix] = process.argv;
(async () => {
  const browser = await chromium.launch({ executablePath: '/paperclip/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('file://' + htmlPath);
  const M = {};

  // — Desktop 1280: first paint (disclosure closed)
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${outDir}/${prefix}_initial_desktop1280.png` });

  // — Post-F1 flow (shared helper)
  async function runF1() {
    await page.locator('#start-f1').click();
    await page.locator('.option[data-i="1"]').click();
    await page.locator('#confirm-btn').click();
    await page.locator('#next-btn').click();
    await page.waitForTimeout(200);
  }
  await runF1();
  M.postF1_mission_panel = (await page.locator('#etapa-atual').innerText()).replace(/\n/g, ' | ');
  M.postF1_badge = await page.locator('#mission-number').textContent().catch(() => 'MISSING');
  await page.locator('#map-alt summary').click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${outDir}/${prefix}_postF1_altopen_desktop1280.png`, fullPage: true });

  // — Mobile 390: reload for clean initial state
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForTimeout(250);
  M.mobile_scrollWidth_initial = await page.evaluate(() => document.documentElement.scrollWidth);
  M.mobile_cta_box_initial = await page.locator('#start-f1').boundingBox();
  await page.screenshot({ path: `${outDir}/${prefix}_initial_mobile390.png` });

  // — Mobile post-F1 + disclosure open
  await runF1();
  await page.locator('#map-alt summary').click();
  await page.waitForTimeout(250);
  M.mobile_scrollWidth_postF1open = await page.evaluate(() => document.documentElement.scrollWidth);
  M.mobile_innerWidth = 390;
  M.mobile_altbox_rect = await page.locator('#map-alt .alt-box').boundingBox();
  M.mobile_world_rect = await page.locator('#world').boundingBox();
  M.mobile_altbox_overlaps_world = !!(M.mobile_altbox_rect && M.mobile_world_rect &&
    M.mobile_altbox_rect.top < M.mobile_world_rect.bottom &&
    M.mobile_altbox_rect.bottom > M.mobile_world_rect.top);
  await page.screenshot({ path: `${outDir}/${prefix}_postF1_altopen_mobile390.png`, fullPage: true });
  M.postF1_badge_mobile = await page.locator('#mission-number').textContent().catch(() => 'MISSING');

  require('fs').writeFileSync(`${outDir}/${prefix}_metrics.json`, JSON.stringify(M, null, 2));
  console.log(JSON.stringify(M, null, 2));
  await browser.close();
})();
