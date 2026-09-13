import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { type Page, type TestInfo, expect, test } from "@playwright/test";
import { activity, mapInitial } from "./support";

/**
 * AID-1739 (LAAE T1) — scanner axe-core nas telas core do literacyDojo:
 * onboarding, mapa, lição+feedback, resultado e progresso, dentro da suíte
 * e2e existente (projeto `app`, webServer vite na 4173).
 *
 * O smoke percorre a jornada real do aprendiz (onboarding → mapa → Mapa
 * Inicial acertando tudo → resultado → progresso) e roda
 * `AxeBuilder.analyze()` em cada parada, com o recibo completo anexado ao
 * teste (`axe-<tela>-violations`) e o inventário resumido no log da
 * execução — o número de violações por tela é fato auditável do run.
 *
 * Gate ratchet (mesma semântica do gate de complexidade Python, AID-1636):
 * a baseline congelada em `a11y-axe-baseline.json` waive as violações
 * pré-existentes (chave `<tela>::<rule>`); violação NOVA falha o CI — é
 * defeito a tratar, nunca a suprimir; entrada da baseline que não aparece
 * no run está stale e também falha — corrija e encolha a baseline. O fix
 * das entradas congeladas vai em ordem própria (T-onde-caber, AID-1739).
 *
 * Escopo de regras: WCAG 2.0/2.1 A+AA (tags estáveis do axe). Regras
 * experimentais/best-practice ficam fora do gate para não dependerem de
 * churn do axe; nenhum rule/tag é desabilitado dentro do escopo.
 */

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const baseline = JSON.parse(
  readFileSync(new URL("./a11y-axe-baseline.json", import.meta.url), "utf-8"),
) as {
  entries: Record<string, { impact: string; help: string; wcag: string[] }>;
};

type ViolationSummary = {
  screen: string;
  key: string;
  rule: string;
  impact: string;
  help: string;
  nodes: number;
  wcag: string[];
};

async function scanScreen(page: Page, screen: string, testInfo: TestInfo) {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const summary: ViolationSummary[] = results.violations.map((violation) => ({
    screen,
    key: `${screen}::${violation.id}`,
    rule: violation.id,
    impact: violation.impact ?? "unknown",
    help: violation.help,
    nodes: violation.nodes.length,
    wcag: violation.tags.filter((tag) => tag.startsWith("wcag")),
  }));
  await testInfo.attach(`axe-${screen}-violations`, {
    body: JSON.stringify(
      {
        screen,
        tags: AXE_TAGS,
        violationCount: results.violations.length,
        violations: results.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          help: violation.help,
          helpUrl: violation.helpUrl,
          nodes: violation.nodes.map((node) => ({ target: node.target, html: node.html })),
        })),
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  const detail =
    summary.length > 0
      ? ` — ${summary.map((item) => `${item.rule}(${item.impact})×${item.nodes}`).join(", ")}`
      : "";
  console.log(`[axe] ${screen}: ${results.violations.length} violação(ões)${detail}`);
  return summary;
}

test("AID-1739: scanner axe-core percorre as telas core (onboarding, mapa, lição+feedback, resultado, progresso)", async ({
  page,
}, testInfo) => {
  // --- Onboarding (etapa 1, estado inicial do aprendiz) ---
  await page.goto("/");
  await expect(page.getByTestId("onboarding-screen")).toBeVisible();
  const findings = await scanScreen(page, "onboarding", testInfo);

  // Completa o onboarding até o mapa (mesmo percurso do support.completeOnboarding,
  // aberto aqui para escanear o mapa antes de entrar na lição).
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-save_time").check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-work").check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-medium").check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-scheduling").check();
  await page.getByTestId("onboarding-next").click();

  // --- Mapa da trilha ---
  await expect(page.getByTestId("map-screen")).toBeVisible();
  findings.push(...(await scanScreen(page, "map", testInfo)));

  // --- Lição (Mapa Inicial): primeira atividade respondida = feedback visível ---
  await page.getByTestId(`map-start-${mapInitial.id}`).click();
  await expect(page.getByRole("heading", { name: mapInitial.title })).toBeVisible();
  await page.getByTestId("start-lesson").click();

  if (activity.type !== "output_comparison")
    throw new Error("Mapa Inicial sem comparação de saídas");
  await page.getByTestId(`output-${activity.evaluation.betterOutputId}`).check();
  for (const criterionId of activity.evaluation.requiredCriterionIds) {
    await page.getByTestId(`criterion-${criterionId}`).check();
  }
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toBeVisible();
  findings.push(...(await scanScreen(page, "lesson-feedback", testInfo)));

  // --- Resultado (conclui as atividades restantes + finish-lesson) ---
  const { answerRemainingRight } = await import("./support");
  await answerRemainingRight(page, mapInitial.activities, 1);
  await page.getByTestId("finish-lesson").click();
  await expect(page.getByTestId("result-screen")).toBeVisible();
  findings.push(...(await scanScreen(page, "result", testInfo)));

  // --- Progresso (voltando ao mapa → home → progresso) ---
  await page.getByTestId("go-map").click();
  await page.getByTestId("map-back").click();
  await page.getByTestId("open-progress").click();
  await expect(page.getByTestId("progress-screen")).toBeVisible();
  findings.push(...(await scanScreen(page, "progress", testInfo)));

  // Recibo consolidado do run (evidence para o recibo da issue): 1 attach
  // final com o inventário completo por tela.
  await testInfo.attach("axe-smoke-inventory", {
    body: JSON.stringify(
      {
        screens: ["onboarding", "map", "lesson-feedback", "result", "progress"],
        tags: AXE_TAGS,
        totalRuleViolations: findings.length,
        totalNodes: findings.reduce((sum, item) => sum + item.nodes, 0),
        findings,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });

  // --- Ratchet: nova violação = defeito; entrada stale = encolher baseline ---
  const newViolations = findings.filter((item) => !(item.key in baseline.entries));
  const seenKeys = new Set(findings.map((item) => item.key));
  const staleEntries = Object.keys(baseline.entries).filter((key) => !seenKeys.has(key));

  expect(
    newViolations,
    `NOVAS violações axe (WCAG A/AA) fora da baseline — tratar como defeito, não suprimir: ${JSON.stringify(newViolations)}`,
  ).toEqual([]);
  expect(
    staleEntries,
    "Entradas stale na a11y-axe-baseline.json (não apareceram no run) — corrija e encolha a baseline",
  ).toEqual([]);
});
