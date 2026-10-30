import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./support";

test("abertura lenta não tira o aprendiz do mapa nem permite uma segunda abertura", async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.getByRole("button", { name: "Sair da lição" }).click();
  await page.getByTestId("map-back").click();
  await expect(page.getByTestId("home-screen")).toBeVisible();
  await page.evaluate(() => {
    const original = IDBTransaction.prototype.addEventListener;
    IDBTransaction.prototype.addEventListener = function (type, listener, options) {
      if (this.mode === "readwrite" && type === "complete" && typeof listener === "function") {
        IDBTransaction.prototype.addEventListener = original;
        return original.call(
          this,
          type,
          (event) => {
            Object.assign(window, { releaseOpen: () => listener.call(this, event) });
          },
          options,
        );
      }
      return original.call(this, type, listener, options);
    };
  });
  await page.getByTestId("continue-button").click();
  await page.waitForFunction(
    () => typeof (window as unknown as { releaseOpen?: () => void }).releaseOpen === "function",
  );
  await page.getByTestId("open-map").click();
  const open = page.getByTestId("map-start-l02");
  await expect(open).toHaveAttribute("aria-disabled", "true");
  await open.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("map-screen")).toBeVisible();
  await page.evaluate(() => (window as unknown as { releaseOpen: () => void }).releaseOpen());
  await expect(open).toHaveAttribute("aria-disabled", "false");
  await expect(page.getByTestId("map-screen")).toBeVisible();
  await expect(page.getByTestId("map-lesson-l02")).toContainText("Em andamento");
});
