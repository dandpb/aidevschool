const { chromium } = require('/paperclip/instances/default/projects/f2527e0b-9532-456c-bef8-b7380cd34f9c/3cbab3d6-45a5-478c-9212-e1484aacbb04/_default/engines/codexdojo-os-prototype/node_modules/playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/paperclip/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file:///paperclip/instances/default/projects/f2527e0b-9532-456c-bef8-b7380cd34f9c/3cbab3d6-45a5-478c-9212-e1484aacbb04/_default/_work-products/AID-3458/fatia1/03-prototipo-entrada.html');
  const t = (name, cond) => { if (!cond) errors.push('FAIL: ' + name); else console.log('ok -', name); };
  t('skip link present', await page.locator('a.skip').count() === 1);
  t('single primary counter 0/4', (await page.locator('#f-progress').textContent()) === '0');
  t('cta before practice (DOM order)', await page.locator('#start-f1').evaluate((el) => { const p = document.querySelector('.practice'); return !!p && p.getBoundingClientRect().top > el.getBoundingClientRect().top; }));
  t('textual map alternative exists', await page.locator('#map-alt summary').count() === 1);
  await page.locator('#map-alt summary').click();
  t('map alt opens with 3 links', await page.locator('#map-alt a').count() === 3);
  t('arrows in F-track (3)', await page.locator('.stage-arrow').count() === 3);
  await page.locator('#start-f1').click();
  t('lesson dialog opens', await page.locator('#lesson').evaluate(d => d.open));
  // wrong answer -> explanatory feedback + retry
  await page.locator('.option[data-i="2"]').click();
  await page.locator('#confirm-btn').click();
  t('wrong feedback explains principle', (await page.locator('#feedback').textContent()).includes('tente de novo'));
  t('retry visible', await page.locator('#retry-btn').isVisible());
  await page.locator('#retry-btn').click();
  await page.locator('.option[data-i="1"]').click();
  await page.locator('#confirm-btn').click();
  t('correct feedback ok', (await page.locator('#feedback').getAttribute('class')).includes('ok'));
  await page.locator('#next-btn').click();
  t('progress 1/4', (await page.locator('#f-progress').textContent()) === '1');
  t('F2 unlocked', await page.locator('.stage-node[data-f="2"]').evaluate(n => !n.disabled && n.getAttribute('aria-current') === 'true'));
  t('takeaway written', (await page.locator('#takeaway').getAttribute('hidden')) === null);
  t('dialog closed', await page.locator('#lesson').evaluate(d => !d.open));
  // B1 — atomic post-F1 state: every step element coherent with F2, zero F1 residue
  t('B1: badge advances to F2/4', (await page.locator('#mission-number').textContent()) === 'F2/4');
  t('B1: title advances to Uso seguro', (await page.locator('#mission-title').textContent()) === 'Uso seguro');
  t('B1: description is F2 (dados sensíveis)', (await page.locator('#mission-desc').textContent()).includes('dados sensíveis'));
  const metaTxt = await page.locator('#mission-meta').innerText();
  t('B1: tags re-rendered (≈5 min, no ≈4 min residue)', metaTxt.includes('≈ 5 min') && !metaTxt.includes('≈ 4 min'));
  t('B1: CTA label says F2', (await page.locator('#start-f1').innerText()).includes('Começar F2'));
  const panelTxt = await page.locator('#etapa-atual').innerText();
  t('B1: no F1 text survives in step panel', !panelTxt.includes('Entender IA') && !panelTxt.includes('modelo de linguagem'));
  t('B1: task preview reset (no finished residue)', (await page.locator('#task-preview .finished').count()) === 0);
  // keyboard: focus-visible outline token
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => { const el = document.activeElement; return getComputedStyle(el).outlineColor + ' ' + getComputedStyle(el).outlineWidth; });
  t('focus outline visible on keyboard', outline.includes('rgb(18, 98, 76)'));
  // reduced motion honored in CSS
  t('reduced-motion rule present', (await page.locator('style').textContent()).includes('prefers-reduced-motion'));
  // Mobile 390px — B2/B3
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  t('mobile: stage nav 2 columns (tratamento 630px copiado da fonte)', await page.locator('.stage-nav').evaluate(n => getComputedStyle(n).gridTemplateColumns.split(' ').length === 2));
  // B3 — CTA within first useful viewport at 390x844
  const cta = await page.locator('#start-f1').boundingBox();
  t('B3: CTA visible in first viewport at 390x844 (y+height <= 844)', !!cta && Math.round(cta.y + cta.height) <= 844);
  // B2 — zero horizontal scroll (initial)
  const hScrollInitial = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  t('B2: zero horizontal overflow (initial)', hScrollInitial <= 0);
  // B2 — open disclosure flows below the map, never overlapping islands/canvas
  if (!(await page.locator('#map-alt').evaluate(d => d.open))) await page.locator('#map-alt summary').click();
  await page.waitForTimeout(150);
  t('B2: disclosure open', await page.locator('#map-alt').evaluate(d => d.open));
  const noOverlap = await page.evaluate(() => {
    const box = document.querySelector('.map-alt .alt-box').getBoundingClientRect();
    const world = document.querySelector('#world').getBoundingClientRect();
    return (box.top + window.scrollY) >= (world.bottom + window.scrollY) - 1; // alt-box starts at/below canvas bottom
  });
  t('B2: open disclosure flows below map (rects do not intersect canvas/islands)', noOverlap);
  const hScrollOpen = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  t('B2: zero horizontal overflow (post-F1 + disclosure open)', hScrollOpen <= 0);
  // topbar within viewport width (brand treatment copied)
  const topbarFits = await page.evaluate(() => document.querySelector('.topbar').getBoundingClientRect().right <= window.innerWidth + 0.5);
  t('B2: topbar/brand fit 390px (tratamento da fonte aplicado)', topbarFits);
  await page.screenshot({ path: '/tmp/opencode/aid3458/after_mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: '/tmp/opencode/aid3458/after_desktop.png', fullPage: true });
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'ALL CHECKS PASSED');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
