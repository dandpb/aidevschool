import type {
  ActivityDefinition,
  OutputComparisonActivity,
  PromptBuilderActivity,
  SafetyClassificationActivity,
} from "../data/generated/lessons";
import type {
  ActivityAnswer,
  OutputComparisonAnswer,
  PromptBuilderAnswer,
  SafetyClassificationAnswer,
} from "../domain/evaluation";
import { OutputComparisonView } from "./OutputComparisonView";
import { PromptBuilderView } from "./PromptBuilderView";
import { SafetyClassificationView } from "./SafetyClassificationView";

export type ActivityViewProps = {
  activity: ActivityDefinition;
  answer: ActivityAnswer;
  invalidIds: string[];
  disabled: boolean;
  onChange: (answer: ActivityAnswer) => void;
};

/** Despacha o renderizador pelo tipo declarado no conteúdo — nada hardcoded. */
export function ActivityRenderer({
  activity,
  answer,
  invalidIds,
  disabled,
  onChange,
}: ActivityViewProps) {
  switch (activity.type) {
    case "output_comparison":
      return (
        <OutputComparisonView
          activity={activity as OutputComparisonActivity}
          answer={answer as OutputComparisonAnswer}
          invalidIds={invalidIds}
          disabled={disabled}
          onChange={onChange}
        />
      );
    case "prompt_builder":
      return (
        <PromptBuilderView
          activity={activity as PromptBuilderActivity}
          answer={answer as PromptBuilderAnswer}
          invalidIds={invalidIds}
          disabled={disabled}
          onChange={onChange}
        />
      );
    case "safety_classification":
      return (
        <SafetyClassificationView
          activity={activity as SafetyClassificationActivity}
          answer={answer as SafetyClassificationAnswer}
          invalidIds={invalidIds}
          disabled={disabled}
          onChange={onChange}
        />
      );
    default:
      return (
        <p className="muted" role="note">
          Este tipo de atividade ({activity.type}) ainda não está disponível neste piloto.
        </p>
      );
  }
}

export function emptyAnswerFor(activity: ActivityDefinition): ActivityAnswer {
  switch (activity.type) {
    case "output_comparison":
      return { outputId: undefined, criterionIds: [] } satisfies OutputComparisonAnswer;
    case "prompt_builder":
      return { values: {} } satisfies PromptBuilderAnswer;
    case "safety_classification":
      return { labels: {} } satisfies SafetyClassificationAnswer;
    default:
      return { criterionIds: [] } satisfies OutputComparisonAnswer;
  }
}

/** A pessoa só pode verificar quando a resposta está completa o suficiente. */
export function isAnswerComplete(activity: ActivityDefinition, answer: ActivityAnswer): boolean {
  switch (activity.type) {
    case "output_comparison":
      return (answer as OutputComparisonAnswer).outputId !== undefined;
    case "prompt_builder":
      return activity.data.fields.every(
        (field) => ((answer as PromptBuilderAnswer).values[field.id] ?? "").trim().length > 0,
      );
    case "safety_classification":
      return activity.data.items.every(
        (item) => (answer as SafetyClassificationAnswer).labels[item.id] !== undefined,
      );
    default:
      return false;
  }
}
