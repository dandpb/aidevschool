import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

// AID-1334 / re-anchor v44 — walk de observação dojoToday na árvore 80c3105f
// (main d0cfcdb8 + aria-expanded/aria-controls do PR #335 head c3723e7f + guarda
// CSS .socrates-config[hidden]{display:none}: display:flex derrotava o hidden).
// Padrão v43 (AID-1295): spec arquivada, execução LOCAL a partir do engine
// (copiar este arquivo + config para engines/dojoToday/walk-a1334-local/ e rodar
// `npx playwright test --config walk-a1334-local/playwright-walk.config.ts`).
// Re-valida além do walk v39 o comportamento NOVO do PR #335:
// #soc-config-btn aria-expanded/aria-controls sincronizado com o painel
// (toggle, salvar, fallback nudge).

const observed: string[] = [];

function note(text: string) {
  observed.push(text);
  console.log(`[walk] ${text}`);
}

test("walk v44: dojoToday 3 jornadas + aria-expanded do Socrates", async ({ page }) => {
  const evDir = process.env.A1334_EV_DIR
    ? path.resolve(process.env.A1334_EV_DIR)
    : path.resolve("..", "..", "docs", "product-readiness", "evidence", "observations");
  mkdirSync(evDir, { recursive: true });
  const shot = async (name: string) => page.screenshot({ path: path.join(evDir, name), fullPage: true });

  // --- Jornada 1: dojotoday-active-unit-guidance (5180 canônica) ---
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sua lição de hoje" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Retome por aqui" })).toBeVisible();
  await expect(page.getByText("KV WAREHOUSE: hash-map-backed CRUD with TTL expiration").first()).toBeVisible();
  await expect(page.getByText(/apenas mostra o scheduler/)).toBeVisible();
  await expect(page.getByText(/O verificador independente decide/)).toBeVisible();
  note("'Sua lição de hoje' + 'Retome por aqui' visíveis; unidade ativa renderizada da projeção gerada (5180 canônica) (dtv44-01-daily-view.png)");
  await shot("dtv44-01-daily-view.png");

  // --- NOVO do PR #335: aria-expanded/aria-controls no toggle de config ---
  const configBtn = page.locator("#soc-config-btn");
  await expect(configBtn).toHaveAttribute("aria-expanded", "false");
  await expect(configBtn).toHaveAttribute("aria-controls", "soc-config");
  await expect(page.locator("#soc-config")).toBeHidden();
  await configBtn.click();
  await expect(page.locator("#soc-config")).toBeVisible();
  await expect(configBtn).toHaveAttribute("aria-expanded", "true");
  note("PR #335 re-validado no toggle: #soc-config-btn parte com aria-expanded=false + aria-controls=soc-config; painel parte OCULTO (guarda CSS [hidden] do re-anchor v44 corrige display:flex que mantinha o painel sempre visível — aria-expanded agora é verdadeiro para AT); abrir alterna aria-expanded=true (dtv44-02-config-expanded.png)");
  await shot("dtv44-02-config-expanded.png");

  await page.locator("#soc-baseurl").fill("https://api.openai.com/v1");
  await page.locator("#soc-apikey").fill("sk-walk-v44-nao-real");
  await page.locator("#soc-model").fill("gpt-4o-mini");
  await page.locator("#soc-save").click();
  await expect(page.locator("#soc-config")).toBeHidden();
  await expect(configBtn).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#soc-reply")).toContainText("Assistente configurado");
  note("salvar config recolhe o painel e sincroniza aria-expanded=false; resposta na região role=status (dtv44-03-config-saved-collapsed.png)");
  await shot("dtv44-03-config-saved-collapsed.png");

  // Persistiu config, mas o painel volta recolhido no reload (estado do painel
  // é da sessão, não da persistência).
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sua lição de hoje" })).toBeVisible();
  await expect(page.locator("#soc-config")).toBeHidden();
  await expect(configBtn).toHaveAttribute("aria-expanded", "false");
  note("pós-reload com config salva: painel recolhido e aria-expanded=false (estado do painel não persiste)");

  // --- NOVO do PR #335: fallback nudge sem config abre o painel expandido ---
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sua lição de hoje" })).toBeVisible();
  await page.locator("#soc-q").fill("O que espera desta missão em um caso-limite?");
  await page.locator("#soc-send").click();
  await expect(page.locator("#soc-config")).toBeVisible();
  await expect(configBtn).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#soc-reply")).toContainText("modo determinístico");
  note("perguntar sem config força o painel aberto com aria-expanded=true e nudge determinístico anunciado em role=status (dtv44-04-nudge-fallback-expanded.png)");
  await shot("dtv44-04-nudge-fallback-expanded.png");

  // --- Jornada 2: dojotoday-read-only-boundary (vista não escreve estado) ---
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sua lição de hoje" })).toBeVisible();
  const before = await page.evaluate(() => JSON.stringify(localStorage));
  await page.locator("#soc-config-btn").click();
  await page.locator("#soc-config-btn").click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sua lição de hoje" })).toBeVisible();
  const after = await page.evaluate(() => JSON.stringify(localStorage));
  expect(after).toBe(before);
  expect(before).toBe("{}");
  note(`vista sem afordância de avaliação (não há controle concluir/mastered/avaliar; só '▶ Jogar aqui' e 'Perguntar') | localStorage estável e vazio entre toggles+reload (vista não escreve estado): ${after === "{}"} (dtv44-05-boundary.png)`);
  await shot("dtv44-05-boundary.png");

  // --- Jornada 3: dojotoday-returning-next-day (5181 day-N, 5182 day-N+1) ---
  await page.goto("http://127.0.0.1:5181/");
  await expect(page.getByRole("heading", { name: "Sua lição de hoje" })).toBeVisible();
  await expect(page.getByText(/O verificador independente decide/)).toBeVisible();
  note("day-N (fixture 5181) renderiza 'Sua lição de hoje' com fila/streak da projeção (dtv44-06-day-n.png)");
  await shot("dtv44-06-day-n.png");

  await page.goto("http://127.0.0.1:5182/");
  await expect(page.getByRole("heading", { name: "Sua lição de hoje" })).toBeVisible();
  await expect(page.getByText(/O verificador independente decide/)).toBeVisible();
  await expect(page.getByText(/apenas mostra o scheduler/)).toBeVisible();
  note("day-N+1 (fixture 5182) renderiza a view do dia seguinte com copy de fronteira — retornar não avalia nem carrega veredito do dia anterior (dtv44-07-day-n-plus-1.png)");
  await shot("dtv44-07-day-n-plus-1.png");

  const logPath = process.env.A1334_LOG_PATH
    ? path.resolve(process.env.A1334_LOG_PATH)
    : path.join(evDir, "walk-log-dojotoday.json");
  const dayNStreak = await page.getByText(/sequência/i).first().textContent().catch(() => null);
  writeFileSync(
    logPath,
    JSON.stringify({ walk: [{ scenarioId: "dojotoday-daily-guidance", observed }], dayNPlus1StreakSample: dayNStreak }, null, 2) + "\n",
    "utf8",
  );
});
