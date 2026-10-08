const path = require('path');
const { chromium } = require('/paperclip/instances/default/projects/f2527e0b-9532-456c-bef8-b7380cd34f9c/3cbab3d6-45a5-478c-9212-e1484aacbb04/_default/engines/codexdojo-os-prototype/node_modules/playwright-core');
const HTML = process.argv[2] || path.join(__dirname, '03-prototipo-entrada.html');
(async () => {
  const browser = await chromium.launch({ executablePath: '/paperclip/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + HTML);
  const t = (name, cond) => { if (!cond) errors.push('FAIL: ' + name); else console.log('ok -', name); };
  t('skip link present', await page.locator('a.skip').count() === 1);
  t('single primary counter 0/4', (await page.locator('#f-progress').textContent()) === '0');
  // C1 — placeholder meta copy removed, replaced by learner-facing progress guidance
  t('C1: no placeholder counter copy', !((await page.locator('body').innerText()).includes('CONTADOR')));
  t('C1: progress label reads as learner guidance', (await page.locator('.player small').textContent()).includes('Avance 4 fundamentos'));
  t('cta before practice (DOM order)', await page.locator('#start-f1').evaluate((el) => { const p = document.querySelector('.practice'); return !!p && p.getBoundingClientRect().top > el.getBoundingClientRect().top; }));
  t('textual map alternative exists', await page.locator('#map-alt summary').count() === 1);
  await page.locator('#map-alt summary').click();
  t('map alt opens with 3 links', await page.locator('#map-alt a').count() === 3);
  // C4 — desktop: open disclosure flows OUTSIDE the drawing area (no rect intersection at 1280)
  const c4 = await page.evaluate(() => {
    const box = document.querySelector('.map-alt .alt-box').getBoundingClientRect();
    const world = document.querySelector('#world').getBoundingClientRect();
    const sep = box.top >= world.bottom - 1 || box.bottom <= world.top + 1 || box.left >= world.right - 1 || box.right <= world.left + 1;
    return { separated: sep, boxTop: Math.round(box.top), worldBottom: Math.round(world.bottom) };
  });
  t('C4: desktop open disclosure outside the drawing area (no intersection at 1280)', c4.separated === true);
  // P3 (revisão 6ff54dd9) — freeze the scenario BEFORE C2 sampling: bob() moves the islands ±3–4px
  // while the sampling window is fixed (2/5 falhas intermitentes observadas pelo revisor).
  // #motion-btn para o loop RAF (emulação CSS prefers-reduced-motion NÃO para: o loop é JS),
  // a paleta deixa de mutar durante a leitura do getImageData.
  await page.locator('#motion-btn').click();
  await page.waitForTimeout(120);
  t('P3: scenario frozen before C2 sampling (#motion-btn paused, aria-pressed=true)', (await page.locator('#motion-btn').getAttribute('aria-pressed')) === 'true');
  // C2 — landmarks: ≥1 illustrated SDLCQuest primitive per island (color variance over the island art band)
  const c2Sample = () => page.evaluate(() => {
    const cv = document.querySelector('#world'), c = cv.getContext('2d');
    const W = cv.width, H = cv.height, s = W / 1040;
    const k = Math.max(s, .5), fY = H * .52, cY = H * .25, dY = H * .8;
    const hK = Math.min(k * .9, (cY - 18) / 165), tK = Math.min(k * .85, (dY - cY - 60) / 160);
    const regions = {
      // P3: banda de Fundamentos altura 52k (era 40k) — a janela terminava 5k ACIMA da âncora do
      // cristal e só um filete ~2px da cunha #324f53 entrava na amostra (causa das falhas com a
      // animação ligada); 52k cobre a cunha e continua acima do rótulo (topo em fY-3).
      fundamentos: [W * .24 - 45, fY - 16 - 45 * k, 90, 52 * k],
      cotidiano: [W * .78 - 45, cY - 16 - 100 * hK, 90, 60],
      dev: [W * .78 - 40, dY - 20 - 95 * tK, 80, 60]
    };
    const out = {};
    const wanted = { fundamentos: ['50,79,83'], cotidiano: ['186,169,135'], dev: ['156,173,212'] };
    for (const nm in regions) {
      const r = regions[nm], x = Math.max(0, Math.round(r[0])), y = Math.max(0, Math.round(r[1]));
      const w = Math.max(8, Math.round(r[2])), h = Math.max(8, Math.round(r[3]));
      const d = c.getImageData(x, y, Math.min(w, cv.width - x), Math.min(h, cv.height - y)).data;
      const colors = new Set();
      for (let i = 0; i < d.length; i += 4) colors.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
      out[nm] = { variance: 0, paletteHit: wanted[nm].some(cl => colors.has(cl)) };
      out[nm].variance = colors.size;
    }
    return out;
  });
  // P3 — determinismo: 5 amostragens consecutivas após congelar; todas devem acertar a paleta
  const c2Runs = [await c2Sample()];
  for (let i = 0; i < 4; i++) c2Runs.push(await c2Sample());
  const lmInfo = c2Runs[c2Runs.length - 1];
  t('P3: C2 palette deterministic across 5 consecutive samples (5/5 hits per island)', c2Runs.every(r => r.fundamentos.paletteHit && r.cotidiano.paletteHit && r.dev.paletteHit));
  t('C2: illustrated landmark on Fundamentos (crystal+plant variance>4)', lmInfo.fundamentos.variance > 4);
  t('C2: SDLCQuest crystal palette (#324f53) present on Fundamentos', lmInfo.fundamentos.paletteHit === true);
  t('C2: illustrated landmark on cotidiano (house silhouette variance>4)', lmInfo.cotidiano.variance > 4);
  t('C2: SDLCQuest house palette (#baa987) present on cotidiano', lmInfo.cotidiano.paletteHit === true);
  t('C2: illustrated landmark on Dev (tower+antenna variance>4)', lmInfo.dev.variance > 4);
  t('C2: SDLCQuest tower+antenna palette (#9cadd4) present on Dev', lmInfo.dev.paletteHit === true);
  t('arrows in F-track (3)', await page.locator('.stage-arrow').count() === 3);
  await page.locator('#start-f1').click();
  t('lesson dialog opens', await page.locator('#lesson').evaluate(d => d.open));
  // P1 (revisão 6ff54dd9) — texto factual: 4 opções A–D, não "três respostas"
  const introTxt = await page.locator('.lesson-head p').first().textContent();
  t('P1: lesson intro counts four options A–D (no "três respostas")', introTxt.includes('quatro opções') && !introTxt.includes('três respostas'));
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
  // C3-support — 320/375: zero horizontal overflow in both states (build-level width sweep for the receipt)
  for (const w of [375, 320]) {
    await page.setViewportSize({ width: w, height: 844 });
    await page.reload();
    await page.waitForTimeout(150);
    const ovA = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    t('widths: zero horizontal overflow at ' + w + 'px (initial)', ovA <= 0);
    if (!(await page.locator('#map-alt').evaluate(d => d.open))) await page.locator('#map-alt summary').click();
    await page.waitForTimeout(150);
    const ovB = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    t('widths: zero horizontal overflow at ' + w + 'px (disclosure open)', ovB <= 0);
  }
  await page.screenshot({ path: '/tmp/opencode/aid3458/after_mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: '/tmp/opencode/aid3458/after_desktop.png', fullPage: true });
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'ALL CHECKS PASSED');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
