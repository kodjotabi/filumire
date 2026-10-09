import type {
  DiagnosticState,
  InterventionType,
} from "../../packages/domain";

import {
  GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
  VALIDATION_INITIAL_COMPETENCY_ID,
  getCompetency,
  getSubject,
} from "../../packages/curriculum";

import { getLearnerState } from "../learner-state-store";
import { getEvidence } from "../evidence-store";
import { getLearnerInterventions } from "../intervention-store";
import { getLearnerLearningContext } from "../learner-context";

export const PARENT_HOME_EXPERIENCE_VERSION =
  "parent-home-v1";

const LEGACY_CANDIDATE_COMPETENCY_IDS = [
  GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
  VALIDATION_INITIAL_COMPETENCY_ID,
];

const DIAGNOSTIC_SUPPORT_MESSAGES: Partial<
  Record<DiagnosticState, string>
> = {
  prerequisite_gap:
    "An earlier skill needs some more attention.",
  conceptual_misunderstanding:
    "The main idea needs some more explanation.",
  procedural_error:
    "The steps of the method need some more practice.",
  misconception:
    "There is a misunderstanding that needs to be cleared up.",
  forgotten_knowledge:
    "A refresher on this learning would help.",
  transfer_failure:
    "More practice using this learning in different situations would help.",
  persistent_difficulty:
    "This learning needs continued support and practice.",
};

const INTERVENTION_FOCUS_MESSAGES: Record<
  InterventionType,
  string
> = {
  diagnose:
    "FILUMIRE is checking what the learner already understands.",
  teach:
    "The learner is working on understanding this topic.",
  practice:
    "The learner is practising this skill.",
  scaffold:
    "The learner is working through this step by step.",
  remediate:
    "The learner is reviewing the idea in another way.",
  reassess:
    "FILUMIRE is checking understanding again.",
  retention_check:
    "FILUMIRE is checking what the learner still remembers.",
  transfer_check:
    "FILUMIRE is checking whether the learner can use this skill in a new situation.",
  teacher_review:
    "A teacher review is needed before this learning can be fully evaluated.",
};

export type ParentAlertLevel =
  | "attention"
  | "positive"
  | "information";

export type ParentAlertType =
  | "support_needed"
  | "retention_support"
  | "transfer_support"
  | "ready_to_advance"
  | "teacher_review"
  | "learning_active";

export interface ParentAlert {
  id: string;
  type: ParentAlertType;
  level: ParentAlertLevel;
  title: string;
  message: string;
}

export interface HomeSupportGuidance {
  id: string;
  title: string;
  guidance: string;
  boundary: string;
}

export interface AdultActivityEntry {
  outcome: string;
  occurredAt: string;
}

export interface AdultLearnerSummary {
  hasActivity: boolean;
  subjectName?: string;
  competencyTitle?: string;
  masteryPercent: number;
  confidencePercent: number;
  evidenceCount: number;
  readyForAdvancement: boolean;
  retentionStatus?: string;
  transferStatus?: string;
  needsSupport?: string;
  nextFocus?: string;
  recentActivity: AdultActivityEntry[];

  parentExperienceVersion?: string;
  strengths?: string[];
  supportAreas?: string[];
  homeSupport?: HomeSupportGuidance[];
  alerts?: ParentAlert[];
}

function friendlyRetentionStatus(
  status?: string,
): string | undefined {
  switch (status) {
    case "retained":
      return "This learning is being remembered well.";

    case "not_retained":
      return "This learning needs more practice to help it stay remembered.";

    case "pending":
      return "FILUMIRE is checking how well this learning is being remembered.";

    default:
      return undefined;
  }
}

function friendlyTransferStatus(
  status?: string,
): string | undefined {
  switch (status) {
    case "demonstrated":
      return "The learner can use this learning in a new situation.";

    case "not_demonstrated":
      return "The learner needs more practice using this learning in different situations.";

    case "pending":
      return "FILUMIRE is checking whether this learning can be used in a new situation.";

    default:
      return undefined;
  }
}

function emptySummary(): AdultLearnerSummary {
  return {
    hasActivity: false,
    masteryPercent: 0,
    confidencePercent: 0,
    evidenceCount: 0,
    readyForAdvancement: false,
    recentActivity: [],
    parentExperienceVersion:
      PARENT_HOME_EXPERIENCE_VERSION,
    strengths: [],
    supportAreas: [],
    homeSupport: [],
    alerts: [],
  };
}

function buildHomeSupport(
  input: {
    diagnosticState: DiagnosticState;
    retentionStatus?: string;
    transferStatus?: string;
    competencyTitle?: string;
  },
): HomeSupportGuidance[] {
  const guidance: HomeSupportGuidance[] = [];

  const topic =
    input.competencyTitle ?? "this learning";

  switch (input.diagnosticState) {
    case "prerequisite_gap":
      guidance.push({
        id: "review-earlier-learning",
        title: "Review the foundation",
        guidance:
          `Ask the learner to explain an earlier idea connected to ${topic}. Keep it relaxed and let them show what they remember.`,
        boundary:
          "You do not need to teach or score the learner. FILUMIRE will decide what learning should come next.",
      });
      break;

    case "conceptual_misunderstanding":
    case "misconception":
      guidance.push({
        id: "explain-in-own-words",
        title: "Talk about the idea",
        guidance:
          `Ask the learner to explain ${topic} in their own words. Listen for their reasoning rather than giving them the answer immediately.`,
        boundary:
          "This conversation supports learning but does not determine mastery or progression.",
      });
      break;

    case "procedural_error":
      guidance.push({
        id: "talk-through-steps",
        title: "Talk through the steps",
        guidance:
          "Ask the learner to describe the steps they would use. Encourage them to slow down and explain one step at a time.",
        boundary:
          "FILUMIRE remains responsible for evaluating whether the skill has been mastered.",
      });
      break;

    case "forgotten_knowledge":
      guidance.push({
        id: "short-refresh",
        title: "Try a short refresher",
        guidance:
          `Have a brief conversation about ${topic} and ask what the learner remembers without turning it into a test.`,
        boundary:
          "Home support is practice, not formal evidence of mastery.",
      });
      break;

    case "transfer_failure":
      guidance.push({
        id: "everyday-example",
        title: "Find an everyday example",
        guidance:
          `Look for a simple everyday situation where ${topic} could be used and ask the learner how they might apply it.`,
        boundary:
          "FILUMIRE will separately evaluate whether the learner can transfer the skill.",
      });
      break;

    case "persistent_difficulty":
      guidance.push({
        id: "encourage-small-step",
        title: "Keep support light",
        guidance:
          "Encourage one short attempt at a time. Avoid long practice sessions or pressure when the learner is already struggling.",
        boundary:
          "Persistent difficulty should be handled by FILUMIRE's adaptive system and, where needed, the teacher.",
      });
      break;

    default:
      guidance.push({
        id: "ask-what-learned",
        title: "Ask what they learned",
        guidance:
          `Invite the learner to tell you something they learned about ${topic}. Let them explain it in their own way.`,
        boundary:
          "There is no need to grade the answer. FILUMIRE handles formal learning decisions.",
      });
      break;
  }

  if (input.retentionStatus === "not_retained") {
    guidance.push({
      id: "retention-revisit",
      title: "Revisit it briefly",
      guidance:
        "Return to this learning for a few minutes on another day rather than doing one long practice session.",
      boundary:
        "FILUMIRE will perform the formal retention check.",
    });
  }

  if (input.transferStatus === "not_demonstrated") {
    guidance.push({
      id: "transfer-example",
      title: "Use another example",
      guidance:
        "Ask where this skill might appear outside the original lesson. A familiar home or community example is enough.",
      boundary:
        "This activity supports transfer but does not itself prove transfer.",
    });
  }

  return guidance.slice(0, 3);
}

function buildAlerts(
  input: {
    diagnosticState: DiagnosticState;
    readyForAdvancement: boolean;
    retentionStatus?: string;
    transferStatus?: string;
    latestInterventionType?: InterventionType;
    supportMessage?: string;
  },
): ParentAlert[] {
  const alerts: ParentAlert[] = [];

  if (input.readyForAdvancement) {
    alerts.push({
      id: "ready-to-advance",
      type: "ready_to_advance",
      level: "positive",
      title: "Good progress",
      message:
        "FILUMIRE currently considers this learning ready to move forward.",
    });
  }

  if (input.retentionStatus === "not_retained") {
    alerts.push({
      id: "retention-support",
      type: "retention_support",
      level: "attention",
      title: "A little revision would help",
      message:
        "The learner understood this before, but needs help keeping it remembered.",
    });
  }

  if (input.transferStatus === "not_demonstrated") {
    alerts.push({
      id: "transfer-support",
      type: "transfer_support",
      level: "attention",
      title: "More real-world practice would help",
      message:
        "The learner needs more practice using this learning in a different situation.",
    });
  }

  if (
    input.supportMessage &&
    !input.readyForAdvancement
  ) {
    alerts.push({
      id: "learning-support",
      type: "support_needed",
      level: "attention",
      title: "Support is useful here",
      message: input.supportMessage,
    });
  }

  if (
    input.latestInterventionType ===
    "teacher_review"
  ) {
    alerts.push({
      id: "teacher-review",
      type: "teacher_review",
      level: "information",
      title: "Teacher review",
      message:
        "A teacher review is needed for this learning. No parent action is required.",
    });
  }

  return alerts.slice(0, 3);
}

/*
 * Parent-facing read-only projection of trusted learner
 * state. It translates internal learning intelligence
 * into plain-language supervision information.
 *
 * It never creates evidence, changes learner state,
 * computes mastery, or overrides adaptive policy.
 */
export async function buildAdultLearnerSummary(
  learnerId: string,
): Promise<AdultLearnerSummary> {
  let learnerState;

  const context =
    await getLearnerLearningContext(learnerId);

  if (context?.activeCompetencyId) {
    learnerState = await getLearnerState(
      learnerId,
      context.activeCompetencyId,
    );
  }

  if (!learnerState) {
    for (
      const candidateId of
      LEGACY_CANDIDATE_COMPETENCY_IDS
    ) {
      learnerState = await getLearnerState(
        learnerId,
        candidateId,
      );

      if (learnerState) {
        break;
      }
    }
  }

  if (
    !learnerState ||
    learnerState.competencies.length === 0
  ) {
    return emptySummary();
  }

  const activeCompetency =
    learnerState.competencies[0];

  const competencyDefinition = getCompetency(
    activeCompetency.competencyId,
  );

  const subject = competencyDefinition
    ? getSubject(competencyDefinition.subjectId)
    : undefined;

  const [evidence, interventions] =
    await Promise.all([
      getEvidence(
        learnerId,
        activeCompetency.competencyId,
      ),
      getLearnerInterventions(
        learnerId,
        activeCompetency.competencyId,
      ),
    ]);

  const recentActivity = evidence
    .slice()
    .sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    )
    .slice(-5)
    .reverse()
    .map((item) => ({
      outcome: item.outcome,
      occurredAt: item.timestamp,
    }));

  const latestIntervention = interventions
    .slice()
    .sort((a, b) =>
      a.startedAt.localeCompare(b.startedAt),
    )
    .at(-1);

  const retentionStatus =
    activeCompetency.retentionState?.status;

  const transferStatus =
    activeCompetency.transferState?.status;

  const supportMessage =
    DIAGNOSTIC_SUPPORT_MESSAGES[
      activeCompetency.diagnosticState
    ];

  const strengths: string[] = [];

  if (activeCompetency.readinessState?.readyForAdvancement) {
    strengths.push(
      "Current learning is ready to progress.",
    );
  }

  if (retentionStatus === "retained") {
    strengths.push(
      "The learner is remembering this learning well.",
    );
  }

  if (transferStatus === "demonstrated") {
    strengths.push(
      "The learner can use this learning in a new situation.",
    );
  }

  const supportAreas = [
    supportMessage,
    retentionStatus === "not_retained"
      ? "Remembering the learning over time."
      : undefined,
    transferStatus === "not_demonstrated"
      ? "Using the learning in different situations."
      : undefined,
  ].filter(
    (value): value is string => Boolean(value),
  );

  return {
    hasActivity: true,
    subjectName: subject?.name,
    competencyTitle:
      competencyDefinition?.title,
    masteryPercent: Math.round(
      activeCompetency.masteryEstimate * 100,
    ),
    confidencePercent: Math.round(
      activeCompetency.confidence * 100,
    ),
    evidenceCount:
      activeCompetency.evidenceCount,
    readyForAdvancement:
      activeCompetency.readinessState
        ?.readyForAdvancement ?? false,
    retentionStatus:
      friendlyRetentionStatus(
        retentionStatus,
      ),
    transferStatus:
      friendlyTransferStatus(
        transferStatus,
      ),
    needsSupport: supportMessage,
    nextFocus: latestIntervention
      ? INTERVENTION_FOCUS_MESSAGES[
          latestIntervention.type
        ]
      : undefined,
    recentActivity,

    parentExperienceVersion:
      PARENT_HOME_EXPERIENCE_VERSION,
    strengths,
    supportAreas,
    homeSupport: buildHomeSupport({
      diagnosticState:
        activeCompetency.diagnosticState,
      retentionStatus,
      transferStatus,
      competencyTitle:
        competencyDefinition?.title,
    }),
    alerts: buildAlerts({
      diagnosticState:
        activeCompetency.diagnosticState,
      readyForAdvancement:
        activeCompetency.readinessState
          ?.readyForAdvancement ?? false,
      retentionStatus,
      transferStatus,
      latestInterventionType:
        latestIntervention?.type,
      supportMessage,
    }),
  };
}

