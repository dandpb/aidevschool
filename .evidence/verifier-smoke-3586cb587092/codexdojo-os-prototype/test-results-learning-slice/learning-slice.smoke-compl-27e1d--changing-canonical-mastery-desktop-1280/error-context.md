# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: learning-slice.smoke.spec.ts >> completes l02 through the mission-first host without changing canonical mastery
- Location: tests/learning-slice.smoke.spec.ts:3:1

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
  - paragraph: IA Prática · 4 min
  - heading "IA não é uma fonte de verdade" [level=1]
  - paragraph: Diante de uma resposta convincente sem evidência, reconhecer que ela precisa ser verificada antes de ser usada no trabalho.
  - text: Estado canônico
  - strong: mastered
  - text: 2 verificadas · sem alteração local Etapa
  - strong: Aplicar
  - text: Motor
  - strong: completed
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
      - strong: IA não é uma fonte de verdade
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
      - paragraph: Primeira missão · Primeira prática · IA Prática iniciada
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
  - paragraph: Compare as duas respostas, escolha a mais confiavel e marque os criterios de verificacao.
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
  1  | import { expect, test } from '@playwright/test'
  2  | 
  3  | test('completes l02 through the mission-first host without changing canonical mastery', async ({
  4  |   page,
  5  | }) => {
  6  |   await page.goto('/')
  7  | 
  8  |   await expect(
  9  |     page.getByRole('heading', { name: 'O que você quer conseguir fazer com IA?' }),
  10 |   ).toBeVisible()
  11 |   await page.getByRole('button', { name: 'Entrar na escola' }).click()
  12 | 
  13 |   await expect(page.getByRole('heading', { name: 'Aprenda uma coisa útil agora.' })).toBeVisible()
  14 |   const canonicalLabel = await page.getByText(/\d+ competências verificadas/).textContent()
  15 |   const canonicalMastery = canonicalLabel?.match(/\d+/)?.[0]
  16 |   expect(canonicalMastery).toBeTruthy()
  17 |   const startMission = page.getByRole('button', { name: 'Começar missão' })
  18 |   await startMission.scrollIntoViewIfNeeded()
  19 |   await expect(startMission).toBeVisible()
  20 |   await startMission.click()
  21 | 
  22 |   const mission = page.frameLocator('iframe[title="Missão IA não é uma fonte de verdade"]')
  23 |   await expect(
  24 |     mission.getByRole('heading', { name: 'IA não é uma fonte de verdade' }),
  25 |   ).toBeVisible()
  26 |   await mission.getByRole('button', { name: 'Começar missão', exact: true }).click()
  27 |   await mission.getByTestId('output-out-b').check()
  28 |   await mission.getByTestId('criterion-c-fontes').check()
  29 |   await mission.getByTestId('criterion-c-limites').check()
  30 |   await mission.getByTestId('submit-attempt').click()
  31 |   await expect(mission.getByText('Isso! Resposta útil', { exact: false })).toBeVisible()
  32 |   await mission.getByTestId('finish-lesson').click()
  33 | 
  34 |   await expect(mission.getByTestId('result-screen')).toBeVisible()
> 35 |   await expect(page.getByText('Verificação independente aprovada', { exact: true })).toBeVisible()
     |                                                                                      ^ Error: expect(locator).toBeVisible() failed
  36 |   await expect(
  37 |     page.getByText(
  38 |       /O verificador independente aprovou esta evidência\. O gate canônico continua separado\./,
  39 |     ),
  40 |   ).toBeVisible()
  41 |   await expect(
  42 |     page.getByText(`${canonicalMastery} verificadas · sem alteração local`),
  43 |   ).toBeVisible()
  44 |   await page.getByRole('button', { name: 'Voltar ao hub' }).click()
  45 | 
  46 |   await expect(page.getByText('Evidência preservada', { exact: true })).toBeVisible()
  47 |   await expect(page.getByText('Verificação independente', { exact: true })).toBeVisible()
  48 |   await expect(page.getByText('Veredito PASS', { exact: true })).toBeVisible()
  49 |   await expect(page.getByText('Não alterada por este fluxo', { exact: true })).toBeVisible()
  50 |   await page.reload()
  51 |   await expect(page.getByText('Evidência preservada', { exact: true })).toBeVisible()
  52 |   await expect(page.getByText('Veredito PASS', { exact: true })).toBeVisible()
  53 |   await expect(page.getByText(`${canonicalMastery} competências verificadas`)).toBeVisible()
  54 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
  55 |     true,
  56 |   )
  57 | })
  58 | 
  59 | test('shows independent FAIL separately from local and canonical progress', async ({ page }) => {
  60 |   await page.goto('/')
  61 |   await page.getByRole('button', { name: 'Entrar na escola' }).click()
  62 |   const canonicalLabel = await page.getByText(/\d+ competências verificadas/).textContent()
  63 |   const canonicalMastery = canonicalLabel?.match(/\d+/)?.[0]
  64 |   expect(canonicalMastery).toBeTruthy()
  65 |   await page.getByRole('button', { name: 'Começar missão' }).click()
  66 | 
  67 |   const mission = page.frameLocator('iframe[title="Missão IA não é uma fonte de verdade"]')
  68 |   await expect(
  69 |     mission.getByRole('heading', { name: 'IA não é uma fonte de verdade' }),
  70 |   ).toBeVisible()
  71 |   await mission.getByRole('button', { name: 'Começar missão', exact: true }).click()
  72 |   await mission.getByTestId('output-out-a').check()
  73 |   await mission.getByTestId('criterion-c-fontes').check()
  74 |   await mission.getByTestId('submit-attempt').click()
  75 | 
  76 |   await expect(page.getByText('Verificação pede nova tentativa', { exact: true })).toBeVisible()
  77 |   await expect(page.getByText('Veredito independente: FAIL', { exact: true })).toBeVisible()
  78 |   await expect(page.getByText('Gate canônico não executado', { exact: false })).toBeVisible()
  79 |   await expect(
  80 |     page.getByText(`${canonicalMastery} verificadas · sem alteração local`, { exact: true }),
  81 |   ).toBeVisible()
  82 | })
  83 | 
```