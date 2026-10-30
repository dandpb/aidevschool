import { expect, test } from "@playwright/test";
import { answerRight, completeOnboarding } from "./support";

test("backup explica que trocar de perfil não transfere nem apaga o original", async ({
  browser,
  page,
}) => {
  await completeOnboarding(page);
  await answerRight(page);
  await page.getByTestId("go-map").click();
  await page.getByTestId("map-back").click();
  await page.getByTestId("open-progress").click();
  const backup = page.getByTestId("progress-backup");
  await expect(backup).toContainText("Restaurar substitui o progresso atual das duas jornadas");
  await expect(page.getByTestId("import-progress")).toHaveAccessibleDescription(
    /substitui o progresso atual/,
  );
  await expect(backup).toContainText("Limpar os dados deste site pode apagar o histórico");
  await expect(backup).toContainText(
    "outro aparelho ou perfil não recebe o progresso automaticamente",
  );
  const second = await browser.newContext();
  try {
    const otherPage = await second.newPage();
    await completeOnboarding(otherPage);
    await otherPage.getByRole("button", { name: "Sair da lição" }).click();
    await expect(otherPage.locator(".product-stats")).toContainText("0 XP");
    await page.reload();
    await expect(page.locator(".product-stats")).toContainText("55 XP");
  } finally {
    await second.close();
  }
});
