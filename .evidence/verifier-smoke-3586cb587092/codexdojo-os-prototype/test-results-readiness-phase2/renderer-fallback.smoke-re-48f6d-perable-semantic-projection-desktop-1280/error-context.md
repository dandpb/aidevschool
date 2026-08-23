# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: renderer-fallback.smoke.spec.ts >> reduced motion selects the keyboard-operable semantic projection
- Location: tests/renderer-fallback.smoke.spec.ts:73:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Verificação independente aprovada', { exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Verificação independente aprovada', { exact: true })

```

```yaml
- main:
  - button "← Hub"
  - paragraph: Simulação hospedada · 12 min
  - 'heading "WAREHOUSE: Key-Value Store (in-memory)" [level=1]'
  - paragraph: Comparar mapas e dicionários sob carga concorrente e persistência simples.
  - text: Estado canônico
  - strong: mastered
  - text: 2 verificadas · sem alteração local Etapa
  - strong: Aplicar
  - text: Motor
  - strong: completed
  - text: Visualização
  - strong: Acessível
  - text: Evidência
  - strong: Evidência rejeitada
  - region "Atividade da missão":
    - iframe
  - complementary "Mentor IA contextual":
    - text: IA
    - strong: Mentor contextual
    - text: Coach contextual · sem ferramentas
    - button "Fechar Mentor IA": ×
    - paragraph:
      - strong: "WAREHOUSE: Key-Value Store (in-memory)"
      - text: "Etapa atual: apply"
    - group "Tipo de ajuda":
      - text: Tipo de ajuda
      - button "Pergunta" [pressed]
      - button "Explicar"
      - button "Pista"
    - text: Sua pergunta
    - textbox "Sua pergunta": Que pergunta pode me ajudar a pensar no proximo passo?
    - button "Pedir ajuda"
    - paragraph: Eu ajudo com perguntas e pistas graduais, sem selecionar a resposta.
    - text: "Pistas do provedor: 0/5 Nao cria evidencia nem avalia dominio."
  - region "Seu esforço virou um próximo passo claro.":
    - paragraph: Prática concluída neste dispositivo
    - heading "Seu esforço virou um próximo passo claro." [level=2]
    - paragraph: A recompensa local celebra a prática. Evidência, veredito independente e competência canônica continuam registros diferentes.
    - region "Recompensas locais":
      - text: XP nesta prática
      - strong: +25 XP
      - text: XP total local
      - strong: 25 XP
      - text: Competências canônicas
      - strong: "2"
    - region "Conquistas desbloqueadas":
      - strong: Nova conquista
      - paragraph: Primeira missão · Primeira prática · Trilha Dev iniciada
    - strong: Resultado da verificação
    - paragraph: A evidência não passou pelo contrato e precisa de uma nova tentativa.
    - paragraph: Precisa de ajuda? O facilitador responde em até 1 dia útil.
    - paragraph:
      - link "WhatsApp":
        - /url: https://wa.me/5511984363878
      - text: ·
      - link "daniel@heropa.com":
        - /url: mailto:daniel@heropa.com?subject=Suporte%20do%20piloto%20AI%20DevSchool
    - button "Voltar ao hub"
  - paragraph: Preveja a prateleira de cada chave e acompanhe a mesma simulacao deterministica por controles rotulados.
- button "Copy element":
  - img
- button "Comment on element":
  - img
- button "Style element":
  - img
- button "Collapse toolbar" [expanded]:
  - img
```

# Test source

```ts
  1   | import { expect, type Page, test } from '@playwright/test'
  2   | 
  3   | type WarehouseHook = {
  4   |   readonly game: {
  5   |     readonly snapshot: {
  6   |       readonly keys: readonly string[]
  7   |       readonly pendingIndex: number
  8   |       readonly phase: string
  9   |     }
  10  |     shelfOfKey(key: string): number
  11  |   }
  12  | }
  13  | 
  14  | async function launchWarehouse(page: Page): Promise<void> {
  15  |   await page.goto('/')
  16  |   await page.getByRole('button', { name: 'Entrar na escola' }).click()
  17  |   await expect(page.getByRole('heading', { name: 'Aprenda uma coisa útil agora.' })).toBeVisible()
  18  |   await page.goto('/mission/dev/game-02-warehouse')
  19  |   await expect(page.getByRole('heading', { name: 'WAREHOUSE: Key-Value Store (in-memory)' })).toBeVisible()
  20  |   await expect.poll(
  21  |     () => page.frames().some((frame) => frame.url().startsWith('http://127.0.0.1:5202/')),
  22  |   ).toBe(true)
  23  | }
  24  | 
  25  | function warehouseFrame(page: Page) {
  26  |   const frame = page.frames().find((candidate) => candidate.url().startsWith('http://127.0.0.1:5202/'))
  27  |   if (frame === undefined) throw new Error('Warehouse mission frame was not loaded')
  28  |   return frame
  29  | }
  30  | 
  31  | async function correctShelf(page: Page): Promise<number | null> {
  32  |   return warehouseFrame(page).evaluate(() => {
  33  |     const hook = (window as Window & { __warehouse?: WarehouseHook }).__warehouse
  34  |     if (hook === undefined) throw new Error('Warehouse test hook is unavailable')
  35  |     const state = hook.game.snapshot
  36  |     const key = state.keys[state.pendingIndex]
  37  |     return key === undefined ? null : hook.game.shelfOfKey(key)
  38  |   })
  39  | }
  40  | 
  41  | async function completeWithAccessibleKeyboard(page: Page): Promise<void> {
  42  |   const mission = page.frameLocator(
  43  |     'iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]',
  44  |   )
  45  |   for (let index = 0; index < 20; index += 1) {
  46  |     const shelf = await correctShelf(page)
  47  |     if (shelf === null) break
  48  |     const action = mission.getByTestId(`accessible-shelf-${shelf}`)
  49  |     await action.focus()
  50  |     await action.press('Enter')
  51  |   }
  52  |   await expect(mission.getByTestId('hud-status')).toContainText('Wave cleared')
  53  | }
  54  | 
  55  | async function evidenceIdentity(page: Page): Promise<Readonly<Record<string, unknown>>> {
  56  |   return warehouseFrame(page).evaluate(() => {
  57  |     const records = (window as Window & {
  58  |       __voxelDojoEvidence?: ReadonlyArray<Readonly<Record<string, unknown>>>
  59  |     }).__voxelDojoEvidence ?? []
  60  |     const record = records[0]
  61  |     if (record === undefined) throw new Error('Expected teaching-game evidence')
  62  |     return {
  63  |       source: record.source,
  64  |       unit_id: record.unit_id,
  65  |       project: record.project,
  66  |       scenario_id: record.scenario_id,
  67  |       game: record.game,
  68  |       pass: record.pass,
  69  |     }
  70  |   })
  71  | }
  72  | 
  73  | test('reduced motion selects the keyboard-operable semantic projection', async ({ page }) => {
  74  |   test.setTimeout(60_000)
  75  |   await page.emulateMedia({ reducedMotion: 'reduce' })
  76  |   await launchWarehouse(page)
  77  |   const mission = page.frameLocator(
  78  |     'iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]',
  79  |   )
  80  | 
  81  |   await expect(mission.getByTestId('accessible-projection')).toBeVisible()
  82  |   await expect(page.getByText('Acessível', { exact: true })).toBeVisible()
  83  |   await completeWithAccessibleKeyboard(page)
> 84  |   await expect(page.getByText('Verificação independente aprovada', { exact: true })).toBeVisible()
      |                                                                                      ^ Error: expect(locator).toBeVisible() failed
  85  |   await expect.poll(() => evidenceIdentity(page)).toEqual({
  86  |     source: 'voxeldojo',
  87  |     unit_id: 'U2-key-value-store',
  88  |     project: '02_key_value_store',
  89  |     scenario_id: 'kv-warehouse-L1',
  90  |     game: 'KV WAREHOUSE',
  91  |     pass: true,
  92  |   })
  93  | })
  94  | 
  95  | test('context loss degrades and retries without resetting simulation or evidence identity', async ({ page }) => {
  96  |   test.setTimeout(60_000)
  97  |   await launchWarehouse(page)
  98  |   const mission = page.frameLocator(
  99  |     'iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]',
  100 |   )
  101 |   await expect(page.getByText('3D WebGL', { exact: true })).toBeVisible()
  102 |   const canvas = mission.locator('#stage')
  103 |   await expect(canvas).toBeVisible()
  104 |   expect(await canvas.evaluate((stage) => {
  105 |     const surface = stage as HTMLCanvasElement
  106 |     return surface.width > 0 && surface.height > 0 && surface.getContext('webgl2') !== null
  107 |   })).toBe(true)
  108 |   expect((await canvas.screenshot()).byteLength).toBeGreaterThan(2_000)
  109 | 
  110 |   for (let index = 0; index < 2; index += 1) {
  111 |     const shelf = await correctShelf(page)
  112 |     if (shelf === null) throw new Error('Expected a pending shelf prediction')
  113 |     await mission.getByTestId(`shelf-${shelf}`).click()
  114 |   }
  115 |   expect(await warehouseFrame(page).evaluate(
  116 |     () => (window as Window & { __warehouse?: WarehouseHook }).__warehouse?.game.snapshot.pendingIndex,
  117 |   )).toBe(2)
  118 | 
  119 |   await canvas.evaluate((stage) => {
  120 |     stage.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
  121 |   })
  122 |   await expect(page.getByText('Missão preservada em modo acessível')).toBeVisible()
  123 |   await expect(mission.getByTestId('accessible-projection')).toBeVisible()
  124 |   expect(await warehouseFrame(page).evaluate(
  125 |     () => (window as Window & { __warehouse?: WarehouseHook }).__warehouse?.game.snapshot.pendingIndex,
  126 |   )).toBe(2)
  127 | 
  128 |   await page.getByRole('button', { name: 'Tentar 3D novamente' }).click()
  129 |   await expect(page.getByText('3D WebGL', { exact: true })).toBeVisible()
  130 |   expect(await warehouseFrame(page).evaluate(
  131 |     () => (window as Window & { __warehouse?: WarehouseHook }).__warehouse?.game.snapshot.pendingIndex,
  132 |   )).toBe(2)
  133 |   await page.getByRole('button', { name: 'Usar visualização acessível' }).click()
  134 |   await expect(mission.getByTestId('accessible-projection')).toBeVisible()
  135 | 
  136 |   await completeWithAccessibleKeyboard(page)
  137 |   await expect(page.getByText('Verificação independente aprovada', { exact: true })).toBeVisible()
  138 |   await expect.poll(() => evidenceIdentity(page)).toEqual({
  139 |     source: 'voxeldojo',
  140 |     unit_id: 'U2-key-value-store',
  141 |     project: '02_key_value_store',
  142 |     scenario_id: 'kv-warehouse-L1',
  143 |     game: 'KV WAREHOUSE',
  144 |     pass: true,
  145 |   })
  146 | })
  147 | 
  148 | test('forced WebGL unavailability fails over without blocking mission controls', async ({ page }) => {
  149 |   test.setTimeout(60_000)
  150 |   await page.addInitScript(() => {
  151 |     const original = HTMLCanvasElement.prototype.getContext
  152 |     HTMLCanvasElement.prototype.getContext = function getContext(
  153 |       this: HTMLCanvasElement,
  154 |       contextId: string,
  155 |       ...args: unknown[]
  156 |     ) {
  157 |       if (contextId === 'webgl2' || contextId === 'webgl') return null
  158 |       return original.call(this, contextId, ...args as [])
  159 |     } as typeof original
  160 |   })
  161 |   await launchWarehouse(page)
  162 |   const mission = page.frameLocator(
  163 |     'iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]',
  164 |   )
  165 | 
  166 |   await expect(page.getByText('WebGL não está disponível neste dispositivo.')).toBeVisible()
  167 |   await expect(mission.getByTestId('accessible-projection')).toBeVisible()
  168 |   await expect(mission.getByTestId(/accessible-shelf-/).first()).toBeVisible()
  169 | })
  170 | 
```