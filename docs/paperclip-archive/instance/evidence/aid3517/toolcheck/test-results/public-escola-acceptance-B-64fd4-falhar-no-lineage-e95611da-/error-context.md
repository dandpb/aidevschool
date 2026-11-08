# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: public-escola-acceptance.spec.ts >> B9 foco na jornada via mapa em texto — DEFECTO CONHECIDO (esperado falhar no lineage e95611da)
- Location: public-escola-acceptance.spec.ts:188:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "jornada-dev"
Received: ""
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Pular para a etapa atual" [ref=e2] [cursor=pointer]:
    - /url: "#etapa-atual"
  - generic [ref=e3]:
    - banner [ref=e4]:
      - link "AiDevSchool, início" [ref=e5] [cursor=pointer]:
        - /url: /
        - generic [ref=e11]:
          - text: AiDev
          - generic [ref=e12]: ESCOLA DE IA
      - button "Como funciona" [ref=e14] [cursor=pointer]
    - region [ref=e15]:
      - generic [ref=e16]:
        - generic [ref=e17]: APRENDA FAZENDO. AVANCE VERIFICANDO.
        - heading [level=1] [ref=e18]:
          - text: Uma escola. Duas
          - emphasis [ref=e19]: jornadas.
        - paragraph [ref=e20]: Fundamentos compartilhados para todo mundo — depois, você segue para IA no cotidiano ou para IA para desenvolvimento. Lições curtas no app de lições; jogos ficam como prática opcional.
      - generic "Fundamentos compartilhados" [ref=e21]:
        - generic [ref=e22]:
          - text: FUNDAMENTOS COMPARTILHADOS
          - strong [ref=e23]: Trilha adaptativa
          - text: AVALIAÇÃO INICIAL · O PROGRESSO FICA NO APP DE LIÇÕES
    - generic [ref=e24]:
      - region "Mapa da escola" [ref=e25]:
        - generic:
          - generic: MAPA DA ESCOLA
          - generic: 2 JORNADAS · FUNDAMENTOS COMPARTILHADOS
        - generic [ref=e26]:
          - 'img "Mapa desenhado: a ilha Fundamentos à esquerda; setas seguem para a ilha Dourada, IA no cotidiano, acima à direita, e para a ilha Menta, IA para Dev, abaixo à direita. A versão em texto do mapa está disponível no botão abaixo do mapa." [ref=e27]'
          - group [ref=e28]:
            - generic "≡ Versão em texto do mapa" [ref=e29] [cursor=pointer]
            - list [ref=e30]:
              - list [ref=e31]:
                - listitem [ref=e32]:
                  - link "Ilha Fundamentos (menta) — entender IA, uso seguro, prompt e contexto, verificação. A entrada fica na raiz deste site." [ref=e33] [cursor=pointer]:
                    - /url: "#etapa-atual"
                - listitem [ref=e34]:
                  - link "Ilha IA no cotidiano (ouro) — para quem não programa." [ref=e35] [cursor=pointer]:
                    - /url: "#jornada-cotidiano"
                - listitem [ref=e36]:
                  - link "Ilha IA para Dev (menta-escura) — para quem constrói software (prévia)." [ref=e37] [cursor=pointer]:
                    - /url: "#jornada-dev"
        - generic [ref=e38]:
          - generic [ref=e39]: Fundamentos Jornada cotidiano Jornada dev (prévia)
          - button "Ⅱ Pausar cenário" [ref=e43] [cursor=pointer]
      - complementary "Etapa atual" [ref=e44]:
        - generic [ref=e45]:
          - generic [ref=e46]: COMECE AQUI · FUNDAMENTOS
          - generic [ref=e47]: TRILHA ADAPTATIVA
        - generic [ref=e48]: 🧭
        - heading "Fundamentos de IA" [level=2] [ref=e49]
        - paragraph [ref=e50]: "Entender IA, uso seguro, prompt e contexto e verificação — lições curtas no app de lições. Você entra na jornada: uma avaliação curta no início define o ponto de partida, o app conduz a trilha e a ordem se adapta a você."
        - generic [ref=e51]:
          - generic [ref=e52]: Avaliação inicial · ordem adaptativa
          - generic [ref=e53]: Tentativa com feedback
          - generic [ref=e54]: Sem código
        - list [ref=e55]:
          - listitem [ref=e56]:
            - generic [ref=e57]: "1"
            - text: Entrar no app de lições
          - listitem [ref=e58]:
            - generic [ref=e59]: "2"
            - text: Responder a avaliação inicial curta
          - listitem [ref=e60]:
            - generic [ref=e61]: "3"
            - text: Seguir a trilha — uma lição por vez
          - listitem [ref=e62]:
            - generic [ref=e63]: "4"
            - text: Seu progresso fica no app de lições
        - link "Começar pelos fundamentos" [ref=e64] [cursor=pointer]:
          - /url: /
          - text: Começar pelos fundamentos
          - generic [ref=e65]: →
        - paragraph [ref=e66]: Jogos são prática opcional — nenhum pré-requisito depende deles.
    - navigation "Os quatro fundamentos" [ref=e67]:
      - generic [ref=e68]:
        - generic [ref=e69]: F1
        - generic [ref=e70]:
          - strong [ref=e71]: Entender IA
          - generic [ref=e72]: FUNDAMENTO 1
      - generic [ref=e73]: →
      - generic [ref=e74]:
        - generic [ref=e75]: F2
        - generic [ref=e76]:
          - strong [ref=e77]: Uso seguro
          - generic [ref=e78]: FUNDAMENTO 2
      - generic [ref=e79]: →
      - generic [ref=e80]:
        - generic [ref=e81]: F3
        - generic [ref=e82]:
          - strong [ref=e83]: Prompt e contexto
          - generic [ref=e84]: FUNDAMENTO 3
      - generic [ref=e85]: →
      - generic [ref=e86]:
        - generic [ref=e87]: F4
        - generic [ref=e88]:
          - strong [ref=e89]: Verificação
          - generic [ref=e90]: FUNDAMENTO 4
    - paragraph [ref=e91]: No app de lições você responde uma avaliação curta no início; a partir dela o app conduz a trilha — a ordem se adapta a você.
    - region "Escolha de jornada" [ref=e92]:
      - article [ref=e93]:
        - generic [ref=e94]: JORNADA 1 · PARA QUEM NÃO PROGRAMA
        - heading "IA no cotidiano" [level=3] [ref=e95]
        - paragraph [ref=e96]: "Use IA com segurança no dia a dia: e-mails, pesquisa, decisões. Parte dos mesmos fundamentos compartilhados."
        - link "Começar pelos fundamentos" [ref=e97] [cursor=pointer]:
          - /url: /
          - text: Começar pelos fundamentos
          - generic [ref=e98]: →
      - article [ref=e99]:
        - generic [ref=e100]: JORNADA 2 · PARA QUEM DESENVOLVE · PRÉVIA
        - heading "IA para Dev" [level=3] [ref=e101]
        - paragraph [ref=e102]: "Construa software robusto com IA: intenção, plano, construção, teste e review. Comece pelos mesmos fundamentos; a ponte Dev é uma prévia planejada — o destino, não um percurso pronto no app."
        - group [ref=e103]:
          - generic "Depois dos fundamentos — ponte Dev (prévia planejada)" [ref=e104] [cursor=pointer]
        - link "Começar pelos fundamentos" [ref=e105] [cursor=pointer]:
          - /url: /
          - text: Começar pelos fundamentos
          - generic [ref=e106]: →
    - region "Prática opcional" [ref=e107]:
      - generic [ref=e108]: PRÁTICA OPCIONAL · JOGOS
      - group [ref=e109]:
        - generic "Ver jogos e desafios" [ref=e110] [cursor=pointer]
    - region [ref=e111]:
      - heading "Já conhece a escola?" [level=2] [ref=e112]
      - paragraph [ref=e113]: Cada experiência mantém seu próprio progresso, no seu dispositivo — a entrada da escola não sincroniza entre experiências e não sabe onde você parou.
      - generic [ref=e114]:
        - article [ref=e115]:
          - heading "App de lições — fundamentos" [level=3] [ref=e116]
          - paragraph [ref=e117]: "Trilha adaptativa com avaliação inicial: entender IA, uso seguro, prompt e contexto e verificação. 23 missões públicas em português. O progresso fica no seu dispositivo."
          - link "Entrar no app de lições" [ref=e118] [cursor=pointer]:
            - /url: /
        - article [ref=e119]:
          - heading "CodexDojo OS — laboratórios opcionais" [level=3] [ref=e120]
          - paragraph [ref=e121]: "Prática secundária, para quem já programa: missões e ferramentas em um ambiente de aprendizagem. Progresso separado, também no seu dispositivo."
          - link "Abrir laboratórios opcionais" [ref=e122] [cursor=pointer]:
            - /url: https://aidevschool-codexdojo-os.netlify.app/
    - contentinfo [ref=e123]:
      - generic [ref=e124]: AIDEVSCHOOL · UMA ESCOLA, VÁRIOS MOTORES · A ENTRADA APENAS RECOMENDA — CADA EXPERIÊNCIA MANTÉM SEU PRÓPRIO PROGRESSO
      - generic [ref=e125]: "IDENTIDADE VISUAL: SDLCQUEST v1.3"
```

# Test source

```ts
  100 |     (r) => / \/api\/| POST /.test(r) || (r.includes(" fetch ") && !r.includes(BASE)),
  101 |   );
  102 |   expect(crossOrApi, `requisições proibidas: ${crossOrApi.join("; ")}`).toEqual([]);
  103 |   const storage = await page.evaluate(() => ({
  104 |     local: window.localStorage.length,
  105 |     cookie: document.cookie,
  106 |   }));
  107 |   expect(storage.local).toBe(0); // entrada não grava nada no dispositivo
  108 | 
  109 |   // B8 — overflow horizontal: 360x740 e 1280x800.
  110 |   for (const [w, h] of [
  111 |     [1280, 800],
  112 |     [360, 740],
  113 |   ]) {
  114 |     await page.setViewportSize({ width: w, height: h });
  115 |     const layout = await page.locator("body").evaluate((el) => ({
  116 |       sw: el.scrollWidth,
  117 |       cw: el.clientWidth,
  118 |     }));
  119 |     expect(layout.sw, `overflow ${w}x${h}`).toBeLessThanOrEqual(layout.cw);
  120 |   }
  121 |   await page.setViewportSize({ width: 1280, height: 800 });
  122 |   await page.screenshot({ path: `${EVID}/01-escola-publica-desktop.png`, fullPage: true });
  123 |   await page.setViewportSize({ width: 360, height: 740 });
  124 |   await page.screenshot({ path: `${EVID}/02-escola-publica-mobile.png`, fullPage: true });
  125 | });
  126 | 
  127 | test("B2 jornadas dos dois públicos na entrada + labs opcionais com noopener", async ({ page }) => {
  128 |   await page.goto(`${BASE}/escola/`);
  129 |   // Jornada 1 — IA no cotidiano (não programa): cartão + CTA same-origin.
  130 |   const cotidiano = page.locator("#jornada-cotidiano");
  131 |   await expect(cotidiano).toBeVisible();
  132 |   await expect(cotidiano.getByRole("link")).toHaveAttribute("href", "/");
  133 |   // Jornada 2 — IA para Dev (prévia): ponte listada como destino, não percurso.
  134 |   const dev = page.locator("#jornada-dev");
  135 |   await expect(dev).toBeVisible();
  136 |   expect((await dev.innerText()).toLowerCase()).toContain("prévia");
  137 |   // A ponte está num <details> recolhido: expandir antes de ler as lições.
  138 |   await dev.locator("details.bridge summary").click();
  139 |   const bridgeText = (await dev.locator("details.bridge").innerText()).toLowerCase();
  140 |   for (const lesson of ["l15", "l16", "l27", "l29"]) expect(bridgeText).toContain(lesson);
  141 |   await expect(dev.getByRole("link")).toHaveAttribute("href", "/");
  142 |   // Labs opcionais são cross-origin com rel=noopener (seção retomar).
  143 |   const labs = page.locator('#retomar a[href*="aidevschool-codexdojo-os.netlify.app"]');
  144 |   await expect(labs).toHaveCount(1);
  145 |   await expect(labs).toHaveAttribute("rel", "noopener");
  146 | });
  147 | 
  148 | test("B4 navegação por teclado: skip link, dialog nativo, mapa em texto, CTA alcançável, sem quebra", async ({
  149 |   page,
  150 | }) => {
  151 |   await page.goto(`${BASE}/escola/`);
  152 |   await expect(page.getByRole("heading", { name: "Fundamentos de IA" })).toBeVisible();
  153 | 
  154 |   // Skip link é o primeiro parado e leva à etapa atual.
  155 |   await page.keyboard.press("Tab");
  156 |   const first = await page.evaluate(() => document.activeElement?.className ?? "");
  157 |   expect(first).toContain("skip");
  158 |   await page.keyboard.press("Enter");
  159 |   expect(await page.evaluate(() => document.activeElement?.id)).toBe("etapa-atual");
  160 | 
  161 |   // Dialog "Como funciona": abre por teclado, prende foco, Escape fecha (nativo).
  162 |   await page.locator("#help-btn").focus();
  163 |   await page.keyboard.press("Enter");
  164 |   await expect(page.locator("#help[open]")).toBeVisible();
  165 |   expect(await page.evaluate(() => document.activeElement?.closest("#help") !== null)).toBe(true);
  166 |   await page.keyboard.press("Escape");
  167 |   await expect(page.locator("#help[open]")).toHaveCount(0);
  168 | 
  169 |   // Mapa em texto: details por teclado (expandir a alternativa textual).
  170 |   await page.locator("#map-alt summary").focus();
  171 |   await page.keyboard.press("Enter");
  172 |   await expect(page.locator("#map-alt[open]")).toBeVisible();
  173 |   await expect(page.locator('.map-alt a[href="#jornada-dev"]')).toBeVisible();
  174 | 
  175 |   // Pausar cenário alternável por teclado (aria-pressed).
  176 |   const motion = page.locator("#motion-btn");
  177 |   const before = await motion.getAttribute("aria-pressed");
  178 |   await motion.focus();
  179 |   await page.keyboard.press("Enter");
  180 |   await expect(motion).not.toHaveAttribute("aria-pressed", before ?? "");
  181 | 
  182 |   // CTA principal alcançável só com Tab (contado, limitado).
  183 |   const tabs = await tabUntil(page, "start-fundamentals");
  184 |   console.log(`[B4] #start-fundamentals alcançado com ${tabs} Tab(s)`);
  185 |   await expect(page.locator("#start-fundamentals")).toBeFocused();
  186 | });
  187 | 
  188 | test("B9 foco na jornada via mapa em texto — DEFECTO CONHECIDO (esperado falhar no lineage e95611da)", async ({
  189 |   page,
  190 | }) => {
  191 |   // escola.js:106-118 set tabindex=-1 → focus() → removeAttribute("tabindex"):
  192 |   // o Chromium dropa o foco para BODY ao remover o atributo. Reproduzido em
  193 |   // d9dbdd5c (mouse e teclado). Marcado como falha esperada: se o run público
  194 |   // passar aqui, o defeito foi corrigido — atualizar a issue filha.
  195 |   test.fail(true, "AID-3518: foco perdido ao remover tabindex (escola.js:106-118) no lineage e95611da");
  196 |   await page.goto(`${BASE}/escola/`);
  197 |   await page.locator("#map-alt summary").click();
  198 |   await page.locator('.map-alt a[href="#jornada-dev"]').focus();
  199 |   await page.keyboard.press("Enter");
> 200 |   expect(await page.evaluate(() => document.activeElement?.id)).toBe("jornada-dev");
      |                                                                 ^ Error: expect(received).toBe(expected) // Object.is equality
  201 | });
  202 | 
  203 | test("B5+B6+B7 jornada pública completa, progresso/retomada e respostas offline (retornante SW)", async ({
  204 |   page,
  205 |   context,
  206 | }) => {
  207 |   test.setTimeout(240_000);
  208 |   // Jornada 1 a partir da entrada pública: CTA same-origin → onboarding → l02.
  209 |   await page.goto(`${BASE}/escola/`);
  210 |   await page.locator("#start-fundamentals").click();
  211 |   await expect(page.getByTestId("assistant-welcome")).toBeVisible();
  212 |   expect(new URL(page.url()).pathname).toBe("/");
  213 |   // Toque da jornada 2 dentro do app: teaser Dev → labs cross-origin.
  214 |   await expect(page.getByTestId("dev-track-teaser")).toContainText("Abrir no OS");
  215 | 
  216 |   await page.getByTestId("onboarding-next").click();
  217 |   await page.getByTestId("onboarding-option-save_time").check();
  218 |   await page.getByTestId("onboarding-next").click();
  219 |   await page.getByTestId("onboarding-option-work").check();
  220 |   await page.getByTestId("onboarding-next").click();
  221 |   await page.getByTestId("onboarding-option-medium").check();
  222 |   await page.getByTestId("onboarding-next").click();
  223 |   await page.getByTestId("onboarding-option-scheduling").check();
  224 |   await page.getByTestId("onboarding-next").click();
  225 |   await expect(page.getByTestId("map-screen")).toBeVisible();
  226 |   await page.getByTestId(`map-start-${L02}`).click();
  227 |   await expect(page.getByRole("heading", { name: "IA não é uma fonte de verdade" })).toBeVisible();
  228 |   await page.getByTestId("start-lesson").click();
  229 |   await expect(page.getByTestId("submit-attempt")).toBeVisible();
  230 |   await page.screenshot({ path: `${EVID}/03-atividade-publica.png` });
  231 | 
  232 |   // Atividade 1 — output_comparison (l02 v4 @ e95611da): out-b + critérios exigidos.
  233 |   await page.getByTestId("output-out-b").check();
  234 |   await page.getByTestId("criterion-c-fontes").check();
  235 |   await page.getByTestId("criterion-c-limites").check();
  236 |   await page.getByTestId("submit-attempt").click();
  237 |   await expect(page.getByTestId("feedback-panel")).toContainText(
  238 |     "Resposta útil é a que diz de onde vem a informação",
  239 |   );
  240 | 
  241 |   // Atividade 2 — choice: verificar na fonte.
  242 |   await page.getByTestId("next-activity").click();
  243 |   await page.getByTestId("option-opt-verifica-na-fonte").check();
  244 |   await page.getByTestId("submit-attempt").click();
  245 |   await expect(page.getByTestId("feedback-panel")).toContainText("Verificar antes de usar");
  246 | 
  247 |   // Atividade 3 — sort: ordenar por DOM real até a ordem esperada (robusto a display).
  248 |   await page.getByTestId("next-activity").click();
  249 |   const expected = [
  250 |     "fluxo-resposta",
  251 |     "fluxo-afirmacoes",
  252 |     "fluxo-fonte",
  253 |     "fluxo-conferencia",
  254 |     "fluxo-uso",
  255 |   ];
  256 |   for (let guard = 0; guard < 40; guard++) {
  257 |     const order = await page.evaluate(() =>
  258 |       Array.from(document.querySelectorAll('[data-testid^="sort-up-"]')).map((el) =>
  259 |         el.getAttribute("data-testid")?.replace("sort-up-", ""),
  260 |       ),
  261 |     );
  262 |     if (expected.every((id, i) => order[i] === id)) break;
  263 |     const targetId = expected.find((id, i) => order[i] !== id && order.includes(id));
  264 |     if (targetId) await page.getByTestId(`sort-up-${targetId}`).click();
  265 |   }
  266 |   await page.getByTestId("submit-attempt").click();
  267 |   await expect(page.getByTestId("feedback-panel")).toContainText("fluxo");
  268 |   await page.getByTestId("finish-lesson").click();
  269 |   await expect(page.getByTestId("result-screen")).toContainText("Lição concluída");
  270 |   await page.screenshot({ path: `${EVID}/04-resultado-publica.png` });
  271 | 
  272 |   // Progresso no dispositivo (IndexedDB) + retomada após reload mesma origem.
  273 |   const before = await readProgress(page);
  274 |   expect(before?.lessonStatus).toMatchObject({ [L02]: "completed" });
  275 |   expect(before?.currentLessonId).toBeTruthy();
  276 |   await page.reload();
  277 |   await expect(page.getByTestId("home-screen")).toBeVisible();
  278 |   const after = await readProgress(page);
  279 |   expect(after?.lessonStatus).toMatchObject({ [L02]: "completed" });
  280 |   expect(after?.currentLessonId).toBe(before?.currentLessonId);
  281 |   await page.screenshot({ path: `${EVID}/05-retomada-publica.png` });
  282 | 
  283 |   // Retornante SW-controlado: CACHE v5; visita SW-controlada a /escola/ (popula
  284 |   // o cache de navegação por pathname); offline /escola/ com query renderiza;
  285 |   // raiz offline mantém shell com progresso vivo (regressão F1/fc1d79fb).
  286 |   await page.goto(`${BASE}/`);
  287 |   await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 60_000 });
  288 |   const cacheNames = await page.evaluate(() => caches.keys());
  289 |   expect(cacheNames.join(" ")).toContain("v5");
  290 |   await page.goto(`${BASE}/escola/`);
  291 |   await expect(page.getByRole("heading", { name: "Fundamentos de IA" })).toBeVisible();
  292 |   await context.setOffline(true);
  293 |   await page.goto(`${BASE}/escola/?utm_source=test`);
  294 |   await expect(page.getByRole("heading", { name: "Fundamentos de IA" })).toBeVisible();
  295 |   await page.screenshot({ path: `${EVID}/06-escola-offline-publica.png` });
  296 |   await page.goto(`${BASE}/`);
  297 |   await expect(page.getByTestId("home-screen")).toBeVisible();
  298 |   const offline = await readProgress(page);
  299 |   expect(offline?.lessonStatus).toMatchObject({ [L02]: "completed" });
  300 |   await page.screenshot({ path: `${EVID}/07-raiz-offline-publica.png` });
```