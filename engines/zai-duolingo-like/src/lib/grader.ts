// Vertical Protocol — Exercise grader
// Single shared grader for both lesson completion and practice mode.

export type ExerciseType =
  | "multiple-choice"
  | "true-false"
  | "fill-blank"
  | "swipe"
  | "order";

export interface BaseExercise {
  id: string;
  type: ExerciseType;
  prompt: string;
  explanation: string;
  narrative?: string;
}

export interface MultipleChoiceExercise extends BaseExercise {
  type: "multiple-choice";
  options: string[];
  correctIndex: number;
}

export interface TrueFalseExercise extends BaseExercise {
  type: "true-false";
  statement: string;
  isTrue: boolean;
}

export interface FillBlankExercise extends BaseExercise {
  type: "fill-blank";
  // template uses {{0}} {{1}} ... for blanks
  template: string;
  banks: { label: string; correctSlot: number | null }[];
  // number of blanks
  blanks: number;
}

export interface SwipeExercise extends BaseExercise {
  type: "swipe";
  // swipeRightIf: "ai" means swipe right when item belongs to the "ai" category
  swipeRightIf: "ai" | "real";
  // display labels for each swipe direction (context-dependent)
  rightLabel: string;
  leftLabel: string;
  items: { label: string; detail: string; value: "ai" | "real" }[];
}

export interface OrderExercise extends BaseExercise {
  type: "order";
  // items in scrambled order; correctOrder is the indices that form the right sequence
  items: string[];
  correctOrder: number[];
}

export type Exercise =
  | MultipleChoiceExercise
  | TrueFalseExercise
  | FillBlankExercise
  | SwipeExercise
  | OrderExercise;

// Single grader for both lesson completion and practice mode. The answer shape
// per exercise type is the contract the client exercise components produce.
export function gradeExercise(ex: Exercise, answer: unknown): boolean {
  switch (ex.type) {
    case "multiple-choice":
      return answer === ex.correctIndex;
    case "true-false":
      return answer === ex.isTrue;
    case "fill-blank": {
      // answer is an array of bank indices, one per blank slot in order
      if (!Array.isArray(answer) || answer.length !== ex.blanks) return false;
      // For each blank slot, the chosen bank label must be the one whose
      // correctSlot === that slot index.
      for (let slot = 0; slot < ex.blanks; slot++) {
        const bankIdx = answer[slot];
        if (typeof bankIdx !== "number") return false;
        const bank = ex.banks[bankIdx];
        if (!bank || bank.correctSlot !== slot) return false;
      }
      return true;
    }
    case "swipe": {
      // answer is an array of "ai"/"real" decisions, one per item, in order
      if (!Array.isArray(answer) || answer.length !== ex.items.length) return false;
      // all must be correct
      return ex.items.every((item, i) => {
        const decision = answer[i];
        const swipeRight = ex.swipeRightIf === "ai";
        const isRight = decision === "ai";
        return swipeRight ? isRight === (item.value === "ai") : isRight === (item.value === "real");
      });
    }
    case "order": {
      if (!Array.isArray(answer) || answer.length !== ex.correctOrder.length)
        return false;
      return ex.correctOrder.every((idx, i) => answer[i] === idx);
    }
    default:
      return false;
  }
}
