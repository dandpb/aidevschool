// AID-3458 evidence capture (B1–B3 + C1–C4 receipt) — usage: node evidence-capture.js [html] [outDir] [prefix]
// Defaults resolve next to this script (works from PR checkout, worktree or staging copy).
// C3-refinado (contrato 4b019e13): RAWs são a evidência primária; capturas em 320/375 e de
// lição aberta + feedback com retry (desktop e telefone); larguras de documento 320/375/390 no
// recibo; composições compare_* só DEPOIS de validar dimensões/pixels dos originais locais.
const path = require('path');
const fs = require('fs');
const { chromium } = require('/paperclip/instances/default/projects/f2527e0b-9532-456c-bef8-b7380cd34f9c/3cbab3d6-45a5-478c-9212-e1484aacbb04/_default/engines/codexdojo-os-prototype/node_modules/playwright-core');
const htmlPath = process.argv[2] || path.join(__dirname, '..', '03-prototipo-entrada.html');
const outDir = process.argv[3] || __dirname;
const prefix = process.argv[4] || 'after';
const TOAST_CLEAR_MS = 4600; // toast auto-descarta em 4200ms (a63ad9f1 item 3: recapturar estado limpo)

// PNG IHDR reader — valida assinatura + dimensões ANTES de qualquer composição (nada de tiras 1700x38)
function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47 || b.toString('ascii', 12, 16) !== 'IHDR') {
    return { ok: false, reason: 'not a PNG', bytes: b.length };
  }
  return { ok: true, w: b.readUInt32BE(16), h: b.readUInt32BE(20), bytes: b.length };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/paperclip/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('file://' + path.resolve(htmlPath));
  const M = { prefix: prefix, html: path.basename(htmlPath), viewports: {}, lesson_feedback: {}, compose: {} };

  const docW = () => page.evaluate(() => ({ doc: document.documentElement.scrollWidth, inner: window.innerWidth }));
  async function cleanState() { // foco fora do skip-link + toast descartado
    await page.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
    await page.waitForTimeout(TOAST_CLEAR_MS);
    const toast = await page.evaluate(() => !!document.querySelector('.toast.visible'));
    return !toast;
  }
  async function runF1() {
    await page.locator('#start-f1').click();
    await page.locator('.option[data-i="1"]').click();
    await page.locator('#confirm-btn').click();
    await page.locator('#next-btn').click();
    await page.waitForTimeout(200);
  }
  async function openAlt() {
    if (!(await page.locator('#map-alt').evaluate(d => d.open))) await page.locator('#map-alt summary').click();
    await page.waitForTimeout(200);
  }

  // — Desktop 1280: first paint (disclosure closed)
  await page.waitForTimeout(250);
  M.viewports['1280'] = { initial: await docW() };
  await page.screenshot({ path: `${outDir}/${prefix}_initial_desktop1280.png` });

  // — Desktop: lição aberta (exemplo → tentativa) e feedback explicativo com retry
  await page.locator('#start-f1').click();
  await page.waitForTimeout(250);
  M.lesson_feedback.desktop_lesson_open = await page.evaluate(() => ({
    dialogOpen: document.querySelector('#lesson').open,
    primerVisible: !!document.querySelector('.lesson-primer') && document.querySelector('.lesson-primer').open,
    options: document.querySelectorAll('.option').length
  }));
  await page.screenshot({ path: `${outDir}/${prefix}_lessonopen_desktop1280.png` });
  await page.locator('.option[data-i="2"]').click();
  await page.locator('#confirm-btn').click();
  await page.waitForTimeout(250);
  M.lesson_feedback.desktop_feedback_retry = await page.evaluate(() => ({
    feedbackShown: !document.querySelector('#feedback').hidden,
    feedbackClass: document.querySelector('#feedback').className,
    feedbackExplains: document.querySelector('#feedback').textContent.includes('tente de novo'),
    retryVisible: !document.querySelector('#retry-btn').hidden
  }));
  await page.screenshot({ path: `${outDir}/${prefix}_feedback_retry_desktop1280.png` });
  // recupera para o fluxo pós-F1 a partir do retry (mesma sessão de lição)
  await page.locator('#retry-btn').click();
  await page.locator('.option[data-i="1"]').click();
  await page.locator('#confirm-btn').click();
  await page.locator('#next-btn').click();
  await page.waitForTimeout(200);
  M.postF1_badge = await page.locator('#mission-number').textContent().catch(() => 'MISSING');
  M.postF1_mission_panel = (await page.locator('#etapa-atual').innerText()).replace(/\n/g, ' | ');
  await openAlt();
  M.toast_clean_postF1_desktop = await cleanState(); // estado limpo antes da captura (a63ad9f1 item 3)
  M.viewports['1280'].postF1open = await docW();
  // C4 — disclosure aberto FORA da área do desenho no desktop
  M.desktop_c4_altbox_vs_world = await page.evaluate(() => {
    const box = document.querySelector('.map-alt .alt-box').getBoundingClientRect();
    const world = document.querySelector('#world').getBoundingClientRect();
    return {
      altBox: { top: Math.round(box.top), bottom: Math.round(box.bottom), left: Math.round(box.left), right: Math.round(box.right) },
      world: { top: Math.round(world.top), bottom: Math.round(world.bottom), left: Math.round(world.left), right: Math.round(world.right) },
      intersect: !(box.top >= world.bottom - 1 || box.bottom <= world.top + 1 || box.left >= world.right - 1 || box.right <= world.left + 1)
    };
  });
  await page.screenshot({ path: `${outDir}/${prefix}_postF1_altopen_desktop1280.png`, fullPage: true });

  // — Mobile: 390 (com lição/feedback no telefone), depois 375 e 320
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload(); await page.waitForTimeout(250);
  M.viewports['390'] = { initial: await docW() };
  M.mobile390_cta_box_initial = await page.locator('#start-f1').boundingBox();
  await page.screenshot({ path: `${outDir}/${prefix}_initial_mobile390.png` });
  // lição aberta + feedback com retry no telefone (390)
  await page.locator('#start-f1').click(); await page.waitForTimeout(250);
  M.lesson_feedback.mobile390_lesson_open = await page.evaluate(() => ({ dialogOpen: document.querySelector('#lesson').open, options: document.querySelectorAll('.option').length }));
  await page.screenshot({ path: `${outDir}/${prefix}_lessonopen_mobile390.png` });
  await page.locator('.option[data-i="3"]').click();
  await page.locator('#confirm-btn').click(); await page.waitForTimeout(250);
  M.lesson_feedback.mobile390_feedback_retry = await page.evaluate(() => ({
    feedbackShown: !document.querySelector('#feedback').hidden,
    feedbackExplains: document.querySelector('#feedback').textContent.includes('Tente de novo') || document.querySelector('#feedback').textContent.includes('tente de novo'),
    retryVisible: !document.querySelector('#retry-btn').hidden
  }));
  await page.screenshot({ path: `${outDir}/${prefix}_feedback_retry_mobile390.png` });
  await page.locator('#retry-btn').click();
  await page.locator('.option[data-i="1"]').click();
  await page.locator('#confirm-btn').click();
  await page.locator('#next-btn').click(); await page.waitForTimeout(200);
  M.postF1_badge_mobile = await page.locator('#mission-number').textContent().catch(() => 'MISSING');
  await openAlt();
  M.toast_clean_postF1_mobile390 = await cleanState();
  M.viewports['390'].postF1open = await docW();
  M.mobile390_altbox_overlaps_world = await page.evaluate(() => {
    const box = document.querySelector('.map-alt .alt-box').getBoundingClientRect();
    const world = document.querySelector('#world').getBoundingClientRect();
    return !(box.top >= world.bottom - 1 || box.bottom <= world.top + 1 || box.left >= world.right - 1 || box.right <= world.left + 1);
  });
  await page.screenshot({ path: `${outDir}/${prefix}_postF1_altopen_mobile390.png`, fullPage: true });

  for (const w of [375, 320]) {
    await page.setViewportSize({ width: w, height: 844 });
    await page.reload(); await page.waitForTimeout(250);
    M.viewports[String(w)] = { initial: await docW() };
    await page.screenshot({ path: `${outDir}/${prefix}_initial_mobile${w}.png` });
    await runF1();
    await openAlt();
    M.viewports[String(w)].postF1open = await docW();
    await page.screenshot({ path: `${outDir}/${prefix}_postF1_altopen_mobile${w}.png`, fullPage: true });
  }

  // — Composições compare_*: SÓ depois de validar dimensões/pixels dos originais locais (4b019e13 C3-b)
  if (prefix === 'after') {
    const pairs = [
      ['initial_desktop1280', 1280], ['postF1_altopen_desktop1280', null],
      ['initial_mobile390', 390], ['postF1_altopen_mobile390', null]
    ];
    for (const [state, minW] of pairs) {
      const a = `${outDir}/before_${state}.png`, b = `${outDir}/after_${state}.png`;
      if (!fs.existsSync(a) || !fs.existsSync(b)) { M.compose[state] = 'skipped (missing source)'; continue; }
      const va = pngSize(a), vb = pngSize(b);
      const okDims = va.ok && vb.ok && va.h > 100 && vb.h > 100 && va.bytes > 10000 && vb.bytes > 10000 &&
        (minW == null || (va.w === minW && vb.w >= minW - 2));
      if (!okDims) { M.compose[state] = { skipped: 'validation failed', before: va, after: vb }; continue; }
      const cpage = await browser.newPage({ viewport: { width: 120, height: 120 } });
      const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;font:12px monospace;background:#fff}h2{margin:8px 10px;font-weight:700}.row{display:flex;align-items:flex-start;gap:8px;padding:0 8px 8px}img{display:block;max-height:1200px;width:auto}</style><h2>AID-3458 ${state} — ANTES | DEPOIS</h2><div class="row"><img src="data:image/png;base64,${fs.readFileSync(a).toString('base64')}"><img src="data:image/png;base64,${fs.readFileSync(b).toString('base64')}"></div>`;
      await cpage.setContent(html);
      await cpage.waitForTimeout(150);
      const loaded = await cpage.evaluate(() => Array.from(document.images).every(i => i.complete && i.naturalWidth > 100));
      if (!loaded) { M.compose[state] = { skipped: 'image decode failed in-page' }; await cpage.close(); continue; }
      const box = await cpage.evaluate(() => { const r = document.body.getBoundingClientRect(); return { w: Math.ceil(r.width), h: Math.ceil(r.height) }; });
      await cpage.setViewportSize({ width: Math.min(box.w + 16, 4000), height: Math.max(box.h + 16, 200) });
      await cpage.waitForTimeout(120);
      await cpage.screenshot({ path: `${outDir}/compare_${state}.png`, fullPage: true });
      const vc = pngSize(`${outDir}/compare_${state}.png`);
      M.compose[state] = { validated: { before: `${va.w}x${va.h}`, after: `${vb.w}x${vb.h}` }, composed: vc.ok ? `${vc.w}x${vc.h}` : 'FAIL' };
      await cpage.close();
    }
  }

  fs.writeFileSync(`${outDir}/${prefix}_metrics.json`, JSON.stringify(M, null, 2));
  console.log(JSON.stringify(M, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
