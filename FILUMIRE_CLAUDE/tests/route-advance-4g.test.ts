import { seedContent } from "../services/content-store/seed";
import { getContentForCompetency } from "../services/content-store/index";
import { createInitialLearnerState, getLearnerState, saveLearnerState } from "../services/learner-state/index";
import { getEvidence, saveEvidence } from "../services/evidence-store/index";
import { persistenceStore } from "../services/persistence-provider";
import { getCompetency } from "../packages/curriculum/index";
import { CONTENT_EXHAUSTED_NEEDS_SUPPORT } from "../services/learner-path/progression";
import { currentTopicRoute } from "./fixtures/current-topic-route";
import type { LearnerCompetencyState, LearningEvidence } from "../packages/domain";
import { useTinyPilotPool } from "./repro-4a-helpers";

/*
 * TRANCHE 4G: advancing through the real learning route.
 * Found in 4G: every "advance" failed with HTTP 500 because the engine
 * attached content of the competency being LEFT while the decision named
 * the next one (instruction generation rejects the mismatch). A learner
 * who finished a topic could not move on in the app. No route test had
 * ever reached an advance. Also: the route saved its pre-decision copy of
 * the state on advance, overwriting markers the engine had just written.
 *
 * Run: npx tsx --env-file=.env.local tests/route-advance-4g.test.ts
 */

seedContent();
useTinyPilotPool("competency-gh-math-b4-number-patterns-001");

let passed = 0;
function check(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed += 1;
}

const SUBJECT = "subject-gh-basic-4-mathematics-pilot";
const P1 = "competency-gh-math-b4-number-patterns-001";
const NOW = new Date().toISOString();

function base(learnerId: string, id: string, extra: Partial<LearnerCompetencyState> = {}): LearnerCompetencyState {
  return { ...createInitialLearnerState(learnerId, id).competencies[0], ...extra };
}

async function get(route: Awaited<ReturnType<typeof currentTopicRoute>>, selectedTopic?: string) {
  const response = await route.get(selectedTopic);
  const body = (await response.json()) as { decision?: { action: string; reasonCode: string; competencyId: string }; content?: { competencyId: string }; nextCompetency?: string; error?: string };
  return { status: response.status, body };
}

async function masteryAdvance(): Promise<void> {
  const learnerId = `learner-4g-advance-${Date.now()}`;
  await persistenceStore.ensureLearnerExists(learnerId);
  const done = base(learnerId, P1, {
    masteryEstimate: 0.95, confidence: 0.9, evidenceCount: 8, diagnosticState: "probable_mastery", masteredAt: NOW,
    retentionState: { status: "retained", confidence: 0.9 } as LearnerCompetencyState["retentionState"],
    transferState: { status: "demonstrated", confidence: 0.9 } as LearnerCompetencyState["transferState"],
    readinessState: { readyForAdvancement: true, confidence: 0.9, reasonCode: "MASTERY_RETENTION_TRANSFER_CONFIRMED", evaluatedAt: NOW },
  });
  await saveLearnerState({ ...createInitialLearnerState(learnerId, P1), competencies: [done] });

  const route = await currentTopicRoute(learnerId, P1);
  const { status, body } = await get(route);
  check(status === 200, `mastery advance: route 200 (was 500 before 4G) (${status} ${body.error ?? ""})`);
  check(body.decision?.action === "advance" && body.decision.reasonCode === "MASTERY_RETENTION_TRANSFER_CONFIRMED", `mastery advance: decision (${body.decision?.action}/${body.decision?.reasonCode})`);
  check(!body.content || body.content.competencyId === body.decision?.competencyId, "mastery advance: content belongs to the next competency");
  check(getCompetency(body.decision!.competencyId)?.subjectId === SUBJECT, "mastery advance: stays in the subject");
  const stored = await getLearnerState(learnerId, body.decision!.competencyId);
  check(stored?.competencies[0].competencyId === body.decision!.competencyId, "mastery advance: next competency is now current");

  const again = await get(route);
  check(again.status === 200 && again.body.decision?.competencyId === body.decision!.competencyId, `next request works on the new competency (${again.status} ${again.body.decision?.action})`);
  const evidenceBefore = await getEvidence(learnerId, P1);
  const revisit = await get(route, P1);
  check(revisit.status === 200 && revisit.body.decision?.action === "teach" && revisit.body.decision.reasonCode === "TOPIC_REVISIT", "explicit topic selection still teaches a mastered topic again");
  check(revisit.body.decision?.competencyId === P1 && revisit.body.content?.competencyId === P1, "revisit teaches the selected topic, not its successor");
  check((await getLearnerState(learnerId, P1))!.competencies.find((item) => item.competencyId === P1)!.masteryEstimate === done.masteryEstimate, "revisit preserves earned mastery");
  check(JSON.stringify(await getEvidence(learnerId, P1)) === JSON.stringify(evidenceBefore), "revisit creates no assessment evidence");
}

async function exhaustedAdvance(): Promise<void> {
  const learnerId = `learner-4g-exhausted-${Date.now()}`;
  await persistenceStore.ensureLearnerExists(learnerId);
  let n = 0;
  for (const content of getContentForCompetency(P1).filter((item) => item.assessmentItemId)) {
    for (let k = 1; k <= 2; k++) {
      n += 1;
      await saveEvidence({ id: `ev-4g-${learnerId}-${n}`, learnerId, competencyId: P1, source: "assessment", outcome: k === 2 ? "correct" : "incorrect", timestamp: new Date(Date.now() - 3600_000 + n * 1000).toISOString(), policyVersion: "test", assessmentItemId: content.assessmentItemId!, exposureCount: k } as LearningEvidence);
    }
  }
  await saveLearnerState({ ...createInitialLearnerState(learnerId, P1), competencies: [base(learnerId, P1, { evidenceCount: 4, masteryEstimate: 0.3, confidence: 0.4, diagnosticState: "insufficient_evidence" })] });

  const route = await currentTopicRoute(learnerId, P1);
  const { status, body } = await get(route);
  check(status === 200, `exhausted advance: route 200 (${status} ${body.error ?? ""})`);
  check(body.decision?.reasonCode === "CONTENT_EXHAUSTED_NEEDS_SUPPORT", `exhausted advance: decision (${body.decision?.action}/${body.decision?.reasonCode})`);
  const stored = await getLearnerState(learnerId, P1);
  const p1 = stored?.competencies.find((item) => item.competencyId === P1);
  check(p1?.readinessState?.reasonCode === CONTENT_EXHAUSTED_NEEDS_SUPPORT, "exhausted advance: needs-support marker survives the advance save");
  if (body.decision?.action === "advance") {
    check(!getCompetency(body.decision.competencyId)!.prerequisiteCompetencyIds.includes(P1), "exhausted advance: next does not depend on the exhausted topic");
  }
}

(async () => {
  await masteryAdvance();
  await exhaustedAdvance();
  console.log(`PASS route-advance-4g (${passed} checks)`);
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
