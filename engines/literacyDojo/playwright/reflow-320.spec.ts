import { type Frame, type Page, expect, test } from "@playwright/test";
import { activity, answerRight, mapInitial } from "./support";

/**
 * Reflow (WCAG 1.4.10) — AID-271: a 320 CSS px (viewport ou zoom 400%) o app não
 * pode exigir scroll horizontal essencial, inclusive quando embutido no shell do
 * host, que entrega ~298px de largura ao iframe de missão nesse viewport.
 */
const TOLERANCE_PX = 1;

type ReflowGeometry = {
  scrollWidth: number;
  innerWidth: number;
  appShellWidth: number | null;
  productBarRight: number | null;
};

async function reflowGeometry(context: Page | Frame): Promise<ReflowGeometry> {
  return context.evaluate(() => {
    const scrolling = document.scrollingElement ?? document.documentElement;
    const shell = document.querySelector(".app-shell");
    const bar = document.querySelector(".product-bar");
    return {
      scrollWidth: scrolling.scrollWidth,
      innerWidth: window.innerWidth,
      appShellWidth: shell ? shell.getBoundingClientRect().width : null,
      productBarRight: bar ? bar.getBoundingClientRect().right : null,
    };
  });
}

async function expectNoHorizontalScroll(context: Page | Frame, label: string) {
  const geometry = await reflowGeometry(context);
  expect(
    geometry.scrollWidth,
    `${label} exigiria scroll horizontal (geometria: ${JSON.stringify(geometry)})`,
  ).toBeLessThanOrEqual(geometry.innerWidth + TOLERANCE_PX);
}

function hostHarnessHtml(missionId: string, missionVersion: number): string {
  const origin = `http://localhost:${process.env.LITERACY_E2E_APP_PORT ?? "4173"}`;
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Host harness de reflow</title>
  </head>
  <body style="margin: 0">
    <iframe
      id="mission"
      title="Missão hospedada"
      style="width: 298px; height: 640px; border: 0; display: block"
      src="/?hosted=1&hostOrigin=${encodeURIComponent(origin)}"
    ></iframe>
    <script>
      (() => {
        const frame = document.getElementById("mission");
        const missionId = ${JSON.stringify(missionId)};
        const missionVersion = ${JSON.stringify(missionVersion)};
        const envelope = (type, payload) => ({
          protocol: "aidevschool.host-engine",
          version: "1.0",
          type,
          messageId: type + "-" + crypto.randomUUID(),
          hostSessionId: "hs-reflow-320",
          missionRunId: "mr-reflow-320",
          engineId: "literacyDojo",
          sentAt: new Date().toISOString(),
          payload,
        });
        let launched = false;
        const timer = setInterval(() => {
          if (launched) return;
          frame.contentWindow.postMessage(
            envelope("host.hello", { missionId, protocolVersion: "1.0" }),
            window.location.origin,
          );
        }, 250);
        window.addEventListener("message", (event) => {
          if (launched || event.source !== frame.contentWindow) return;
          const data = event.data;
          if (
            data &&
            data.protocol === "aidevschool.host-engine" &&
            data.type === "engine.ready"
          ) {
            launched = true;
            clearInterval(timer);
            frame.contentWindow.postMessage(
              envelope("mission.launch", {
                missionId,
                missionVersion,
                mode: "initial",
                locale: "pt-BR",
              }),
              window.location.origin,
            );
          }
        });
      })();
    </script>
  </body>
</html>`;
}

test("Standalone a 320px: sem scroll horizontal essencial do onboarding ao resultado", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await expect(page.getByTestId("assistant-welcome")).toBeVisible();
  await expectNoHorizontalScroll(page, "onboarding (boas-vindas)");

  await page.getByTestId("onboarding-next").click();
  for (const option of ["save_time", "work", "medium", "scheduling"]) {
    await page.getByTestId(`onboarding-option-${option}`).check();
    await page.getByTestId("onboarding-next").click();
    await expectNoHorizontalScroll(page, `onboarding (${option})`);
  }

  await expect(page.getByTestId("map-screen")).toBeVisible();
  await expectNoHorizontalScroll(page, "mapa da vila");

  await page.getByTestId(`map-start-${mapInitial.id}`).click();
  await expect(page.getByRole("heading", { name: mapInitial.title })).toBeVisible();
  await expectNoHorizontalScroll(page, "lição (introdução)");

  await page.getByTestId("start-lesson").click();
  await answerRight(page);
  await expect(page.getByTestId("result-screen")).toBeVisible();
  await expectNoHorizontalScroll(page, "resultado");
});

test("Missão hospedada em iframe de 298px (paridade host @320): sem scroll horizontal essencial", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.route("**/reflow-host-harness", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: hostHarnessHtml(mapInitial.id, mapInitial.version),
    }),
  );
  await page.goto("/reflow-host-harness");

  const frame = page.frame({ url: /hosted=1/ });
  expect(frame, "iframe de missão hospedada").not.toBeNull();

  await expect(frame.getByRole("heading", { name: mapInitial.title })).toBeVisible({
    timeout: 20_000,
  });
  await expectNoHorizontalScroll(frame, "missão hospedada (introdução)");

  const introGeometry = await reflowGeometry(frame);
  expect(introGeometry.appShellWidth).toBeLessThanOrEqual(introGeometry.innerWidth + TOLERANCE_PX);
  expect(introGeometry.productBarRight).toBeLessThanOrEqual(
    introGeometry.innerWidth + TOLERANCE_PX,
  );

  await frame.getByTestId("start-lesson").click();
  await frame.getByTestId(`output-${activity.evaluation.betterOutputId}`).check();
  for (const criterionId of activity.evaluation.requiredCriterionIds) {
    await frame.getByTestId(`criterion-${criterionId}`).check();
  }
  await frame.getByTestId("submit-attempt").click();
  await expect(frame.getByTestId("feedback-panel")).toBeVisible();
  await expectNoHorizontalScroll(frame, "missão hospedada (atividade)");

  await frame.getByTestId("finish-lesson").click();
  await expect(frame.getByTestId("result-screen")).toBeVisible();
  await expectNoHorizontalScroll(frame, "missão hospedada (resultado)");
});

test("Controle de regressão: piso de largura não pode voltar a travar reflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("assistant-welcome")).toBeVisible();
  const blockers = await page.evaluate(() => {
    const hero = document.createElement("div");
    hero.className = "map-hero";
    const world = document.createElement("div");
    world.className = "voxel-world";
    hero.appendChild(world);
    document.body.appendChild(hero);
    const result = {
      bodyMinWidth: getComputedStyle(document.body).minWidth,
      mapHeroVoxelMinWidth: getComputedStyle(world).minWidth,
    };
    hero.remove();
    return result;
  });
  expect(blockers.bodyMinWidth).toBe("0px");
  expect(blockers.mapHeroVoxelMinWidth).toBe("0px");
});
