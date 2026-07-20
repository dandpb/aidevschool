import type {
  ActivityDefinition,
  ChoiceActivity,
  MissingContextActivity,
  OutputComparisonActivity,
  PromptBuilderActivity,
  RubricReviewActivity,
  SafetyClassificationActivity,
  SortActivity,
} from "../data/generated/lessons";
import type {
  ActivityAnswer,
  ChoiceAnswer,
  MissingContextAnswer,
  OutputComparisonAnswer,
  PromptBuilderAnswer,
  RubricReviewAnswer,
  SafetyClassificationAnswer,
  SortAnswer,
} from "../domain/evaluation";
import { ChoiceView } from "./ChoiceView";
import { MissingContextView } from "./MissingContextView";
import { OutputComparisonView } from "./OutputComparisonView";
import { PromptBuilderView } from "./PromptBuilderView";
import { RubricReviewView } from "./RubricReviewView";
import { SafetyClassificationView } from "./SafetyClassificationView";
import { SortView } from "./SortView";

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
    case "choice":
      return (
        <ChoiceView
          activity={activity as ChoiceActivity}
          answer={answer as ChoiceAnswer}
          invalidIds={invalidIds}
          disabled={disabled}
          onChange={onChange}
        />
      );
    case "sort":
      return (
        <SortView
          activity={activity as SortActivity}
          answer={answer as SortAnswer}
          invalidIds={invalidIds}
          disabled={disabled}
          onChange={onChange}
        />
      );
    case "missing_context":
      return (
        <MissingContextView
          activity={activity as MissingContextActivity}
          answer={answer as MissingContextAnswer}
          invalidIds={invalidIds}
          disabled={disabled}
          onChange={onChange}
        />
      );
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
    case "rubric_review":
      return (
        <RubricReviewView
          activity={activity as RubricReviewActivity}
          answer={answer as RubricReviewAnswer}
          invalidIds={invalidIds}
          disabled={disabled}
          onChange={onChange}
        />
      );
    default:
      return (
        <p className="muted" role="note">
          Este tipo de atividade ({activity.type}) ainda não está disponível.
        </p>
      );
  }
}

export function emptyAnswerFor(activity: ActivityDefinition): ActivityAnswer {
  switch (activity.type) {
    case "choice":
      return { optionIds: [] } satisfies ChoiceAnswer;
    case "sort":
      // A resposta inicial espelha a ordem exibida pelo SortView: é essa ordem
      // que deve ser avaliada quando a pessoa verifica sem mover nada
      // (isAnswerComplete trata a ordem inicial como resposta completa).
      return { orderedIds: activity.data.items.map((item) => item.id) } satisfies SortAnswer;
    case "missing_context":
      return { contextIds: [] } satisfies MissingContextAnswer;
    case "output_comparison":
      return { outputId: undefined, criterionIds: [] } satisfies OutputComparisonAnswer;
    case "prompt_builder":
      return { values: {} } satisfies PromptBuilderAnswer;
    case "safety_classification":
      return { labels: {} } satisfies SafetyClassificationAnswer;
    case "rubric_review":
      return { verdicts: {} } satisfies RubricReviewAnswer;
    default:
      return { criterionIds: [] } satisfies OutputComparisonAnswer;
  }
}

/** A pessoa só pode verificar quando a resposta está completa o suficiente. */
export function isAnswerComplete(activity: ActivityDefinition, answer: ActivityAnswer): boolean {
  switch (activity.type) {
    case "choice":
      return (answer as ChoiceAnswer).optionIds.length > 0;
    case "sort":
      return true; // a ordem inicial já é uma resposta completa
    case "missing_context":
      return (answer as MissingContextAnswer).contextIds.length > 0;
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
    case "rubric_review":
      return activity.data.criteria.every(
        (criterion) => (answer as RubricReviewAnswer).verdicts[criterion.id] !== undefined,
      );
    default:
      return false;
  }
}
