import { createHash } from "node:crypto";
import { copyFile, readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { XP_PER_ACTIVITY_PASS, XP_PER_LESSON_COMPLETE } from "../src/domain/progress";
import { answerRight, completeOnboarding, deleteProgress, readProgress } from "./support";

/**
 * Drill de durabilidade do storage (spike AID-2884, plano AID-2876): prova
 * end-to-end, no app real, que o par exportar→restaurar é lossless para o
 * LearnerProgress — o safety-net do loop principal enquanto o progresso
 * vive só no navegador (local-first, sem conta).
 *
 * Etapas: (1) gerar progresso real dirigindo a UI; (2) exportar pelo botão
 * de backup (download de verdade) e conferir sha256 + igualdade com o que
 * está no IndexedDB; (3) apagar a chave de progresso (simula "limpar dados
 * do site") e recarregar — a perda é visível; (4) reonboardar até a home,
 * importar o arquivo exportado e conferir que o estado restaurado é
 * byte-a-byte o estado exportado (schema/content version atuais).
 *
 * O artefato salvo em `testInfo.outputPath` é o mesmo usado no recibo do
 * CLI `scripts/storage/progress_backup.py` (seal/verify) do runbook.
 */

const EXPECTED_XP = 3 * XP_PER_ACTIVITY_PASS + XP_PER_LESSON_COMPLETE;

test("export→wipe→import é lossless: backup com sha256 restaura o progresso idêntico", async ({
  page,
}, testInfo) => {
  test.slow();
  // 1) Progresso real: onboarding completo + Mapa Inicial concluído.
  await completeOnboarding(page);
  await answerRight(page);
  await page.getByTestId("go-map").click();
  await page.getByTestId("map-back").click();
  await page.getByTestId("open-progress").click();
  await expect(page.getByTestId("progress-screen")).toBeVisible();
  await expect(page.getByTestId("progress-xp")).toContainText(`${EXPECTED_XP} XP`);

  // 2) Export pelo caminho de produção: download real com sha256.
  const backupPath = testInfo.outputPath("literacydojo-progress-drill.json");
  const importPath = `/tmp/literacydojo-drill-import-${Date.now()}.json`;
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("export-progress").click(),
  ]);
  await download.saveAs(backupPath);
  await copyFile(backupPath, importPath);
  const exportedJson = await readFile(backupPath, "utf8");
  const exported = JSON.parse(exportedJson);
  const sha256 = createHash("sha256").update(exportedJson).digest("hex");
  expect(sha256).toMatch(/^[0-9a-f]{64}$/);
  expect(exported.schemaVersion).toBe(4);
  expect(exported.xp).toBe(EXPECTED_XP);

  // Export lossless: o JSON baixado equivale ao documento persistido no
  // IndexedDB (normalização JSON dos dois lados da comparação).
  const persisted = await readProgress(page);
  expect(JSON.parse(JSON.stringify(persisted))).toEqual(exported);

  // 3) Perda simulada: "limpar dados do site" apaga a jornada inteira.
  // (A leitura precisa ser ANTES do reload: no boot seguinte o app volta a
  // semear o estado inicial — onboarding.completed=false — e a chave existe
  // de novo, só que vazia de jornada.)
  await deleteProgress(page);
  expect(await readProgress(page)).toBeUndefined();
  await page.reload();
  await expect(page.getByTestId("assistant-welcome")).toBeVisible();

  // 4) Restauração: reonboardar até a home e importar o arquivo exportado.
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-save_time").check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-work").check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-medium").check();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-option-scheduling").check();
  await page.getByTestId("onboarding-next").click();
  await expect(page.getByTestId("map-screen")).toBeVisible();
  await page.getByTestId("map-back").click();
  await page.getByTestId("open-progress").click();
  await page.getByTestId("import-progress-file").setInputFiles(importPath);
  await expect(page.getByTestId("backup-status")).toContainText(
    "Backup restaurado neste navegador.",
  );

  // Restore lossless: o documento re-persistido é idêntico ao exportado e a
  // UI reflete o estado restaurado (XP e lição concluída de volta).
  const restored = await readProgress(page);
  expect(restored).toEqual(exported);
  await expect(page.getByTestId("progress-xp")).toContainText(`${EXPECTED_XP} XP`);
});
