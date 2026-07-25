import { expect, test } from "@playwright/test";

/**
 * PWA: só o build serve service worker (registro é PROD-only), então este spec
 * roda contra `vite preview` no projeto "pwa" do playwright.config.ts.
 */
test("instalável e utilizável offline depois da primeira visita", async ({ page, context }) => {
  await page.goto("/");
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  const parsed = await manifest.json();
  expect(parsed.display).toBe("standalone");
  for (const icon of parsed.icons as { src: string }[]) {
    expect((await page.request.get(icon.src)).ok()).toBe(true);
  }

  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await expect(page.getByTestId("assistant-welcome")).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId("assistant-welcome")).toBeVisible();
  await page.getByTestId("onboarding-next").click();
  await expect(page.getByTestId("onboarding-option-save_time")).toBeVisible();
});
