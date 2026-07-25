/** Contrato do read model "hoje" do programador, gerado por tools/gen-today.py. */

export type ReviewReason = "overdue" | "due" | "interleaving" | "recurring-trap";

export type DueReview = {
  readonly unitId: string;
  readonly title: string;
  readonly dueIn: string;
  readonly reason: ReviewReason;
  readonly project: string | null;
  readonly gameDir: string | null;
};

export type ActiveUnit = {
  readonly id: string | null;
  readonly title: string | null;
  readonly project: string | null;
  readonly num: string | null;
  readonly state: string | null;
  readonly gameDir: string | null;
  readonly diagnosticFile: string | null;
};

export type TrackStatus = "mastered" | "active" | "available";

export type TrackNode = {
  readonly num: string;
  readonly title: string;
  readonly gameDir: string | null;
  readonly port: number | null;
  readonly status: TrackStatus;
};

export type Streak = {
  readonly current: number;
  readonly longest: number;
  readonly freezesEquipped: number;
  readonly freezesMax: number;
  readonly lastGateDate: string | null;
};

export type TodaySnapshot = {
  readonly asOf: string;
  readonly streak: Streak;
  readonly curr: number;
  readonly activeUnit: ActiveUnit;
  readonly reviews: readonly DueReview[];
  readonly masteredCount: number;
  readonly totalUnits: number;
  readonly nextProjectNum: string | null;
  readonly track: readonly TrackNode[];
};
