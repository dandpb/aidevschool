import { expect, test } from "@playwright/test";
import {
  completeOnboarding,
  readProgress,
  seedCorridorProgress,
  writeProgressDoc,
} from "./support";

test("mapa orienta a continuar um pedido iniciado", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await completeOnboarding(page);
  await page.getByRole("button", { name: "Sair da lição" }).click();
  const guide = page.getByTestId("map-guide");
  await expect(guide).toContainText("Em andamento");
  await expect(guide).not.toContainText("Comece pelo pedido marcado como Disponível");
  await expect(page.getByTestId("map-start-l02")).toContainText("Continuar");
});

test("mapa orienta o desafio pendente sem afirmar que há pedido disponível", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l01", "l02", "l03"], route: "guided" });
  await page.reload();
  await page.getByTestId("open-map").click();
  await expect(page.getByTestId("map-guide")).toContainText("desafio aberto");
  await expect(page.getByTestId("checkpoint-start-cp-01")).toBeVisible();
});

test("mapa não promete pedido disponível quando nenhum está aberto", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: [], route: "guided" });
  const progress = await readProgress(page);
  if (!progress?.lessonStatus) throw new Error("progresso ausente");
  for (const id of Object.keys(progress.lessonStatus)) progress.lessonStatus[id] = "locked";
  await writeProgressDoc(page, progress);
  await page.reload();
  await page.getByTestId("open-map").click();
  await expect(page.getByTestId("map-guide")).toContainText("Confira o estado dos pedidos");
  await expect(page.getByTestId("map-guide")).not.toContainText("pedido marcado como Disponível");
});

test("mapa Dev usa módulos e reconhece pedido em andamento", async ({ page }) => {
  await completeOnboarding(page);
  await page.getByRole("button", { name: "Sair da lição" }).click();
  await page.getByTestId("map-back").click();
  await page.getByTestId("journey-switch-dev").click();
  const guide = page.getByTestId("map-guide");
  await expect(guide).toContainText("avance pelos módulos");
  await page.getByTestId("map-start-l15").click();
  await page.getByRole("button", { name: "Sair da lição" }).click();
  await expect(guide).toContainText("Em andamento");
  await expect(guide).not.toContainText("bairros");
});
