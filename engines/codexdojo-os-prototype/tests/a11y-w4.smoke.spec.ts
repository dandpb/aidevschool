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
 * AID-5080/W4 — evidência executável do defeito AA vigente do plano AID-5010
 * (§1.2/§W4): nos nós lavados do mapa (`.mission-map-node.completed/
 * .verified/.canonical-mastery`, fundo --school-primary-soft #e5f2eb), o par
 * de texto --school-muted #657089 = 4.31:1 (texto normal: WCAG AA exige
 * >=4.5). Fix W4: override local do par nos nós lavados para #3f4a64
 * (7.68:1 no wash — resolve AA e já cobre B9a/AAA); o par global sobre
 * --school-paper (4.52) permanece e segue para o retune AAA W6.
 *
 * O progresso público anônimo não tem missões completadas, então o estado
 * lavado é semeado pelo próprio domínio (completeOnboarding +
 * recordMissionCompletion, mesmo padrão de progression.smoke.spec.ts) —
 * determinístico, sem depender do snapshot gerado.
 *
 * Mutation-guard: na base (color herdada --journey-muted #657089) este spec
 * FALHA em 4.31:1; com o fix W4 (#3f4a64) passa em 7.68:1. Cor e fundo são
 * lidos do render vivo (estilo computado), então o guard pega qualquer
 * regressão do par, não apenas o valor do token.
 */

const WASHED_TEXT = [
  '.mission-map-node.completed p',
  '.mission-map-node.verified p',
  '.mission-map-node.canonical-mastery p',
  '.mission-map-node.completed div > span',
  '.mission-map-node.verified div > span',
  '.mission-map-node.canonical-mastery div > span',
]

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
  await page.evaluate((value) => new Promise<void>((resolve, reject) => {
    const open = indexedDB.open('codexdojo-os', 1)
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains('progress')) open.result.createObjectStore('progress')
    }
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const database = open.result
      const transaction = database.transaction('progress', 'readwrite')
      transaction.objectStore('progress').put(value, 'os-progress')
      transaction.oncomplete = () => { database.close(); resolve() }
      transaction.onerror = () => reject(transaction.error)
    }
  }), progress)
}

test('w4-1: texto dos nós lavados do mapa atinge contraste AA (>=4.5:1) — AID-5010/W4', async ({ page }) => {
  await page.goto('/')
  await seedCompletedProgress(page)
  await page.goto('/map')

  await expect(page.locator('.mission-map-node.completed').first()).toBeVisible()

  const pairs = await page.evaluate((selectors) => {
    const lin = (channel: number) => {
      const c = channel / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }
    const luminance = (r: number, g: number, b: number) =>
      0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    const parseRgb = (value: string): [number, number, number] | null => {
      const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
      if (m === null) return null
      if (m[4] !== undefined && Number.parseFloat(m[4]) === 0) return null
      return [Number(m[1]), Number(m[2]), Number(m[3])]
    }
    const contrast = (fg: [number, number, number], bg: [number, number, number]) => {
      const l1 = luminance(...fg)
      const l2 = luminance(...bg)
      const hi = Math.max(l1, l2)
      const lo = Math.min(l1, l2)
      return (hi + 0.05) / (lo + 0.05)
    }
    // Fundos efetivos: sobe a árvore até achar cor opaca (o wash do nó é
    // sólido; mesma regra dos specs a11y do dojoToday).
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

    const out: { selector: string; ratio: number; color: string; bg: string }[] = []
    for (const selector of selectors) {
      for (const el of document.querySelectorAll(selector)) {
        if (!(el instanceof HTMLElement)) continue
        if (el.offsetParent === null && el.getClientRects().length === 0) continue
        const fg = parseRgb(getComputedStyle(el).color)
        if (fg === null) continue
        for (const bg of backgroundsOf(el)) {
          out.push({
            selector,
            ratio: Number(contrast(fg, bg).toFixed(2)),
            color: getComputedStyle(el).color,
            bg: `rgb(${bg.join(", ")})`,
          })
        }
      }
    }
    return out
  }, WASHED_TEXT)

  // Sem nós lavados com texto medido o spec seria vazio e provaria nada.
  expect(pairs.length).toBeGreaterThanOrEqual(1);
  // Recibo do produtor (AID-5080/W4): pares medidos no render vivo.
  console.log(`w4-1 measured pairs: ${JSON.stringify(pairs)}`);
  await page
    .locator(".mission-map-node.completed")
    .first()
    .screenshot({ path: "test-results-aid5080/os-washed-node.png" });
  for (const pair of pairs) {
    expect(
      pair.ratio,
      `${pair.selector} ${pair.color} sobre ${pair.bg} (AID-5010/W4)`,
    ).toBeGreaterThanOrEqual(4.5)
  }
})
