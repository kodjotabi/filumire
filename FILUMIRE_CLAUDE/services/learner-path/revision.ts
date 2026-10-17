import { getCompetenciesForSubject, getCompetency } from "../../packages/curriculum";
import { getSubjectCapability, getSubjectsForGrade } from "../../packages/curriculum-framework";
import type { LearnerCompetencyState } from "../../packages/domain";
import { getLearnerStates } from "../learner-state-store";
import { getLearnerInterventions, isAwaitingInstructionCheck } from "../intervention-store";
import { getEvidenceForLearner } from "../evidence-store";
import { getContentForCompetency } from "../content-store";
import { seedContent } from "../content-store/seed";
import { readAssessmentRecovery } from "../edututor/assessment-recovery";
import { getCurrentCompetencyForSubject, type LearnerLearningContextRecord } from "../learner-context";
import { buildLearnerPath } from "./index";
import { createPathCurriculum } from "./curriculum";
import { mergeCompetencyStates } from "./progression";

const coverage = new Map<string, boolean>();

/*
 * Spaced revision runs for a subject of a supported grade once every
 * topic of that subject and grade has authored, automatically scored
 * retention questions in both English and French. A subject without
 * that coverage keeps immediate retention checks. No scheduler or
 * stored review queue: due dates are derived from learner state.
 */
export function subjectSupportsSpacedRevision(subjectId: string, gradeId: string) {
  const key = `${gradeId}|${subjectId}`;
  const known = coverage.get(key);
  if (known !== undefined) return known;
  seedContent();
  const competencies = getCompetenciesForSubject(subjectId).filter(item => item.learningLevelId === gradeId);
  const supported =
    competencies.length > 0 &&
    getSubjectsForGrade(gradeId).some(subject => subject.id === subjectId) &&
    getSubjectCapability(subjectId)?.status !== "unsupported" &&
    competencies.every(item => (["en", "fr"] as const).every(language =>
      getContentForCompetency(item.id, language).some(content =>
        content.assessmentItemId &&
        content.metadata?.assessmentPurpose === "retention" &&
        content.metadata.expectedResponse !== undefined &&
        content.metadata.evaluationMethod !== "trusted_rubric_evaluation")));
  coverage.set(key, supported);
  return supported;
}

export function supportsSpacedRevision(competencyId: string) {
  const definition = getCompetency(competencyId);
  return Boolean(definition && subjectSupportsSpacedRevision(definition.subjectId, definition.learningLevelId));
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

export type RevisionSummary = {
  subjectId: string;
  due: Array<{ competencyId: string; dueAt: string }>;
  nextDueAt?: string;
  canStart: boolean;
};

async function summarise(learnerId: string, states: LearnerCompetencyState[], gradeId: string, subjectId: string,
  currentCompetencyId: string | undefined, now: Date): Promise<RevisionSummary | undefined> {
  if (!subjectSupportsSpacedRevision(subjectId, gradeId)) return undefined;
  const path = buildLearnerPath({ states, curriculum: createPathCurriculum(subjectId, gradeId), now });
  const due = path.entries.filter(entry => entry.retention === "due")
    .sort((a, b) => (a.retentionDueAt ?? "").localeCompare(b.retentionDueAt ?? ""));
  const current = path.entries.find(entry => entry.competencyId === currentCompetencyId);
  const atBoundary = !current || current.status === "not_started" || current.acquisition === "established";
  const open = due.length ? await unansweredActivities(learnerId, subjectId, currentCompetencyId) : [];
  return {
    subjectId,
    due: due.map(entry => ({ competencyId: entry.competencyId, dueAt: entry.retentionDueAt! })),
    nextDueAt: path.entries.filter(entry => entry.retention !== "due" && entry.retentionDueAt)
      .map(entry => entry.retentionDueAt!).sort()[0],
    // A delivered review can always be resumed; otherwise start only between topics.
    canStart: open.length ? Boolean(reviewToResume(open)) : atBoundary,
  };
}

async function loadStates(learnerId: string) {
  return mergeCompetencyStates(...(await getLearnerStates(learnerId)).map(state => state.competencies));
}

/** One subject's revision summary; undefined when the subject has no spaced revision. */
export async function buildRevisionSummary(learnerId: string, gradeId: string, subjectId: string, currentCompetencyId?: string, now = new Date()) {
  return summarise(learnerId, await loadStates(learnerId), gradeId, subjectId, currentCompetencyId, now);
}

/**
 * Summaries for the given subjects of the learner's stored grade, in that
 * order. Each subject is judged from the topic its learning screen opens on,
 * so "can start" matches what the engine will actually deliver.
 */
export async function buildRevisionSummaries(learnerId: string, context: LearnerLearningContextRecord, subjectIds: string[], now = new Date()) {
  const states = await loadStates(learnerId);
  const summaries: RevisionSummary[] = [];
  for (const subjectId of subjectIds) {
    const summary = await summarise(learnerId, states, context.gradeId, subjectId,
      getCurrentCompetencyForSubject(context, subjectId), now);
    if (summary) summaries.push(summary);
  }
  return summaries;
}

/** The summary the revision card leads with: due work in the active subject first. */
export function primaryRevision(summaries: RevisionSummary[], activeSubjectId: string) {
  const active = summaries.find(item => item.subjectId === activeSubjectId);
  return (active?.due.length ? active : undefined) ?? summaries.find(item => item.due.length) ?? active ?? summaries[0];
}
