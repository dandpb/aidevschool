import { expect, test } from "@playwright/test";
import {
  type LocalSuggestion,
  loadHostLocalToday,
  projectLocalSuggestion,
  renderLocalSuggestion,
} from "../src/localProjection";

/**
 * Guarda automatizada da rota hosted `?host=os` (main.ts boot) e do sink
 * `renderLocalSuggestion` (innerHTML). Achado QA AID-753 / issue AID-754:
 * a correção de escape do PR #262 precisa falhar em CI se regredir — uma
 * mutação que remova `escapeHtml` deve quebrar estes testes.
 */

const HOSTILE_TITLE = '<img src=x onerror="window.__dojoUnitXss=1">';
const HOSTILE_DETAIL = '<script>window.__dojoUnitXss=2</script> & "quotes"';

// ---------- Guardas de unidade (sink + projeção pura; rodam em Node) ----------

test("unit: renderLocalSuggestion escapa title/detail hostis no sink innerHTML", () => {
  const hostile: LocalSuggestion = {
    title: HOSTILE_TITLE,
    detail: HOSTILE_DETAIL,
    source: "os-progress",
  };

  const html = renderLocalSuggestion(hostile);

  expect(html).toContain('data-testid="dojo-today-local-suggestion"');
  expect(html).not.toContain("<img");
  expect(html).not.toContain("<script");
  expect(html).toContain("&lt;img src=x onerror=&quot;window.__dojoUnitXss=1&quot;&gt;");
  expect(html).toContain("&lt;script&gt;window.__dojoUnitXss=2&lt;/script&gt;");
});

test("unit: renderLocalSuggestion mantém a fronteira de autoridade da vista hosted", () => {
  const html = renderLocalSuggestion({
    title: "WAREHOUSE",
    detail: "Sugestão neste dispositivo.",
    source: "fallback",
  });

  expect(html).toContain("Não é FSRS canônico");
  expect(html).toContain("Não escreve learner/learning_state.yaml e não marca mastered");
});

test("unit: projectLocalSuggestion sem progresso válido cai no fallback", () => {
  const invalid = [null, undefined, 42, "x", {}, { missionStatusByKey: "nope" }];
  for (const progress of invalid) {
    const suggestion = projectLocalSuggestion(progress);
    expect(suggestion.source).toBe("fallback");
    expect(suggestion.title).toBe("WAREHOUSE");
  }
});

test("unit: projectLocalSuggestion segue a missão dev ativa do dispositivo", () => {
  const suggestion = projectLocalSuggestion({
    activeTrackId: "dev",
    activeMissionId: "game-03-wormhole",
    missionStatusByKey: {
      "dev:game-02-warehouse": "completed",
      "dev:game-03-wormhole": "in-progress",
    },
  });

  expect(suggestion.source).toBe("os-progress");
  expect(suggestion.title).toBe("WORMHOLE");
  expect(suggestion.detail).toContain("Missão ativa neste dispositivo");
});

test("unit: sem missão ativa, sugere a próxima missão incompleta do trilho", () => {
  const suggestion = projectLocalSuggestion({
    missionStatusByKey: { "dev:game-02-warehouse": "completed" },
  });

  expect(suggestion.source).toBe("os-progress");
  expect(suggestion.title).toBe("WORMHOLE");
});

test("unit: trilho dev concluído sugere o catálogo do Engine Hub", () => {
  const suggestion = projectLocalSuggestion({
    missionStatusByKey: {
      "dev:game-02-warehouse": "completed",
      "dev:game-03-wormhole": "completed",
      "dev:game-05-relay-station": "completed",
    },
  });

  expect(suggestion.source).toBe("os-progress");
  expect(suggestion.title).toBe("Catálogo voxel no Engine Hub");
});

test("unit: progresso hostil do OS nunca vaza title/detail crus", () => {
  const suggestion = projectLocalSuggestion({
    activeTrackId: "dev",
    activeMissionId: HOSTILE_TITLE,
    missionStatusByKey: { [`dev:${HOSTILE_TITLE}`]: HOSTILE_DETAIL },
  });

  expect(suggestion.title).not.toMatch(/[<>&"]/);
  expect(suggestion.detail).not.toMatch(/[<>&"]/);
});

test("unit: loadHostLocalToday degrada para fallback sem IndexedDB", async () => {
  const suggestion = await loadHostLocalToday();

  expect(suggestion.source).toBe("fallback");
});

// ---------- E2E da rota hosted (?host=os) ----------

test("e2e: rota hosted ?host=os renderiza a sugestão local, não a vista canônica", async ({
  page,
}) => {
  await page.goto("/?host=os");

  const card = page.getByTestId("dojo-today-local-suggestion");
  await expect(card).toBeVisible();
  await expect(card.locator("h2")).toHaveText("WAREHOUSE");
  await expect(page.getByRole("heading", { name: "Sugestão neste dispositivo" })).toBeVisible();
  await expect(card.getByText("Não é FSRS canônico")).toBeVisible();
  await expect(page.getByText(/não marca mastered/)).toBeVisible();
  // A vista canônica (FSRS/streak/trilha) não deve montar nesta rota.
  await expect(page.getByRole("heading", { name: "Sua lição de hoje" })).toHaveCount(0);
});

test("e2e: rota hosted com progresso hostil do OS não executa nem exibe payload", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    const win = window as { __dojoHostileFired?: boolean };
    win.__dojoHostileFired = false;
    const hostileProgress = {
      activeTrackId: "dev",
      activeMissionId: '<img src=x onerror="window.__dojoHostileFired=true">',
      missionStatusByKey: {
        "dev:game-02-warehouse": "<script>window.__dojoHostileFired=true</script>",
        "dev:game-03-wormhole": "completed",
        "dev:game-05-relay-station": "completed",
      },
    };
    const fakeDb = {
      objectStoreNames: { contains: (name: string) => name === "progress" },
      close: () => {},
      transaction: () => ({
        objectStore: () => ({
          get: (key: string) => {
            const request: {
              result?: unknown;
              onsuccess?: () => void;
            } = {};
            queueMicrotask(() => {
              request.result = key === "os-progress" ? hostileProgress : null;
              request.onsuccess?.();
            });
            return request;
          },
        }),
      }),
    };
    window.indexedDB = {
      open: (name: string) => {
        const request: {
          result?: unknown;
          transaction?: { abort: () => void };
          onsuccess?: () => void;
          onerror?: () => void;
        } = { transaction: { abort: () => {} } };
        queueMicrotask(() => {
          if (name !== "codexdojo-os") {
            request.onerror?.();
            return;
          }
          request.result = fakeDb;
          request.onsuccess?.();
        });
        return request;
      },
    } as unknown as IDBFactory;
  });

  await page.goto("/?host=os");

  const card = page.getByTestId("dojo-today-local-suggestion");
  await expect(card).toBeVisible();
  // Payload hostil não chega ao DOM: title/detail vêm só do DEV_RAIL constante.
  await expect(card.locator("h2")).toHaveText("WAREHOUSE");
  const bodyText = (await page.evaluate(() => document.body.textContent)) ?? "";
  expect(bodyText).not.toContain("<img");
  expect(bodyText).not.toContain("<script");
  expect(
    await page.evaluate(() => (window as { __dojoHostileFired?: boolean }).__dojoHostileFired),
  ).toBe(false);
  expect(pageErrors).toEqual([]);
});
