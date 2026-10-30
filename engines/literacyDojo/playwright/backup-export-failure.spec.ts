import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./support";

test("falha ao iniciar download limpa recursos e informa resultado incerto", async ({ page }) => {
  await completeOnboarding(page);
  await page.getByRole("button", { name: "Sair da lição" }).click();
  await page.getByTestId("map-back").click();
  await page.getByTestId("open-progress").click();
  await page.evaluate(() => {
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    Object.assign(window, { createdUrls: 0, revokedUrls: 0 });
    URL.createObjectURL = (blob) => {
      (window as unknown as { createdUrls: number }).createdUrls++;
      return create(blob);
    };
    URL.revokeObjectURL = (url) => {
      (window as unknown as { revokedUrls: number }).revokedUrls++;
      revoke(url);
    };
    const original = HTMLAnchorElement.prototype.click;
    Object.assign(window, {
      restoreDownloadClick: () => {
        HTMLAnchorElement.prototype.click = original;
      },
    });
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) throw new Error("FALHA_TECNICA_SIMULADA");
      return original.call(this);
    };
  });
  for (let attempt = 1; attempt <= 2; attempt++) {
    await page.getByTestId("export-progress").click();
    const status = page.getByTestId("backup-status");
    await expect(status).toContainText("Não foi possível confirmar o download");
    await expect(status).not.toContainText("FALHA_TECNICA_SIMULADA");
    await expect(page.locator("a[download]")).toHaveCount(0);
    expect(
      await page.evaluate(() => ({
        created: (window as unknown as { createdUrls: number }).createdUrls,
        revoked: (window as unknown as { revokedUrls: number }).revokedUrls,
      })),
    ).toEqual({ created: attempt, revoked: attempt });
  }
  await page.evaluate(() =>
    (window as unknown as { restoreDownloadClick: () => void }).restoreDownloadClick(),
  );
  await page.evaluate(() => {
    const original = URL.createObjectURL;
    Object.assign(window, {
      restoreUrlCreation: () => {
        URL.createObjectURL = original;
      },
    });
    URL.createObjectURL = () => {
      throw new Error("FALHA_CRIACAO_SIMULADA");
    };
  });
  await page.getByTestId("export-progress").click();
  await expect(page.getByTestId("backup-status")).toContainText(
    "Não foi possível confirmar o download",
  );
  await expect(page.getByTestId("backup-status")).not.toContainText("FALHA_CRIACAO_SIMULADA");
  await expect(page.locator("a[download]")).toHaveCount(0);
  await page.evaluate(() =>
    (window as unknown as { restoreUrlCreation: () => void }).restoreUrlCreation(),
  );
  await page.evaluate(() => {
    const original = document.body.append;
    Object.assign(window, {
      restoreBodyAppend: () => {
        document.body.append = original;
      },
    });
    document.body.append = function (...nodes) {
      if (nodes.some((node) => node instanceof HTMLAnchorElement && node.download)) {
        throw new Error("FALHA_ANEXO_SIMULADA");
      }
      return original.apply(this, nodes);
    };
  });
  await page.getByTestId("export-progress").click();
  await expect(page.getByTestId("backup-status")).toContainText(
    "Não foi possível confirmar o download",
  );
  await expect(page.locator("a[download]")).toHaveCount(0);
  await page.evaluate(() =>
    (window as unknown as { restoreBodyAppend: () => void }).restoreBodyAppend(),
  );
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("export-progress").click(),
  ]);
  expect(await download.failure()).toBeNull();
  await expect(page.getByTestId("backup-status")).toContainText("Download solicitado");
  await expect(page.locator("a[download]")).toHaveCount(0);
  expect(
    await page.evaluate(() => ({
      created: (window as unknown as { createdUrls: number }).createdUrls,
      revoked: (window as unknown as { revokedUrls: number }).revokedUrls,
    })),
  ).toEqual({ created: 4, revoked: 4 });
});
