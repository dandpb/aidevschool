import { expect, test } from "@playwright/test";

/**
 * AID-3530 — regressão da reabertura do jogo inline (achado F7 da revisão
 * AID-3512, confirmação também no base 1975e2c7). Contrato do toggle
 * (src/main.ts "Jogar inline"):
 * 1. abrir carrega `/games/<num>/index.html` no iframe (lazy, só ao abrir);
 * 2. fechar descarrega (`src="about:blank"`) e oculta o wrap —unload intencional;
 * 3. REABRIR recarrega o jogo: `about:blank` é sentinela pós-fechamento, não
 *    estado "jogo carregado" (bug: guarda `!getAttribute("src")` nunca
 *    recarregava porque "about:blank" é truthy);
 * 4. sequência completa abre→fecha→reabre×2 com conteúdo NOVO a cada abertura
 *    (nonce por fulfillment prova recarga real, não frame encostado);
 * 5. aria-expanded/texto do botão alternam e o foco permanece no botão
 *    (última reabertura por teclado Enter).
 *
 * Hermético para CI (CI não inclui o bundle `public/games/`, gitignored):
 * `page.route` serve um documento determinístico com nonce por carregamento.
 * A corrida com o jogo real (voxelDojo game-02 compilado) é evidência da
 * issue AID-3530, fora desta spec.
 */

test("inline game reopen: recarrega /games/<num>/index.html a cada reabertura (2x) com foco/fechar preservados", async ({
  page,
}) => {
  let loads = 0;
  await page.route("**/games/*/index.html", (route) => {
    loads += 1;
    return route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><body><main id="fixture-load" data-load="${loads}">game fixture load ${loads}</main></body></html>`,
    });
  });

  await page.goto("/");

  const playBtn = page.locator("#play-inline-btn");
  await expect(playBtn, "missão ativa deve expor o botão de jogo inline").toBeVisible();
  const gameNum = ((await playBtn.getAttribute("data-game")) ?? "").trim();
  expect(gameNum, "data-game do botão").not.toBe("");
  const gameSrc = `/games/${gameNum}/index.html`;

  const playWrap = page.locator("#play-inline-wrap");
  const playFrame = page.locator("#play-inline-frame");
  const frameBody = page.frameLocator("#play-inline-frame").locator("#fixture-load");

  // Abertura 1 (clique): destino + conteúdo fresco #1 + estados de UI.
  await playBtn.click();
  await expect(playWrap).toBeVisible();
  await expect(playFrame).toHaveAttribute("src", gameSrc);
  await expect(frameBody).toHaveText("game fixture load 1");
  await expect(playBtn).toHaveAttribute("aria-expanded", "true");
  await expect(playBtn).toHaveText("▽ Recolher jogo");

  // Fechamento 1: unload (about:blank) + ocultação + volta do rótulo/aria.
  await playBtn.click();
  await expect(playWrap).toBeHidden();
  await expect(playFrame).toHaveAttribute("src", "about:blank");
  await expect(playBtn).toHaveAttribute("aria-expanded", "false");
  await expect(playBtn).toHaveText("▶ Jogar aqui (inline)");
  await expect(playBtn).toBeFocused();

  // Reabertura 1 (clique): bug alvo — base mantém about:blank e frame vazio.
  await playBtn.click();
  await expect(playWrap).toBeVisible();
  await expect(playFrame).toHaveAttribute("src", gameSrc);
  await expect(frameBody).toHaveText("game fixture load 2");
  await expect(playBtn).toHaveAttribute("aria-expanded", "true");

  // Fechamento 2.
  await playBtn.click();
  await expect(playWrap).toBeHidden();
  await expect(playFrame).toHaveAttribute("src", "about:blank");
  await expect(playBtn).toHaveAttribute("aria-expanded", "false");

  // Reabertura 2 por teclado (Enter): operável sem mouse, foco preservado,
  // e o nonce 3 prova a terceira carga real do documento.
  await playBtn.press("Enter");
  await expect(playWrap).toBeVisible();
  await expect(playFrame).toHaveAttribute("src", gameSrc);
  await expect(frameBody).toHaveText("game fixture load 3");
  await expect(playBtn).toHaveAttribute("aria-expanded", "true");
  await expect(playBtn).toBeFocused();
  expect(loads, "cada abertura deve disparar exatamente uma carga do jogo").toBe(3);
});
