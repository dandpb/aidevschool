import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ServicesProvider } from "../../src/app/services";
import { ProgressScreen } from "../../src/screens/ProgressScreen";
import { TrackMapScreen } from "../../src/screens/TrackMapScreen";
import { makeServices } from "../helpers";

it("nomeia a lição em andamento no mapa e no progresso", () => {
  const { services, initial } = makeServices();
  initial.lessonStatus.l02 = "in_progress";
  const title = services.content.getLesson("l02")?.title;
  const noop = () => {};
  const view = render(
    <ServicesProvider value={services}>
      <TrackMapScreen
        progress={initial}
        onBack={noop}
        onStartLesson={noop}
        onOpenCheckpoint={noop}
      />
    </ServicesProvider>,
  );
  expect(screen.getByTestId("map-start-l02")).toHaveAccessibleName(`Continuar ${title}`);
  view.rerender(
    <ServicesProvider value={services}>
      <ProgressScreen
        progress={initial}
        onBack={noop}
        onStartLesson={noop}
        onReview={noop}
        onProgressImported={noop}
      />
    </ServicesProvider>,
  );
  expect(screen.getByTestId("progress-start-l02")).toHaveAccessibleName(`Continuar ${title}`);
});
