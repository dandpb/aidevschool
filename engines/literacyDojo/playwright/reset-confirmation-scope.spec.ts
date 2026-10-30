import { expect, test } from "@playwright/test";
import { completeOnboarding, readProgress } from "./support";

test("confirmação de reinício descreve o alcance e permite cancelar", async ({ page }) => {
  await completeOnboarding(page);
  await page.getByRole("button", { name: "Sair da lição" }).click();
  await page.getByTestId("map-back").click();
  const before = await readProgress(page);
  const dialogPromise = page.waitForEvent("dialog");
  const click = page.getByTestId("reset-progress").click();
  const dialog = await dialogPromise;
  const type = dialog.type();
  const message = dialog.message();
  await dialog.dismiss();
  await click;
  expect(type).toBe("confirm");
  expect(message).toContain("progresso atual das duas jornadas deste aplicativo neste navegador");
  expect(message).toContain(
    "Cópias antigas, backups e dados enviados anteriormente podem permanecer",
  );
  expect(message).not.toContain("todo o progresso deste aparelho");
  await expect(page.getByTestId("home-screen")).toBeVisible();
  expect(await readProgress(page)).toEqual(before);
});
