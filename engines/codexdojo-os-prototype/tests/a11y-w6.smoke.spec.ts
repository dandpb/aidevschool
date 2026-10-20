import { expect, test, type Page } from '@playwright/test'
import { missionCatalog } from '../src/data/missions'
import { GeneratedMissionCatalogRepository } from '../src/missions/catalog'
import {
  completeOnboarding,
  createInitialOsProgress,
  missionKey,
  recordMissionCompletion,
} from '../src/progress/domain'

/**
 * AID-5177/W6 — re-medição AAA (contrato §4 B9a/B9b, plano AID-5010 §1.2/§W6)
 * dos pares do HUD do codexdojo-os-prototype, pós-retune:
 *
 * | Par (§1.2)                                | Antes (AA) | Depois (AAA) | Tier |
 * |-------------------------------------------|------------|--------------|------|
 * | --school-muted #3f4a64 sobre --school-paper #f8f4ea | 4.52 | ≥8.05 | B9a |
 * | --school-muted #3f4a64 sobre branco (0.7rem)        | 4.96 | ≥8.84 | B9a |
 * | --muted #a3aec4 sobre --panel-solid #0d1525         | 6.50 | ≥8.17 | B9a |
 * | --muted #a3aec4 sobre bg #07101f                    | 6.78 | ≥8.53 | B9a |
 * | nós lavados do mapa (override W4 removido)          | 7.68 | ≥7.68 | B9a |
 * | medidor .hub-mission-progress #1f8259 sobre #ded8cd | 1.48 (pré-W6) | ≥3.37 | B9b |
 *
 * Leitura canônica (AC 1): valores REAIS via getComputedStyle — pares de
 * token lidos do :root computado (mesma leitura do hud-aliases W5); pares de
 * elemento (nós lavados pós-remoção do override W4, medidor do hub) lidos do
 * render vivo em /map (gradientes: cada endpoint é candidato; o pior limita
 * o par — regra dos specs W0–W4 do dojoToday).
 *
 * Mutation-guard: na base pré-W6 (--school-muted/--muted #657089/#8f9bb0,
 * fill do medidor #49c98f) os asserts B9a/B9b FALHAM (4.52–6.78 < 7;
 * 1.48 < 3). A regressão do override W4 (remover o bloco journey.css sem o
 * retune global) também falha o par dos nós lavados (4.31 < 7) — o spec
 * prova retune E não-regressão.
 */

type PairRow = { pair: string; fg: string; bg: string; ratio: number }

// Mesmo seeding do a11y-w4.smoke.spec.ts (AID-5080): o progresso público
// anônimo não tem missões completadas, então o estado completo é escrito no
// IndexedDB (codexdojo-os/progress/os-progress) antes de navegar ao /map.
async function seedCompletedProgress(page: Page) {
  let progress = completeOnboarding(createInitialOsProgress(missionCatalog), {
    goal: 'build-systems',
    context: 'personal-project',
    confidence: 'high',
    selectedTrackId: 'dev',
  })
  for (const mission of new GeneratedMissionCatalogRepository().listLaunchable('dev')) {
    if (progress.missionStatusByKey[missionKey('dev', mission.id)] === 'completed') continue
    progress = recordMissionCompletion(progress, mission, missionCatalog, undefined, {
      now: new Date('2026-07-20T10:00:00-03:00'),
    })
  }
  await page.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('codexdojo-os', 1)
        open.onupgradeneeded = () => {
          if (!open.result.objectStoreNames.contains('progress'))
            open.result.createObjectStore('progress')
        }
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const database = open.result
          const transaction = database.transaction('progress', 'readwrite')
          transaction.objectStore('progress').put(value, 'os-progress')
          transaction.oncomplete = () => {
            database.close()
            resolve()
          }
          transaction.onerror = () => reject(transaction.error)
        }
      }),
    progress,
  )
}

function contrastOf(fg: [number, number, number], bg: [number, number, number]) {
  const lin = (channel: number) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const luminance = (r: number, g: number, b: number) =>
    0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  const l1 = luminance(...fg)
  const l2 = luminance(...bg)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

function parseHexish(value: string): [number, number, number] | null {
  const v = value.trim().toLowerCase()
  if (v.startsWith('#')) {
    const h = v.slice(1)
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
    if (full.length !== 6) return null
    return [
      Number.parseInt(full.slice(0, 2), 16),
      Number.parseInt(full.slice(2, 4), 16),
      Number.parseInt(full.slice(4, 6), 16),
    ]
  }
  const m = v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (m === null) return null
  if (m[4] !== undefined && Number.parseFloat(m[4]) === 0) return null
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

test('w6-1: pares de TEXTO do HUD ≥7:1 (B9a) e ≥4.5:1 (B2) — tokens computados — AID-5177/W6', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--ads-progress-text')
    return v.trim().length > 0
  })

  const rows: PairRow[] = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement)
    const token = (name: string) => cs.getPropertyValue(name).trim()
    return [
      { pair: '--school-muted sobre --school-paper', fg: token('--school-muted'), bg: token('--school-paper') },
      { pair: '--school-muted sobre branco', fg: token('--school-muted'), bg: '#ffffff' },
      { pair: '--muted sobre --panel-solid', fg: token('--muted'), bg: token('--panel-solid') },
      { pair: '--muted sobre bg :root', fg: token('--muted'), bg: cs.backgroundColor },
      {
        pair: '--ads-attention-text (--school-muted) sobre #fff6df',
        fg: token('--school-muted'),
        bg: '#fff6df',
      },
    ]
  })

  expect(rows.length, 'linhas §1.2 do OS').toBe(5)
  const parsed = rows.map((row) => {
    const fg = parseHexish(row.fg)
    const bg = parseHexish(row.bg)
    expect(fg, `token do par "${row.pair}" resolve em cor (${row.fg})`).not.toBeNull()
    expect(bg, `fundo do par "${row.pair}" resolve em cor (${row.bg})`).not.toBeNull()
    return { ...row, ratio: Number(contrastOf(fg!, bg!).toFixed(2)) }
  })

  for (const row of parsed) {
    // B2 (piso AA ≥4.5) e B9a (AAA HUD ≥7) afirmados juntos (AC 1).
    expect(row.ratio, `B9a ${row.pair} (${row.fg} sobre ${row.bg})`).toBeGreaterThanOrEqual(7)
  }
  expect(Math.min(...parsed.map((r) => r.ratio)), 'pior par de texto do HUD').toBeGreaterThanOrEqual(7)
})

test('w6-2: nós lavados do mapa (override W4 removido) ≥7:1 (B9a) no render vivo — AID-5177/W6', async ({
  page,
}) => {
  await page.goto('/')
  await seedCompletedProgress(page)
  await page.goto('/map')
  await expect(page.locator('.mission-map-node.completed').first()).toBeVisible()

  const rows: PairRow[] = await page.evaluate(() => {
    const parseRgb = (value: string): [number, number, number] | null => {
      const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
      if (m === null) return null
      if (m[4] !== undefined && Number.parseFloat(m[4]) === 0) return null
      return [Number(m[1]), Number(m[2]), Number(m[3])]
    }
    const backgroundsOf = (el: Element): [number, number, number][] => {
      let node: Element | null = el
      while (node !== null) {
        const cs = getComputedStyle(node)
        if (cs.backgroundImage !== 'none') {
          const stops = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)]
            .map((m) => parseRgb(m[0]))
            .filter((v): v is [number, number, number] => v !== null)
          if (stops.length > 0) return stops
        }
        const solid = parseRgb(cs.backgroundColor)
        if (solid !== null) return [solid]
        node = node.parentElement
      }
      return [[255, 255, 255]]
    }
    const visible = (el: Element) =>
      el instanceof HTMLElement && !(el.offsetParent === null && el.getClientRects().length === 0)

    // Seletores lavados pós-W4 — hoje herdam var(--journey-muted) =
    // var(--school-muted) = #3f4a64 (o override local foi removido na W6).
    const selectors = [
      '.mission-map-node.completed p',
      '.mission-map-node.verified p',
      '.mission-map-node.canonical-mastery p',
      '.mission-map-node.completed div > span',
    ]
    const out: { pair: string; fg: string; bg: string }[] = []
    for (const selector of selectors) {
      for (const el of document.querySelectorAll(selector)) {
        if (!visible(el)) continue
        const color = getComputedStyle(el).color
        const fg = parseRgb(color)
        if (fg === null) continue
        for (const bg of backgroundsOf(el)) {
          out.push({ pair: `nó lavado ${selector}`, fg: color, bg: `rgb(${bg.join(', ')})` })
        }
      }
    }
    return out
  })

  expect(rows.length, 'nós lavados medidos no /map').toBeGreaterThanOrEqual(2)
  const parsed = rows.map((row) => ({
    ...row,
    ratio: Number(contrastOf(parseHexish(row.fg)!, parseHexish(row.bg)!).toFixed(2)),
  }))
  for (const row of parsed) {
    expect(row.ratio, `B9a ${row.pair} (${row.fg} sobre ${row.bg})`).toBeGreaterThanOrEqual(7)
  }
})

test('w6-3: medidor do hub ≥3:1 (B9b) e captura visual — AID-5177/W6', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--ads-progress-text')
    return v.trim().length > 0
  })

  const rows: PairRow[] = await page.evaluate(() => {
    const parseRgb = (value: string): [number, number, number] | null => {
      const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
      if (m === null) return null
      if (m[4] !== undefined && Number.parseFloat(m[4]) === 0) return null
      return [Number(m[1]), Number(m[2]), Number(m[3])]
    }
    const visible = (el: Element) =>
      el instanceof HTMLElement && !(el.offsetParent === null && el.getClientRects().length === 0)
    const out: { pair: string; fg: string; bg: string }[] = []
    // Medidor (§7.1): fill sólido/spans sobre a trilha (não-texto, 1.4.11).
    for (const track of document.querySelectorAll('.hub-mission-progress')) {
      if (!visible(track)) continue
      const trackBg = parseRgb(getComputedStyle(track).backgroundColor)
      if (trackBg === null) continue
      const fill = track.querySelector('span')
      if (!(fill instanceof HTMLElement) || !visible(fill)) continue
      const cs = getComputedStyle(fill)
      const solid = parseRgb(cs.backgroundColor)
      if (solid !== null) {
        out.push({
          pair: 'fill do .hub-mission-progress sobre a trilha',
          fg: `rgb(${solid.join(', ')})`,
          bg: `rgb(${trackBg.join(', ')})`,
        })
      }
    }
    return out
  })

  // O medidor do hub pode não estar visível na rota "/" (desktop chrome);
  // quando visível, o par deve obedecer B9b — o par de token equivalente
  // (--ads-progress-fill #49c98f sobre --ads-progress-track #ded8cd) é
  // afirmado aqui de forma determinística.
  const pair =
    rows[0] ??
    (await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement)
      return {
        pair: 'fill do .hub-mission-progress (tokens §7.1) sobre a trilha',
        fg: cs.getPropertyValue('--ads-progress-fill').trim(),
        bg: cs.getPropertyValue('--ads-progress-track').trim(),
      }
    }))
  const ratio = Number(contrastOf(parseHexish(pair.fg)!, parseHexish(pair.bg)!).toFixed(2))
  expect(ratio, `B9b ${pair.pair} (${pair.fg} sobre ${pair.bg})`).toBeGreaterThanOrEqual(3)

  await page.screenshot({
    fullPage: true,
    path: test.info().outputPath('w6-hud-after.png'),
  })
})
