import { chromium } from "../../engines/literacyDojo/node_modules/@playwright/test/index.mjs";

const base = process.env.AID42_BASE_URL ?? "https://aidevschool-literacydojo.netlify.app/";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
const page = await context.newPage();
const errors = [];
const requests = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => requests.push(request.url()));

await page.goto(base, { waitUntil: "networkidle" });
await page.screenshot({ path: "work-products/AID-42/01-public-onboarding.png", fullPage: true });
const initialText = (await page.locator("body").innerText()).slice(0, 4_000);
const initialLinks = await page.locator("a").evaluateAll((anchors) =>
  anchors.map((anchor) => ({
    text: (anchor.textContent ?? "").trim(),
    href: anchor.href,
    target: anchor.target,
  })),
);
const linkChecks = [];
for (const href of [...new Set(initialLinks.map((link) => link.href))]) {
  const response = await context.request.get(href);
  linkChecks.push({ href, status: response.status(), finalUrl: response.url() });
}

await page.getByTestId("onboarding-next").click();
for (const id of ["save_time", "work", "medium", "scheduling"]) {
  await page.getByTestId(`onboarding-option-${id}`).check();
  await page.getByTestId("onboarding-next").click();
}

await page.getByTestId("map-screen").waitFor();
await page.screenshot({ path: "work-products/AID-42/02-public-map.png", fullPage: true });
const mapStarts = await page
  .locator('[data-testid^="map-start-"]')
  .evaluateAll((elements) => elements.map((element) => element.getAttribute("data-testid")));
await page.getByTestId(mapStarts[0]).click();
const lessonIntro = (await page.locator("body").innerText()).slice(0, 4_000);

await page.getByTestId("start-lesson").click();
const activityIds = await page
  .locator("[data-testid]")
  .evaluateAll((elements) => elements.map((element) => element.getAttribute("data-testid")));
await page.getByTestId("output-out-b").check();
await page.getByTestId("criterion-c-fontes").check();
await page.getByTestId("criterion-c-limites").check();
await page.getByTestId("submit-attempt").click();
await page.getByTestId("finish-lesson").waitFor();

const feedback = (await page.locator("body").innerText()).slice(0, 4_000);
await page.getByTestId("finish-lesson").click();
await page.getByTestId("result-screen").waitFor();
await page.screenshot({ path: "work-products/AID-42/03-public-result.png", fullPage: true });
const resultText = (await page.locator("body").innerText()).slice(0, 5_000);

const databases = await page.evaluate(async () => indexedDB.databases());
const externalRequests = [...new Set(requests.filter((url) => new URL(url).origin !== new URL(base).origin))];
console.log(
  JSON.stringify(
    {
      base,
      title: await page.title(),
      initialText,
      initialLinks,
      linkChecks,
      mapStarts,
      lessonIntro,
      feedback,
      resultText,
      databases,
      errors,
      externalRequests,
    },
    null,
    2,
  ),
);

await browser.close();
