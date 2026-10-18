import { getContentForCompetency, saveContent } from "../services/content-store/index";
import { createInitialLearnerState, applyEvidence } from "../services/learner-state/index";
import { evaluateAssessment } from "../services/assessment/index";
import { makeAdaptiveDecision } from "../services/adaptive-engine/index";
import { saveEvidenceAndUpdateLearnerState } from "../services/evidence-store/index";
import { persistenceStore } from "../services/persistence-provider";
import type { LearningContent } from "../packages/content";
import type { LearnerState } from "../packages/domain";

/*
 * Shared driver for the Tranche 4A reproduction tests
 * (repro-4a-*.test.ts). It uses exactly what POST/GET /api/learning
 * use: evaluateAssessment, saveEvidenceAndUpdateLearnerState with
 * applyEvidence, and makeAdaptiveDecision. Nothing is mocked.
 */

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

export async function newLearner(tag: string, competencyId: string): Promise<{ learnerId: string; state: LearnerState }> {
  const learnerId = `learner-repro-4a-${tag}-${crypto.randomUUID()}`;
  await persistenceStore.ensureLearnerExists(learnerId);
  return { learnerId, state: createInitialLearnerState(learnerId, competencyId) };
}

/*
 * What GET /api/learning does with an unchanged learner state. These
 * suites exercise the question path, so a new topic is entered with
 * "Check my knowledge first" (teaching-first, Phase 1); it has no
 * effect once a question has been put. The introduction itself is
 * covered by tests/teaching-first-journey.test.ts.
 */
export function decide(learnerId: string, state: LearnerState, options: { introduce?: boolean } = {}) {
  return makeAdaptiveDecision(
    { learnerId, sessionId: `${learnerId}-session`, learnerState: state },
    { checkKnowledgeFirst: !options.introduce },
  );
}

/* What POST /api/learning does with one answer. */
export async function answer(
  learnerId: string,
  state: LearnerState,
  competencyId: string,
  item: LearningContent,
  response: string,
  interventionId: string | undefined,
) {
  assert(item.assessmentItemId && item.metadata?.expectedResponse !== undefined, `${item.id} is an authored question`);
  const assessment = await evaluateAssessment(
    { learnerId, sessionId: `${learnerId}-session`, interventionId, assessmentItemId: item.assessmentItemId, competencyId, response },
    item.metadata.expectedResponse,
    item.id,
    item.metadata,
  );
  const saved = await saveEvidenceAndUpdateLearnerState(assessment.evidence, competencyId, (current, isNew, history) => {
    const base = current ?? state;
    return isNew ? applyEvidence(base, assessment.evidence, history) : base;
  });
  return { evidence: assessment.evidence, state: saved.learnerState };
}

/* A real wrong option of the item that carries an authored diagnostic rule. */
export function wrongOption(item: LearningContent): string {
  const rules = JSON.parse(item.metadata!.diagnosticRules) as Record<string, unknown>;
  return Object.keys(rules)[0];
}

export function competencyState(state: LearnerState, competencyId: string) {
  return state.competencies.find((item) => item.competencyId === competencyId)!;
}

export function isQuestion(content: LearningContent | undefined): boolean {
  return Boolean(content?.assessmentItemId);
}

/* As buildLearningResponse does on advance: open the next competency in the same state. */
export function openCompetency(state: LearnerState, competencyId: string): LearnerState {
  if (state.competencies.some((item) => item.competencyId === competencyId)) return state;
  const fresh = createInitialLearnerState(state.learnerId, competencyId).competencies[0];
  return { ...state, competencies: [fresh, ...state.competencies], updatedAt: new Date().toISOString() };
}

/*
 * Tranche 4C test fixture. The B4 number-pattern topics now have full
 * content, so no real competency has a tiny pool any more. This hides
 * (in this test process's in-memory content store only) every question
 * of a competency except its original pilot items, to keep testing the
 * tiny-pool behaviour: no deadlock, no manufactured mastery, exhaustion.
 */
export function useTinyPilotPool(competencyId: string): void {
  for (const content of getContentForCompetency(competencyId)) {
    if (content.assessmentItemId && !content.assessmentItemId.startsWith("item-gh-b4-patterns-")) {
      saveContent({ ...content, competencyId: `${competencyId}-hidden-by-test` });
    }
  }
}
