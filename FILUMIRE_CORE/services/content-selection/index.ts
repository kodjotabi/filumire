import type {
  AdaptiveAction,
  LearnerState,
} from "../../packages/domain";
import type { LearningContent } from "../../packages/content";
import { getContentForCompetency } from "../content-store";

export function selectLearningContent(
  learnerState: LearnerState,
  action: AdaptiveAction,
): LearningContent | undefined {
  const competency = learnerState.competencies[0];

  if (!competency) {
    return undefined;
  }

  const availableContent = getContentForCompetency(
    competency.competencyId,
  );

  const preferredTypes: Record<AdaptiveAction, LearningContent["type"][]> = {
    diagnose: ["assessment", "practice"],
    teach: ["lesson", "example"],
    practice: ["practice", "example"],
    scaffold: ["scaffold", "example"],
    remediate: ["remediation", "lesson"],
    reassess: ["assessment"],
    advance: ["lesson", "practice"],
    teacher_review: ["lesson"],
  };

  const types = preferredTypes[action];

  return (
    availableContent.find((content) => types.includes(content.type)) ??
    availableContent[0]
  );
}