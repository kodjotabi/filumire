import { GHANA_MATH_PILOT_LEVEL_ID, GHANA_MATH_PILOT_SUBJECT_ID, getCompetency } from "../../packages/curriculum";
import { getLearnerStates } from "../learner-state-store";
import { getLearnerInterventions, isAwaitingInstructionCheck } from "../intervention-store";
import { getEvidenceForLearner } from "../evidence-store";
import { readAssessmentRecovery } from "../edututor/assessment-recovery";
import { buildLearnerPath } from "./index";
import { createPathCurriculum } from "./curriculum";
import { mergeCompetencyStates } from "./progression";

/** Initial learner-facing rollout; no new scheduler or stored review queue. */
export function supportsSpacedRevision(competencyId: string) {
  const definition = getCompetency(competencyId);
  return definition?.subjectId === GHANA_MATH_PILOT_SUBJECT_ID && definition.learningLevelId === GHANA_MATH_PILOT_LEVEL_ID;
}

/**
 * Delivered, unanswered activities a due review must not interrupt: work on
 * the current topic, and any delivered review (resumed rather than restarted).
 * Activities left open on topics the learner has moved away from are kept
 * as they are, but no longer hold back reviews, since the engine only
 * closes superseded activities within one topic.
 */
export async function unansweredActivities(learnerId: string, subjectId: string, currentCompetencyId?: string) {
  const [interventions, evidence, recovery] = await Promise.all([
    getLearnerInterventions(learnerId), getEvidenceForLearner(learnerId), readAssessmentRecovery(learnerId),
  ]);
  const answered = new Set(evidence.map(item => item.interventionId));
  return interventions.filter(item =>
    getCompetency(item.competencyId)?.subjectId === subjectId &&
    (item.competencyId === currentCompetencyId || item.type === "retention_check") &&
    (item.status === "active" || isAwaitingInstructionCheck(item)) &&
    !answered.has(item.interventionId) && !recovery.recovered(item));
}

/** The most recently delivered open review, when no current-topic work is open. */
export function reviewToResume(open: Awaited<ReturnType<typeof unansweredActivities>>) {
  if (open.some(item => item.type !== "retention_check")) return undefined;
  return [...open].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
}

export async function buildRevisionSummary(learnerId: string, gradeId: string, currentCompetencyId?: string, now = new Date()) {
  if (gradeId !== GHANA_MATH_PILOT_LEVEL_ID) return undefined;
  const states = mergeCompetencyStates(...(await getLearnerStates(learnerId)).map(state => state.competencies));
  const path = buildLearnerPath({ states, curriculum: createPathCurriculum(GHANA_MATH_PILOT_SUBJECT_ID, gradeId), now });
  const due = path.entries.filter(entry => entry.retention === "due")
    .sort((a, b) => (a.retentionDueAt ?? "").localeCompare(b.retentionDueAt ?? ""));
  const current = path.entries.find(entry => entry.competencyId === currentCompetencyId);
  const atBoundary = !current || current.status === "not_started" || current.acquisition === "established";
  const open = due.length ? await unansweredActivities(learnerId, GHANA_MATH_PILOT_SUBJECT_ID, currentCompetencyId) : [];
  return {
    subjectId: GHANA_MATH_PILOT_SUBJECT_ID,
    due: due.map(entry => ({ competencyId: entry.competencyId, dueAt: entry.retentionDueAt! })),
    nextDueAt: path.entries.filter(entry => entry.retention !== "due" && entry.retentionDueAt)
      .map(entry => entry.retentionDueAt!).sort()[0],
    // A delivered review can always be resumed; otherwise start only between topics.
    canStart: open.length ? Boolean(reviewToResume(open)) : atBoundary,
  };
}
