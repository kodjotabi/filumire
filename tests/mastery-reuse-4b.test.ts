import { seedContent } from "../services/content-store/seed";
import { acknowledgeIntervention } from "../services/intervention-store/index";
import { getEvidence } from "../services/evidence-store/index";
import { getLearnerState } from "../services/learner-state/index";
import { evaluateMastery, MASTERY_V1_POLICY } from "../services/mastery/index";
import { diagnoseEvidence } from "../services/diagnosis/index";
import { DEFAULT_PATH_POLICY } from "../services/learner-path/index";
import { CONTENT_EXHAUSTED_REASON_CODE } from "../services/adaptive-engine/index";
import type { LearningEvidence, LearnerState } from "../packages/domain";
import { assert, newLearner, decide, answer, wrongOption, competencyState, isQuestion, useTinyPilotPool } from "./repro-4a-helpers";

/*
 * TRANCHE 4B STEP 3: mastery-v2 (Option B) and controlled question reuse.
 *
 * Part A drives the real engine (same calls as GET/POST /api/learning).
 * Part B checks evaluateMastery directly for the evidence patterns the
 * engine cannot be steered into precisely.
 *
 * Run: npx tsx --env-file=.env.local tests/mastery-reuse-4b.test.ts
 */

seedContent();
/* Tranche 4C: number-patterns-001 now has full content; keep a genuine two-item pool for the tiny-pool checks. */
useTinyPilotPool("competency-gh-math-b4-number-patterns-001");

const EN = "competency-gh-english-b5-3-5-1-1";
const MA = "competency-gh-math-b5-1-1-1-1";
const TINY = "competency-gh-math-b4-number-patterns-001";

let passed = 0;
function check(condition: unknown, message: string): void {
  assert(condition, message);
  passed += 1;
}

interface Step {
  action: string;
  purpose?: string;
  correct: boolean;
  repeated: boolean;
  mastery: number;
  confidence: number;
}

interface Run {
  learnerId: string;
  state: LearnerState;
  steps: Step[];
  cards: number;
  final?: { action: string; reasonCode: string };
}

/* Answers every question; wrongAt(n) decides which answers are wrong. */
async function drive(tag: string, competencyId: string, wrongAt: (n: number) => boolean, maxSteps = 40): Promise<Run> {
  let { learnerId, state } = await newLearner(`m4b-${tag}`, competencyId);
  const steps: Step[] = [];
  let cards = 0;
  let n = 0;
  for (let i = 0; i < maxSteps; i++) {
    const d = await decide(learnerId, state);
    if (d.decision.action === "advance" || d.decision.action === "complete") {
      return { learnerId, state, steps, cards, final: { action: d.decision.action, reasonCode: d.decision.reasonCode } };
    }
    if (!isQuestion(d.content)) {
      const ack = await acknowledgeIntervention({ interventionId: d.decision.interventionId!, learnerId, competencyId });
      assert(ack.status === "acknowledged", `${tag}: card acknowledged (${ack.status})`);
      cards += 1;
      continue;
    }
    const wrong = wrongAt(n++);
    const res = await answer(learnerId, state, competencyId, d.content!, wrong ? wrongOption(d.content!) : d.content!.metadata!.expectedResponse, d.decision.interventionId);
    state = res.state;
    const c = competencyState(state, competencyId);
    steps.push({
      action: d.decision.action,
      purpose: d.content!.metadata?.assessmentPurpose,
      correct: !wrong,
      repeated: (res.evidence.exposureCount ?? 1) > 1,
      mastery: c.masteryEstimate,
      confidence: c.confidence,
    });
  }
  return { learnerId, state, steps, cards };
}

function reachedGate(step: Step): boolean {
  return step.mastery >= 0.8 && step.confidence >= 0.8;
}

function assertAdvancedProperly(tag: string, run: Run, competencyId: string): void {
  check(run.final?.reasonCode === "MASTERY_RETENTION_TRANSFER_CONFIRMED", `${tag}: advances on confirmed mastery (${run.final?.reasonCode})`);
  const c = competencyState(run.state, competencyId);
  check(c.masteryEstimate >= 0.8 && c.confidence >= 0.8, `${tag}: final mastery/confidence >= 0.8`);
  check(c.retentionState?.status === "retained", `${tag}: retention retained before advance`);
  check(c.transferState?.status === "demonstrated", `${tag}: transfer demonstrated before advance`);
  /* 10/11. Retention and transfer answers come after the mastery gate, never skipped. */
  const firstGate = run.steps.findIndex(reachedGate);
  const retention = run.steps.findIndex((s) => s.action === "retention_check");
  const transfer = run.steps.findIndex((s) => s.action === "transfer_check");
  check(firstGate >= 0 && retention > firstGate && transfer > retention, `${tag}: gate -> retention -> transfer order`);
}

async function partA(): Promise<void> {
  /* 1. Perfect learner. */
  const perfect = await drive("perfect", EN, () => false);
  assertAdvancedProperly("perfect", perfect, EN);
  check(perfect.steps.length <= 10, `perfect: efficient (${perfect.steps.length} answers)`);
  check(perfect.steps.filter((s) => s.repeated).length === 0, "perfect: no repeated item needed");

  /* 2. One early error then recovery. */
  const one = await drive("one-error", EN, (n) => n === 0);
  assertAdvancedProperly("one early error", one, EN);
  check(one.steps.length <= 14, `one early error: recovers within 14 answers (${one.steps.length})`);

  /* 13. Pre-remediation errors stay in the stored history. */
  const stored = await getEvidence(one.learnerId, EN);
  check(stored.filter((e) => e.outcome === "incorrect").length === 1, "one early error: the wrong answer is still stored");
  const result = evaluateMastery(stored);
  check(result.excludedEvidenceIds.length === 1 && stored.some((e) => e.id === result.excludedEvidenceIds[0] && e.outcome === "incorrect"), "one early error: excluded from CURRENT mastery only");

  /* 3. Two early errors then recovery (English and Maths). */
  const two = await drive("two-errors", EN, (n) => n < 2);
  assertAdvancedProperly("two early errors EN", two, EN);
  check(two.steps.length <= 16, `two early errors EN: within 16 answers (${two.steps.length})`);
  const twoMa = await drive("two-errors-ma", MA, (n) => n < 2);
  assertAdvancedProperly("two early errors MA", twoMa, MA);

  /* Step 3 diagnosis fix: a correct answer under teaching ends the teaching loop. */
  check(one.cards === 1, `one early error: one teaching card, not repeated after it worked (${one.cards})`);
  check(perfect.cards === 0, `perfect: no teaching cards (${perfect.cards})`);

  /* 9. Always wrong: never progresses as mastered, never loops forever. */
  const wrong = await drive("always-wrong", EN, () => true);
  check(wrong.final !== undefined, "always wrong: terminates");
  check(wrong.final?.reasonCode === CONTENT_EXHAUSTED_REASON_CODE, `always wrong: exits only as needs-support (${wrong.final?.reasonCode})`);
  check(wrong.steps.every((s) => !reachedGate(s)), "always wrong: never reaches the mastery gate");
  const wrongStored = await getLearnerState(wrong.learnerId, EN);
  const wrongComp = wrongStored && competencyState(wrongStored, EN);
  check(wrongComp && !wrongComp.masteredAt && wrongComp.readinessState?.reasonCode === CONTENT_EXHAUSTED_REASON_CODE, "always wrong: stored as exhausted, not mastered");

  /* 8. Tiny two-question pool: no deadlock, no manufactured mastery/confidence. */
  for (const [tag, wrongAt] of [["tiny-perfect", () => false], ["tiny-one-error", (n: number) => n === 0]] as const) {
    const tiny = await drive(tag, TINY, wrongAt);
    check(tiny.final?.reasonCode === CONTENT_EXHAUSTED_REASON_CODE, `${tag}: exits via content exhaustion (${tiny.final?.reasonCode})`);
    check(tiny.steps.length <= 6, `${tag}: no deadlock (${tiny.steps.length} answers)`);
    check(tiny.steps.every((s) => s.confidence < 0.8), `${tag}: confidence never manufactured`);
    const st = await getLearnerState(tiny.learnerId, TINY);
    const comp = st && competencyState(st, TINY);
    check(comp && !comp.masteredAt && comp.readinessState?.readyForAdvancement === false, `${tag}: not mastered, not ready`);
  }
}

/* ---------- Part B: evaluateMastery patterns ---------- */

let clock = Date.parse("2026-10-01T08:00:00Z");
function ev(id: string, overrides: Partial<LearningEvidence> = {}): LearningEvidence {
  clock += 60_000;
  return {
    id,
    learnerId: "learner-m4b",
    competencyId: "competency-m4b",
    source: "assessment",
    outcome: "correct",
    timestamp: new Date(clock).toISOString(),
    policyVersion: "assessment-0.9",
    interpretationVersion: "evidence-v1",
    purpose: "mastery",
    independence: "independent",
    strength: "strong",
    difficulty: "standard",
    representation: "verbal",
    assessmentItemId: `item-${id}`,
    exposureCount: 1,
    ...overrides,
  };
}
const wrongDiag = (id: string) => ev(id, { outcome: "incorrect", purpose: "diagnostic", interventionType: "diagnose" });
const remediated = (id: string, item?: string) => ev(id, { interventionType: "remediate", ...(item ? { assessmentItemId: item, exposureCount: 2 } : {}) });
const mastered = (r: ReturnType<typeof evaluateMastery>) => r.masteryEstimate >= 0.8 && r.confidence >= 0.8;

function partB(): void {
  /* 12. Thresholds unchanged. */
  check(MASTERY_V1_POLICY.masteryThreshold === 0.8 && MASTERY_V1_POLICY.confidenceThreshold === 0.8, "thresholds 0.80/0.80");
  check(MASTERY_V1_POLICY.minimumIndependentCorrectObservations === 3, "3 independent correct required");
  check(DEFAULT_PATH_POLICY.masteryThreshold === 0.8 && DEFAULT_PATH_POLICY.confidenceThreshold === 0.8, "path thresholds 0.80/0.80");

  /* 4. Failure -> effective remediation -> enough fresh independent evidence. */
  const h4 = [wrongDiag("a1"), ev("a2", { outcome: "incorrect", interventionType: "teach" }), remediated("a3"), ev("a4"), ev("a5"), ev("a6")];
  const r4 = evaluateMastery(h4);
  check(mastered(r4) && r4.reasonCode === "STRONG_MASTERY_EVIDENCE", `4: remediation + 3 fresh -> mastery (${r4.masteryEstimate.toFixed(2)}/${r4.confidence.toFixed(2)})`);
  check(r4.instructionAnchorEvidenceId === "a3" && r4.excludedEvidenceIds.join() === "a1,a2", "4: pre-remediation errors excluded from current estimate");
  /* 13. History unchanged: input not mutated, ids still present. */
  check(h4.length === 6 && h4[0].outcome === "incorrect" && r4.evidenceCount === 6, "13: evaluateMastery keeps full history");

  /* 5. Remediation + ONE correct must not master (nor + two). */
  const r5 = evaluateMastery([wrongDiag("b1"), remediated("b2")]);
  check(!mastered(r5), `5: remediation + 1 correct is not mastery (${r5.masteryEstimate.toFixed(2)}/${r5.confidence.toFixed(2)})`);
  const r5b = evaluateMastery([wrongDiag("b3"), remediated("b4"), ev("b5")]);
  check(!mastered(r5b), "5: remediation + 2 correct is not mastery");

  /* Diagnosis: a correct answer under teaching is "instruction effective", not a continued misunderstanding. */
  const diag = diagnoseEvidence(remediated("b6"), { evidenceCount: 1, diagnosticState: "misconception" } as never, 0.5);
  check(diag.diagnosticState === "insufficient_evidence" && diag.reasonCode === "INSTRUCTION_EFFECTIVE", "diagnosis: effective instruction clears the old diagnosis");

  /* 6. Post-remediation success on repeated items counts less than fresh items. */
  const fresh = evaluateMastery([wrongDiag("c1"), remediated("c2"), ev("c3"), ev("c4"), ev("c5")]);
  const repeat = evaluateMastery([
    ev("d1", { outcome: "incorrect", interventionType: "diagnose", assessmentItemId: "item-x" }),
    ev("d1b", { outcome: "incorrect", assessmentItemId: "item-y" }),
    remediated("d2", "item-x"),
    ev("d3", { assessmentItemId: "item-y", exposureCount: 2 }),
    ev("d4", { assessmentItemId: "item-x", exposureCount: 3 }),
    ev("d5", { assessmentItemId: "item-y", exposureCount: 3 }),
  ]);
  check(repeat.confidence < fresh.confidence, `6: repeated success < fresh (${repeat.confidence.toFixed(2)} < ${fresh.confidence.toFixed(2)})`);
  check(!mastered(repeat) && repeat.distinctIndependentCorrectItems === 2, "6: two repeated items cannot master");
  check(repeat.repeatedEvidenceCount === 4, `6: repeated answers recognised (${repeat.repeatedEvidenceCount})`);

  /* 7. Assisted correct answers alone never master. */
  for (const level of ["guided", "light_support", "fully_supported"] as const) {
    const r7 = evaluateMastery(Array.from({ length: 8 }, (_, i) => ev(`g-${level}-${i}`, { independence: level })));
    check(!mastered(r7) && r7.reasonCode !== "STRONG_MASTERY_EVIDENCE", `7: ${level} only is not mastery (${r7.masteryEstimate.toFixed(2)}/${r7.confidence.toFixed(2)})`);
  }
  /* Assisted counts less than independent. */
  const assisted = evaluateMastery([ev("h1", { independence: "guided" }), ev("h2", { independence: "guided" }), ev("h3", { independence: "guided" })]);
  const unassisted = evaluateMastery([ev("h4"), ev("h5"), ev("h6")]);
  check(assisted.masteryEstimate < unassisted.masteryEstimate, "7: assisted evidence weighs less");

  /* 8 (unit). Two items repeated many times: no manufactured confidence. */
  const tinyHistory = Array.from({ length: 10 }, (_, i) => ev(`t${i}`, { assessmentItemId: `item-tiny-${i % 2}`, exposureCount: Math.floor(i / 2) + 1 }));
  const r8 = evaluateMastery(tinyHistory);
  check(r8.confidence < 0.8 && r8.reasonCode === "LIMITED_DISTINCT_EVIDENCE", `8: two-item pool capped (${r8.confidence.toFixed(2)}, ${r8.reasonCode})`);

  /* Retention/transfer evidence is not mastery evidence (gated separately). */
  const r10 = evaluateMastery([ev("r1", { purpose: "retention", interventionType: "retention_check" }), ev("r2", { purpose: "transfer", interventionType: "transfer_check" })]);
  check(r10.masteryEvidenceCount === 0, "10/11: retention/transfer answers do not inflate mastery");

  /* 14. Regression after remediation counts normally. */
  const steady = evaluateMastery([wrongDiag("k1"), remediated("k2"), ev("k3"), ev("k4"), ev("k5")]);
  const regress = evaluateMastery([wrongDiag("k6"), remediated("k7"), ev("k8"), ev("k9", { outcome: "incorrect" }), ev("k10")]);
  check(!regress.excludedEvidenceIds.includes("k9"), "14: post-remediation error is not excluded");
  check(regress.masteryEstimate < steady.masteryEstimate && !mastered(regress), `14: regression lowers mastery (${regress.masteryEstimate.toFixed(2)})`);

  /* 15. Second remediation re-anchors coherently. */
  const second = [wrongDiag("s1"), remediated("s2"), ev("s3", { outcome: "incorrect" }), ev("s4", { outcome: "incorrect" }), remediated("s5")];
  const r15 = evaluateMastery(second);
  check(r15.instructionAnchorEvidenceId === "s5", "15: latest effective remediation is the anchor");
  check(["s1", "s3", "s4"].every((id) => r15.excludedEvidenceIds.includes(id)), "15: errors before the second remediation excluded");
  check(r15.evidenceIds.includes("s2"), "15: earlier correct still counts (downweighted)");
  check(!mastered(r15), "15: second remediation + one correct is not mastery");
  const r15b = evaluateMastery([...second, ev("s6"), ev("s7"), ev("s8")]);
  check(mastered(r15b), `15: then fresh independent evidence can master (${r15b.masteryEstimate.toFixed(2)}/${r15b.confidence.toFixed(2)})`);

  /* "observed" is history, not a failure. */
  const obs = evaluateMastery([ev("o1", { outcome: "observed" }), ev("o2"), ev("o3"), ev("o4")]);
  check(!obs.evidenceIds.includes("o1"), "observed evidence excluded from mastery");
}

(async () => {
  partB();
  await partA();
  console.log(`PASS mastery-reuse-4b (${passed} checks)`);
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
