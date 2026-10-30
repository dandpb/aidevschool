import { type Page, expect, test } from "@playwright/test";
import { readLearnerState } from "./support";

async function finalStep(page: Page) {
  await page.goto("/");
  await page.getByTestId("onboarding-next").click();
  for (const value of ["save_time", "work", "medium", "scheduling"]) {
    await page.getByTestId(`onboarding-option-${value}`).check();
    if (value !== "scheduling") await page.getByTestId("onboarding-next").click();
  }
}

test("erro antes de gravar preserva escolhas e permite tentativa deliberada", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await finalStep(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = () => {
      IDBObjectStore.prototype.put = original;
      throw new DOMException("simulated", "QuotaExceededError");
    };
  });
  const next = page.getByTestId("onboarding-next");
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alert")).toContainText("podem já ter sido salvas");
  await expect(next).toBeFocused();
  await expect(page.getByTestId("onboarding-option-scheduling")).toBeChecked();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("map-screen")).toBeVisible();
  expect(errors).toEqual([]);
});

test("falha após commit informa que escolhas anteriores podem prevalecer", async ({ page }) => {
  await finalStep(page);
  await page.evaluate(() => {
    const original = IDBTransaction.prototype.addEventListener;
    IDBTransaction.prototype.addEventListener = function (type, listener, options) {
      if (this.mode === "readwrite" && type === "complete") {
        IDBTransaction.prototype.addEventListener = original;
        return original.call(this, type, () => this.dispatchEvent(new Event("error")), options);
      }
      return original.call(this, type, listener, options);
    };
  });
  await page.getByTestId("onboarding-next").click();
  await expect(page.getByRole("alert")).toContainText("primeiras escolhas serão mantidas");
  expect((await readLearnerState(page))?.progress.onboarding.taskCategory).toBe("scheduling");
  await page.getByTestId("onboarding-option-communication").check();
  await page.getByTestId("onboarding-next").click();
  await expect(page.getByTestId("map-screen")).toBeVisible();
  expect((await readLearnerState(page))?.progress.onboarding.taskCategory).toBe("scheduling");
});

test("gravação pendente impede cliques duplicados, edição e volta", async ({ page }) => {
  await finalStep(page);
  await page.evaluate(() => {
    const originalPut = IDBObjectStore.prototype.put;
    Object.assign(window, { onboardingWrites: 0 });
    IDBObjectStore.prototype.put = function (...args) {
      (window as unknown as { onboardingWrites: number }).onboardingWrites += 1;
      return originalPut.apply(this, args);
    };
    const originalListener = IDBTransaction.prototype.addEventListener;
    IDBTransaction.prototype.addEventListener = function (type, listener, options) {
      if (this.mode === "readwrite" && type === "complete" && typeof listener === "function") {
        IDBTransaction.prototype.addEventListener = originalListener;
        return originalListener.call(
          this,
          type,
          (event) => {
            Object.assign(window, { releaseOnboarding: () => listener.call(this, event) });
          },
          options,
        );
      }
      return originalListener.call(this, type, listener, options);
    };
  });
  const next = page.getByTestId("onboarding-next");
  await next.focus();
  await page.evaluate(() => {
    const button = document.querySelector<HTMLElement>('[data-testid="onboarding-next"]');
    button?.click();
    button?.click();
  });
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { releaseOnboarding?: () => void }).releaseOnboarding ===
      "function",
  );
  await expect(next).toBeFocused();
  await expect(next).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByTestId("onboarding-option-communication")).toBeDisabled();
  const back = page.getByRole("button", { name: "Voltar" });
  await back.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("onboarding-option-scheduling")).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { onboardingWrites: number }).onboardingWrites),
  ).toBe(1);
  await page.evaluate(() =>
    (window as unknown as { releaseOnboarding: () => void }).releaseOnboarding(),
  );
  await expect(page.getByTestId("map-screen")).toBeVisible();
});
