import type { LessonClosure } from "../../../packages/contracts/lesson-closure";
import type { LearningResponse } from "./learning-client";

export type NextStepKind = "check" | "targeted" | "reinforce" | "prerequisite" | "retention" | "transfer" | "progress" | "finished" | "support" | "continue";
/** Translate the existing server decision, never choose or authorize another one. */
export function closureNextStep(decision: LearningResponse["decision"]): NextStepKind {
  if (decision.reasonCode === "PREREQUISITE_REPAIR") return "prerequisite";
  if (["NO_ELIGIBLE_COMPETENCY_NEEDS_SUPPORT", "CONTENT_EXHAUSTED_NEEDS_SUPPORT"].includes(decision.reasonCode)) return "support";
  switch (decision.action) {
    case "retention_check": return "retention";
    case "transfer_check": return "transfer";
    case "teach": case "remediate": return "reinforce";
    case "practice": case "scaffold": return "targeted";
    case "reassess": case "diagnose": return "check";
    case "advance": return "progress";
    case "teacher_review": return "support";
    case "complete": return decision.reasonCode === "LEARNING_PATH_COMPLETE" ? "finished" : "support";
    default: return "continue";
  }
}
export function closureReview(closure: LessonClosure): "strong" | "partial" | "errors" | "unknown" {
  // This describes evidence only. It cannot replace the engine's next action.
  if (closure.evidence.attempts === 0) return "unknown";
  if (closure.evidence.consecutiveErrors > 1) return "errors";
  if (closure.evidence.acquisition === "established") return "strong";
  if (closure.evidence.hasIdentifiedDifficulties) return "errors";
  if (closure.evidence.acquisition === "emerging" || closure.evidence.partial > 0) return "partial";
  return "unknown";
}
