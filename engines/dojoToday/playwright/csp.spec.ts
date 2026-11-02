import { expect, test } from "@playwright/test";

// The application is served with its real meta CSP, never bypassed by the test.
test("CSP: Sócrates supports configured HTTPS and loopback HTTP providers", async ({ page }) => {
  for (const baseUrl of [
    "https://provider.example/v1",
    "http://localhost:18971/v1",
    "http://127.0.0.1:18972/v1",
  ]) {
    let requests = 0;
    await page.route(`${baseUrl}/chat/completions`, async (route) => {
      requests++;
      await route.fulfill({
        status: 200,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({ choices: [{ message: { content: "Resposta de teste" } }] }),
      });
    });
    await page.goto("/");
    await page.evaluate((url) => {
      localStorage.setItem(
        "dojoToday:aiConfig",
        JSON.stringify({ baseUrl: url, apiKey: "test-key", model: "test-model" }),
      );
    }, baseUrl);
    await page.locator("#soc-q").fill("Como começar?");
    await page.locator("#soc-send").click();
    await expect(page.locator("#soc-reply"), baseUrl).toContainText("Resposta de teste");
    expect(requests, baseUrl).toBe(1);
    await page.unroute(`${baseUrl}/chat/completions`);
  }
});

test("CSP: inline scripts, event handlers, external scripts and remote HTTP are blocked", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const violations: string[] = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      violations.push(event.violatedDirective);
    });
    const script = document.createElement("script");
    script.textContent = "document.documentElement.dataset.inlineScript = 'ran'";
    document.body.append(script);
    const button = document.createElement("button");
    button.setAttribute("onclick", "document.documentElement.dataset.inlineHandler = 'ran'");
    document.body.append(button);
    button.click();
    const external = document.createElement("script");
    external.src = "https://untrusted.example/evil.js";
    document.body.append(external);
    let remoteHttpBlocked = false;
    try {
      await fetch("http://untrusted.example/blocked");
    } catch {
      remoteHttpBlocked = true;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
    return {
      inlineScript: document.documentElement.dataset.inlineScript,
      inlineHandler: document.documentElement.dataset.inlineHandler,
      remoteHttpBlocked,
      violations,
    };
  });
  expect(result.inlineScript).toBeUndefined();
  expect(result.inlineHandler).toBeUndefined();
  expect(result.remoteHttpBlocked).toBe(true);
  expect(
    result.violations.filter((value) => value.startsWith("script-src")).length,
  ).toBeGreaterThanOrEqual(3);
  expect(result.violations).toContain("connect-src");
});
