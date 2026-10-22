import { seedContent } from "../services/content-store/seed";
import { getAllCompetencies, getCompetency } from "../packages/curriculum/index";
import { createInitialLearnerState, getLearnerState, saveLearnerState } from "../services/learner-state/index";
import { persistenceStore } from "../services/persistence-provider";
import { buildTeacherLearnerSummary } from "../services/teacher-summary/index";
import { currentTopicRoute } from "./fixtures/current-topic-route";
import { acknowledgeIntervention } from "../services/intervention-store/index";
import { CONTENT_EXHAUSTED_REASON_CODE } from "../services/adaptive-engine/index";
import {
  choosePrerequisiteRepair,
  chooseNextCompetency,
  CONTENT_EXHAUSTED_NEEDS_SUPPORT,
} from "../services/learner-path/progression";
import type { LearnerCompetencyState } from "../packages/domain";
import { assert, newLearner, decide, answer, isQuestion } from "./repro-4a-helpers";

/*
 * TRANCHE 4D: prerequisite repair.
 * Before: a learner placed on a competency whose prerequisites are not
 * completed got scaffold / PREREQUISITE_NOT_SATISFIED on every turn,
 * even at mastery 0.9, until the questions ran out.
 * Now: strong evidence on the competency itself lets the learner go on;
 * otherwise the learner is sent to the missing prerequisite (deepest
 * ready one first) and the competency is resumed afterwards.
 *
 * Run: npx tsx --env-file=.env.local tests/prerequisite-repair-4d.test.ts
 */

seedContent();

let passed = 0;
function check(condition: unknown, message: string): void {
  assert(condition, message);
  passed += 1;
}

const P1 = "competency-gh-math-b4-number-patterns-001";
const P2 = "competency-gh-math-b4-number-patterns-002";
const P3 = "competency-gh-math-b4-number-patterns-003";
const NOW = new Date().toISOString();

function base(learnerId: string, id: string, extra: Partial<LearnerCompetencyState> = {}): LearnerCompetencyState {
  return { ...createInitialLearnerState(learnerId, id).competencies[0], ...extra };
}

function completed(learnerId: string, id: string): LearnerCompetencyState {
  return base(learnerId, id, {
    masteryEstimate: 0.95, confidence: 0.9, evidenceCount: 8, diagnosticState: "probable_mastery", masteredAt: NOW,
    retentionState: { status: "retained", confidence: 0.9 } as LearnerCompetencyState["retentionState"],
    transferState: { status: "demonstrated", confidence: 0.9 } as LearnerCompetencyState["transferState"],
    readinessState: { readyForAdvancement: true, confidence: 0.9, reasonCode: "MASTERY_RETENTION_TRANSFER_CONFIRMED", evaluatedAt: NOW },
  });
}

function planner(): void {
  const L = "learner-4d-plan";
  check(choosePrerequisiteRepair({ currentCompetencyId: P3, states: [] }) === P1, "chain 001 -> 002 -> 003: repair starts at the deepest ready prerequisite (001)");
  check(choosePrerequisiteRepair({ currentCompetencyId: P3, states: [completed(L, P1)] }) === P2, "001 done: repair 002");
  check(choosePrerequisiteRepair({ currentCompetencyId: P3, states: [completed(L, P1), completed(L, P2)] }) === undefined, "all prerequisites done: no repair");

  const exhausted = base(L, P1, { evidenceCount: 6, readinessState: { readyForAdvancement: false, confidence: 0.4, reasonCode: CONTENT_EXHAUSTED_NEEDS_SUPPORT, evaluatedAt: NOW } });
  check(choosePrerequisiteRepair({ currentCompetencyId: P3, states: [exhausted] }) === undefined, "exhausted prerequisite (retry not due): no repair target");
  check(choosePrerequisiteRepair({ currentCompetencyId: P3, states: [exhausted], retryable: new Set([P1]) }) === P1, "exhausted prerequisite with retry due: repair it");

  const multi = getAllCompetencies().find((item) => item.prerequisiteCompetencyIds.length > 1 && item.prerequisiteCompetencyIds.every((id) => (getCompetency(id)?.prerequisiteCompetencyIds.length ?? 1) === 0));
  if (multi) {
    const [first, second] = multi.prerequisiteCompetencyIds;
    check(choosePrerequisiteRepair({ currentCompetencyId: multi.id, states: [completed(L, first)] }) === second, `${multi.id}: second missing prerequisite chosen`);
  }

  /* After the repair the original competency is resumed (it is a successor and now unlocked). */
  const back = chooseNextCompetency({ currentCompetencyId: P2, states: [completed(L, P1), completed(L, P2), base(L, P3, { evidenceCount: 4, masteryEstimate: 0.5, confidence: 0.4 })], currentCompleted: true });
  check(back.competencyId === P3, `after repairing 002 the learner returns to 003 (${back.competencyId} ${back.reasonCode})`);
}

async function engine(): Promise<void> {
  /* Struggling on 003 with nothing before it completed: sent to 001, not scaffolded in a loop. */
  {
    const { learnerId } = await newLearner("4d-struggle", P3);
    const state = { ...createInitialLearnerState(learnerId, P3), competencies: [base(learnerId, P3, { evidenceCount: 4, masteryEstimate: 0.5, confidence: 0.5, diagnosticState: "insufficient_evidence" })] };
    const d = await decide(learnerId, state);
    check(d.decision.action === "advance" && d.decision.reasonCode === "PREREQUISITE_REPAIR", `engine: missing prerequisite -> repair (${d.decision.action}/${d.decision.reasonCode})`);
    check(d.decision.competencyId === P1 && d.nextCompetency === P1, `engine: repair target is 001 (${d.decision.competencyId})`);
  }

  /* Strong evidence on 003 itself: not held back by the prerequisite check. */
  {
    const { learnerId } = await newLearner("4d-strong", P3);
    const state = { ...createInitialLearnerState(learnerId, P3), competencies: [base(learnerId, P3, { evidenceCount: 5, masteryEstimate: 0.95, confidence: 0.9, diagnosticState: "probable_mastery" })] };
    const d = await decide(learnerId, state);
    check(d.decision.action === "retention_check", `engine: mastery gate met -> retention check, no scaffold (${d.decision.action}/${d.decision.reasonCode})`);
  }

  /* The 4C finding: a perfect learner placed on 002 without 001 now finishes 002 instead of exhausting it. */
  {
    let { learnerId, state } = await newLearner("4d-placed", P2);
    let final;
    let scaffolds = 0;
    for (let i = 0; i < 40 && !final; i++) {
      const d = await decide(learnerId, state);
      if (d.decision.reasonCode === "PREREQUISITE_NOT_SATISFIED") scaffolds += 1;
      if (d.decision.action === "advance" || d.decision.action === "complete") { final = d; break; }
      if (!isQuestion(d.content)) { await acknowledgeIntervention({ interventionId: d.decision.interventionId!, learnerId, competencyId: P2 }); continue; }
      state = (await answer(learnerId, state, P2, d.content!, d.content!.metadata!.expectedResponse, d.decision.interventionId)).state;
    }
    check(final && final.decision.reasonCode !== CONTENT_EXHAUSTED_REASON_CODE, `engine: placed perfect learner does not exhaust (${final?.decision.reasonCode})`);
    check(final?.decision.reasonCode === "MASTERY_RETENTION_TRANSFER_CONFIRMED" || final?.decision.reasonCode === "PREREQUISITE_REPAIR", `engine: placed learner completes or is repaired (${final?.decision.reasonCode})`);
    check(scaffolds <= 1, `engine: no prerequisite scaffold loop (${scaffolds})`);
  }
}

/* Tranche 4G: the repair is stored (also through the real route) and teachers see it. */
async function persisted(): Promise<void> {
  const learnerId = `learner-4g-route-${Date.now()}`;
  await persistenceStore.ensureLearnerExists(learnerId);
  const struggling = base(learnerId, P3, { evidenceCount: 4, masteryEstimate: 0.5, confidence: 0.5, diagnosticState: "insufficient_evidence" });
  await saveLearnerState({ ...createInitialLearnerState(learnerId, P3), competencies: [struggling] });

  const route = await currentTopicRoute(learnerId, P3);
  const response = await route.get();
  check(response.status === 200, `route: GET 200 (${response.status})`);
  const body = (await response.json()) as { decision: { action: string; reasonCode: string; competencyId: string } };
  check(body.decision.action === "advance" && body.decision.reasonCode === "PREREQUISITE_REPAIR" && body.decision.competencyId === P1, `route: repair to 001 (${body.decision.action}/${body.decision.reasonCode} ${body.decision.competencyId})`);

  const stored = await getLearnerState(learnerId, P3);
  const p3 = stored?.competencies.find((item) => item.competencyId === P3);
  check(p3?.prerequisiteRepair?.repairCompetencyId === P1, "route: repair record survives the advance save (not overwritten by the pre-decision copy)");
  check(stored?.competencies[0].competencyId === P1, `route: 001 is now the learner's current competency (${stored?.competencies[0].competencyId})`);

  const summary = await buildTeacherLearnerSummary(learnerId);
  const item = summary.attentionQueue.find((entry) => entry.competencyId === P3);
  check(item?.prerequisiteRepair?.competencyId === P1 && item.prerequisiteRepair.completed === false, "teacher: repair shown, in progress");
  check(item?.attentionReasons.includes("prerequisite_repair_in_progress"), "teacher: in-progress repair is in the attention queue");

  /* Once 001 is completed the repair shows as done and leaves the queue. */
  const after = { ...stored!, competencies: stored!.competencies.map((entry) => (entry.competencyId === P1 ? completed(learnerId, P1) : entry)) };
  await saveLearnerState(after);
  const later = await buildTeacherLearnerSummary(learnerId);
  const detail = later.subjects.flatMap((subject) => subject.competencies).find((entry) => entry.competencyId === P3);
  check(detail?.prerequisiteRepair?.completed === true, "teacher: repair shown as done once the prerequisite is completed");
  check(!detail?.attentionReasons.includes("prerequisite_repair_in_progress"), "teacher: done repair no longer needs attention");
}

(async () => {
  planner();
  await engine();
  await persisted();
  console.log(`PASS prerequisite-repair-4d (${passed} checks)`);
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
