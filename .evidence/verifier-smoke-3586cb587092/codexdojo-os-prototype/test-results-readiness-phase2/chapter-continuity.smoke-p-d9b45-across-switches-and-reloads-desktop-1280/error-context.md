# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: chapter-continuity.smoke.spec.ts >> preserves both complete three-mission chapters across switches and reloads
- Location: tests/chapter-continuity.smoke.spec.ts:133:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Começar missão' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e11]:
        - strong [ref=e12]: AI DevSchool
        - generic [ref=e13]: hub de aprendizagem
      - generic [ref=e14]:
        - generic [ref=e15]:
          - text: Capítulo
          - strong [ref=e16]: IA Prática
        - generic [ref=e17]:
          - text: XP local
          - strong [ref=e18]: "25"
        - generic [ref=e19]:
          - text: Meta
          - strong [ref=e20]: 25/25
    - generic [ref=e21]:
      - paragraph [ref=e22]: Seu próximo passo está pronto
      - heading "Aprenda uma coisa útil agora." [level=1] [ref=e23]
      - paragraph [ref=e24]: Uma missão em destaque, com prática observável e progresso que não confunde conclusão com competência.
    - region "Estado da missão concluída" [ref=e25]:
      - generic [ref=e26]:
        - generic [ref=e27]: "1"
        - strong [ref=e28]: Atividade concluída
        - generic [ref=e29]: Salva neste dispositivo
      - generic [ref=e30]:
        - generic [ref=e31]: "2"
        - strong [ref=e32]: Evidência preservada
        - generic [ref=e33]: Separada do progresso local
      - generic [ref=e34]:
        - generic [ref=e35]: "3"
        - strong [ref=e36]: Verificação independente
        - generic [ref=e37]: Aguardando verificador
      - generic [ref=e38]:
        - generic [ref=e39]: "4"
        - strong [ref=e40]: Competência canônica
        - generic [ref=e41]: Não alterada por este fluxo
    - generic [ref=e42]:
      - article [ref=e43]:
        - paragraph [ref=e44]: Recuperação guiada · 4 min
        - heading "IA não é uma fonte de verdade" [level=2] [ref=e45]
        - paragraph [ref=e46]: Diante de uma resposta convincente sem evidência, reconhecer que ela precisa ser verificada antes de ser usada no trabalho.
        - progressbar "Missões concluídas nesta trilha" [ref=e47]
        - paragraph [ref=e49]:
          - strong [ref=e50]: "Resultado esperado:"
          - text: Compare as duas respostas, escolha a mais confiavel e marque os criterios de verificacao.
        - list [ref=e51]:
          - listitem [ref=e52]:
            - generic [ref=e53]: "1"
            - text: Entender
          - listitem [ref=e54]:
            - generic [ref=e55]: "2"
            - text: Responder
          - listitem [ref=e56]:
            - generic [ref=e57]: "3"
            - text: Aplicar
        - button "Tentar novamente" [ref=e58] [cursor=pointer]
      - complementary [ref=e64]:
        - complementary "Mentor IA contextual" [ref=e65]:
          - generic [ref=e66]:
            - generic [ref=e67]:
              - generic [ref=e68]: IA
              - generic [ref=e69]:
                - strong [ref=e70]: Mentor contextual
                - generic [ref=e71]: Coach contextual · sem ferramentas
            - button "Fechar Mentor IA" [ref=e72] [cursor=pointer]: ×
          - paragraph [ref=e73]:
            - strong [ref=e74]: IA não é uma fonte de verdade
            - text: "Etapa atual: understand"
          - group "Tipo de ajuda" [ref=e75]:
            - generic [ref=e76]: Tipo de ajuda
            - button "Pergunta" [pressed] [ref=e77] [cursor=pointer]
            - button "Explicar" [ref=e78] [cursor=pointer]
            - button "Pista" [ref=e79] [cursor=pointer]
          - generic [ref=e80]:
            - generic [ref=e81]: Sua pergunta
            - textbox "Sua pergunta" [ref=e82]: Que pergunta pode me ajudar a pensar no proximo passo?
          - button "Pedir ajuda" [ref=e83] [cursor=pointer]
          - paragraph [ref=e85]: Eu ajudo com perguntas e pistas graduais, sem selecionar a resposta.
          - generic [ref=e86]:
            - generic [ref=e87]: "Pistas do provedor: 0/5"
            - generic [ref=e88]: Nao cria evidencia nem avalia dominio.
        - article [ref=e89]:
          - paragraph [ref=e90]: Ritmo local
          - heading "Meta de hoje alcançada" [level=2] [ref=e91]
          - paragraph [ref=e92]: "Sequência local ativa: 1 dia."
          - strong [ref=e93]: 3 conquistas locais
        - article [ref=e94]:
          - paragraph [ref=e95]: Progresso honesto
          - heading "Conclusão não é domínio" [level=2] [ref=e96]
          - paragraph [ref=e97]: O jogo e o mentor ajudam a produzir uma tentativa. A verificação independente é um requisito; este fluxo não altera o estado canônico.
          - strong [ref=e98]: 2 competências verificadas
          - button "Entender meu progresso" [ref=e99] [cursor=pointer]
        - article [ref=e100]:
          - paragraph [ref=e101]: Mapa compartilhado
          - heading "Veja o capítulo inteiro" [level=2] [ref=e102]
          - paragraph [ref=e103]: Missões bloqueadas, em andamento e concluídas permanecem visíveis no mapa.
          - button "Abrir mapa" [ref=e104] [cursor=pointer]
  - generic [ref=e106]:
    - generic [ref=e109]:
      - button "Copy element" [ref=e111] [cursor=pointer]:
        - img [ref=e113]
      - button "Comment on element" [ref=e116] [cursor=pointer]:
        - img [ref=e117]
      - button "Style element" [ref=e120] [cursor=pointer]:
        - img [ref=e121]
    - button "Collapse toolbar" [expanded] [ref=e123] [cursor=pointer]:
      - img [ref=e124]
```

# Test source

```ts
  41  |   if (frame === undefined) throw new Error(`Mission frame on port ${port} was not loaded`)
  42  |   return frame
  43  | }
  44  | 
  45  | async function completeWarehouse(frame: Frame) {
  46  |   await expect.poll(() => frame.evaluate(() => {
  47  |     type Hook = { game: { snapshot: { phase: string } } }
  48  |     return (window as Window & { __warehouse?: Hook }).__warehouse?.game.snapshot.phase
  49  |   })).toBe('predicting')
  50  |   await frame.evaluate(() => {
  51  |     type Hook = {
  52  |       game: {
  53  |         snapshot: { phase: string; keys: readonly string[]; pendingIndex: number }
  54  |         shelfOfKey(key: string): number
  55  |         predictShelf(shelf: number): void
  56  |       }
  57  |     }
  58  |     const hook = (window as Window & { __warehouse?: Hook }).__warehouse
  59  |     if (hook === undefined) throw new Error('Warehouse hook unavailable')
  60  |     while (hook.game.snapshot.phase === 'predicting') {
  61  |       const key = hook.game.snapshot.keys[hook.game.snapshot.pendingIndex]
  62  |       if (key === undefined) break
  63  |       hook.game.predictShelf(hook.game.shelfOfKey(key))
  64  |     }
  65  |   })
  66  | }
  67  | 
  68  | async function completeWormhole(frame: Frame) {
  69  |   await expect.poll(() => frame.evaluate(() => {
  70  |     type Hook = { game: { snapshot: { phase: string } } }
  71  |     return (window as Window & { __wormhole?: Hook }).__wormhole?.game.snapshot.phase
  72  |   })).toBe('predicting')
  73  |   await frame.evaluate(() => {
  74  |     type Hook = {
  75  |       game: {
  76  |         snapshot: { phase: string }
  77  |         predictedCodeForPending(): string
  78  |         predictCode(code: string): void
  79  |       }
  80  |     }
  81  |     const hook = (window as Window & { __wormhole?: Hook }).__wormhole
  82  |     if (hook === undefined) throw new Error('Wormhole hook unavailable')
  83  |     while (hook.game.snapshot.phase === 'predicting') {
  84  |       const code = hook.game.predictedCodeForPending()
  85  |       if (code === '') break
  86  |       hook.game.predictCode(code)
  87  |     }
  88  |   })
  89  | }
  90  | 
  91  | async function completeRelay(frame: Frame) {
  92  |   await expect.poll(() => frame.evaluate(() => {
  93  |     type Hook = { game: { snapshot: { phase: string } } }
  94  |     return (window as Window & { __relayStation?: Hook }).__relayStation?.game.snapshot.phase
  95  |   })).toBe('predicting')
  96  |   await frame.evaluate(() => {
  97  |     type Hook = {
  98  |       game: {
  99  |         snapshot: { phase: string }
  100 |         truthConnected(): string[]
  101 |         togglePredict(stationId: string): void
  102 |         submit(): void
  103 |       }
  104 |     }
  105 |     const hook = (window as Window & { __relayStation?: Hook }).__relayStation
  106 |     if (hook === undefined) throw new Error('Relay Station hook unavailable')
  107 |     for (const stationId of hook.game.truthConnected()) hook.game.togglePredict(stationId)
  108 |     hook.game.submit()
  109 |   })
  110 | }
  111 | 
  112 | async function returnFromGame(page: Page) {
  113 |   await expect(page.getByRole('button', { name: 'Voltar ao hub', exact: true })).toBeEnabled({ timeout: 15_000 })
  114 |   await page.getByRole('button', { name: 'Voltar ao hub', exact: true }).click()
  115 | }
  116 | 
  117 | async function readOsProgress(page: Page): Promise<{ missionStatusByKey: Record<string, string> }> {
  118 |   return page.evaluate(() => new Promise((resolve, reject) => {
  119 |     const open = indexedDB.open('codexdojo-os', 1)
  120 |     open.onerror = () => reject(open.error)
  121 |     open.onsuccess = () => {
  122 |       const database = open.result
  123 |       const request = database.transaction('progress').objectStore('progress').get('os-progress')
  124 |       request.onerror = () => reject(request.error)
  125 |       request.onsuccess = () => {
  126 |         database.close()
  127 |         resolve(request.result)
  128 |       }
  129 |     }
  130 |   }))
  131 | }
  132 | 
  133 | test('preserves both complete three-mission chapters across switches and reloads', async ({ page }) => {
  134 |   await page.goto('/')
  135 |   await page.getByRole('button', { name: 'Entrar na escola' }).click()
  136 | 
  137 |   await page.getByRole('button', { name: 'Começar missão' }).click()
  138 |   await completeLiteracyMission(page, 'l02')
  139 |   await page.reload()
  140 |   await expect(page.getByRole('heading', { name: 'O que a IA faz bem e onde costuma falhar' })).toBeVisible()
> 141 |   await page.getByRole('button', { name: 'Começar missão' }).click()
      |                                                              ^ Error: locator.click: Test timeout of 30000ms exceeded.
  142 |   await completeLiteracyMission(page, 'l03')
  143 |   await page.getByRole('button', { name: 'Começar missão' }).click()
  144 |   await completeLiteracyMission(page, 'l01')
  145 | 
  146 |   await page.goto('/mission/dev/game-02-warehouse')
  147 |   await expect(page.getByRole('heading', { name: 'WAREHOUSE: Key-Value Store (in-memory)' })).toBeVisible()
  148 |   await completeWarehouse(await gameFrame(page, 5202))
  149 |   await returnFromGame(page)
  150 | 
  151 |   await page.reload()
  152 |   await page.goto('/mission/dev/game-03-wormhole')
  153 |   await expect(page.getByRole('heading', { name: 'WORMHOLE: URL Shortener' })).toBeVisible()
  154 |   await completeWormhole(await gameFrame(page, 5203))
  155 |   await returnFromGame(page)
  156 | 
  157 |   await page.goto('/mission/dev/game-05-relay-station')
  158 |   await expect(page.getByRole('heading', { name: 'RELAY STATION: WebSocket Chat Server' })).toBeVisible()
  159 |   await completeRelay(await gameFrame(page, 5205))
  160 |   await returnFromGame(page)
  161 | 
  162 |   await page.reload()
  163 |   const progress = await readOsProgress(page)
  164 |   for (const key of [
  165 |     'ai-pratica:l01',
  166 |     'ai-pratica:l02',
  167 |     'ai-pratica:l03',
  168 |     'dev:game-02-warehouse',
  169 |     'dev:game-03-wormhole',
  170 |     'dev:game-05-relay-station',
  171 |   ]) {
  172 |     expect(progress.missionStatusByKey[key]).toBe('completed')
  173 |   }
  174 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  175 | })
  176 | 
```