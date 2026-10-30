import { expect, test } from "@playwright/test";
import { completeOnboarding, readProgress } from "./support";

async function injectAfterSaveFailure(page: import("@playwright/test").Page, failRead: boolean) {
  await page.evaluate((failRecoveryRead) => {
    const originalInfo = console.info;
    console.info = (...args) => {
      if (args[0] === "[literacy-evidence]") {
        console.info = originalInfo;
        if (failRecoveryRead) {
          const originalGet = IDBObjectStore.prototype.get;
          IDBObjectStore.prototype.get = (...params) => {
            IDBObjectStore.prototype.get = originalGet;
            throw new DOMException("falha simulada", "UnknownError");
          };
        }
        throw new Error("falha simulada após gravação");
      }
      return originalInfo(...args);
    };
  }, failRead);
}

async function answer(page: import("@playwright/test").Page) {
  await completeOnboarding(page);
  await page.getByTestId("output-out-b").check();
  await page.getByTestId("criterion-c-fontes").check();
  await page.getByTestId("criterion-c-limites").check();
}

test("erro após gravação atualiza progresso sem reenviar a tentativa", async ({ page }) => {
  await answer(page);
  await injectAfterSaveFailure(page, false);
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByRole("alert")).toContainText("pode já ter sido registrada");
  await expect(page.locator(".product-stats")).toContainText("10 XP");
  expect((await readProgress(page))?.counters.attempts).toBe(1);
  await page.getByRole("button", { name: "Sair da lição" }).click();
  await expect(page.getByTestId("map-screen")).toContainText("10 XP");
});

test("releitura indisponível bloqueia nova mutação até recarregar", async ({ page }) => {
  await answer(page);
  await injectAfterSaveFailure(page, true);
  await page.getByTestId("submit-attempt").click();
  await expect(
    page.getByText("Não foi possível confirmar o estado salvo.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByTestId("submit-attempt")).toBeDisabled();
  await expect(page.getByTestId("output-out-b")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Recarregar página" })).toBeVisible();
});
