import { expect, test } from "@playwright/test";
import { answerRight } from "./support";

test("ilustração da tarefa escolhida tem papel e nome acessíveis", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("onboarding-next").click();
  for (const option of ["save_time", "work", "low", "scheduling"]) {
    if (option === "scheduling") {
      for (const [id, name] of [
        [
          "scheduling",
          "organizar um agendamento Transforme compromissos e prioridades em um rascunho de agenda.",
        ],
        [
          "communication",
          "preparar uma mensagem Crie um rascunho de mensagem e revise o que vai enviar.",
        ],
        [
          "news_research",
          "pesquisar uma notícia Estruture perguntas e confira fontes antes de compartilhar.",
        ],
      ]) {
        await expect(page.getByTestId(`onboarding-option-${id}`)).toHaveAccessibleName(name);
      }
    }
    await page.getByTestId(`onboarding-option-${option}`).check();
    await page.getByTestId("onboarding-next").click();
  }
  await page.getByTestId("map-start-l02").click();
  await expect(
    page
      .getByTestId("task-context")
      .getByRole("img", { name: "Ilustração de organizar um agendamento" }),
  ).toBeVisible();
  await page.getByTestId("start-lesson").click();
  await answerRight(page);
  await expect(
    page
      .getByTestId("result-task-context")
      .getByRole("img", { name: "Ilustração de organizar um agendamento" }),
  ).toBeVisible();
});
