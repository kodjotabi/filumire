import { computeMasteryPilotMeasures, PILOT_MEASURES_POLICY } from "../services/pilot-measures/index";
import { createInitialLearnerState } from "../services/learner-state/index";
import type { LearnerCompetencyState, LearningEvidence } from "../packages/domain";
import { buildTeacherLearnerSummary } from "../services/teacher-summary/index";
import { saveLearnerState } from "../services/learner-state/index";
import { saveEvidence } from "../services/evidence-store/index";
import { persistenceStore } from "../services/persistence-provider";

/*
 * TRANCHE 4C: pilot measures for the Option B mastery model, on a
 * hand-built data set where every expected value is known.
 *
 * Run: npx tsx --env-file=.env.local tests/pilot-measures-4c.test.ts
 * (Tranche 4D adds a teacher-summary check at the end.)
 */

let passed = 0;
function check(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed += 1;
}

const T0 = Date.parse("2026-10-01T08:00:00.000Z");
const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const iso = (ms: number) => new Date(ms).toISOString();
let n = 0;
/* Evidence ids are a primary key on Postgres: unique per run. */
const RUN = crypto.randomUUID().slice(0, 8);

function ev(learnerId: string, competencyId: string, at: number, outcome: "correct" | "incorrect", extra: Partial<LearningEvidence> = {}): LearningEvidence {
  n += 1;
  return { id: `pm-${RUN}-${n}`, learnerId, competencyId, source: "assessment", outcome, timestamp: iso(at), policyVersion: "test", purpose: "mastery", ...extra } as LearningEvidence;
}

function state(learnerId: string, competencyId: string, extra: Partial<LearnerCompetencyState> = {}): LearnerCompetencyState {
  return { ...createInitialLearnerState(learnerId, competencyId).competencies[0], ...extra };
}

const retention = { purpose: "retention" as const, interventionType: "retention_check" as const };
const transfer = { purpose: "transfer" as const, interventionType: "transfer_check" as const };
const evidence: LearningEvidence[] = [];

/* A: mastered after 4 answers (1 wrong, 3 right), retained after 2 days, transfer correct, teacher agrees. */
evidence.push(ev("A", "c1", T0, "incorrect"), ev("A", "c1", T0 + MIN, "correct"), ev("A", "c1", T0 + 2 * MIN, "correct"), ev("A", "c1", T0 + 3 * MIN, "correct"));
evidence.push(ev("A", "c1", T0 + 2 * DAY, "correct", retention), ev("A", "c1", T0 + 2 * DAY + MIN, "correct", transfer));
evidence.push(ev("A", "c1", T0 + 3 * DAY, "correct", { evaluatorType: "teacher" }));
/* B: mastered after 6 answers, first retention (same day) wrong -> false mastery; teacher disagrees. */
for (let i = 0; i < 6; i++) evidence.push(ev("B", "c1", T0 + i * MIN, i < 3 ? "incorrect" : "correct"));
evidence.push(ev("B", "c1", T0 + 20 * MIN, "incorrect", retention), ev("B", "c1", T0 + 30 * MIN, "incorrect", { evaluatorType: "teacher" }));
/* C: exhausted, not mastered. */
for (let i = 0; i < 5; i++) evidence.push(ev("C", "c1", T0 + i * MIN, "incorrect"));
/* D: many answers, no mastery -> stuck. */
for (let i = 0; i < PILOT_MEASURES_POLICY.stuckAnswerThreshold; i++) evidence.push(ev("D", "c1", T0 + i * MIN, i % 2 ? "correct" : "incorrect"));
/* E: state without evidence: not attempted. Observed evidence ignored. */
evidence.push(ev("E", "c1", T0, "correct", { outcome: "observed" } as Partial<LearningEvidence>));

const records = [
  { learnerId: "A", state: state("A", "c1", { masteredAt: iso(T0 + 3 * MIN) }) },
  { learnerId: "B", state: state("B", "c1", { masteredAt: iso(T0 + 5 * MIN) }) },
  { learnerId: "C", state: state("C", "c1", { readinessState: { readyForAdvancement: false, confidence: 0.3, reasonCode: "CONTENT_EXHAUSTED_NEEDS_SUPPORT", evaluatedAt: iso(T0 + 5 * MIN) } }) },
  { learnerId: "D", state: state("D", "c1") },
  { learnerId: "E", state: state("E", "c1") },
];

const m = computeMasteryPilotMeasures({ records, evidence });

check(m.learners === 4 && m.competenciesAttempted === 4 && m.competenciesMastered === 2, `counts (${m.learners}/${m.competenciesAttempted}/${m.competenciesMastered})`);
check(m.falseMasteryRate.numerator === 1 && m.falseMasteryRate.denominator === 2 && m.falseMasteryRate.rate === 0.5, "false mastery 1/2");
check(m.retentionAfterMastery.rate === 0.5 && m.retentionAfterMastery.denominator === 2, "retention after mastery 1/2");
check(m.delayedRetentionAfterMastery.numerator === 1 && m.delayedRetentionAfterMastery.denominator === 1, "delayed retention 1/1 (only A waited 24 h)");
check(m.transferAfterMastery.rate === 1 && m.transferAfterMastery.denominator === 1, "transfer after mastery 1/1");
check(m.teacherAgreementAfterMastery.numerator === 1 && m.teacherAgreementAfterMastery.denominator === 2, "teacher agreement 1/2");
check(m.stuckRate.numerator === 2 && m.stuckRate.denominator === 4 && m.contentExhaustedCount === 1, "stuck 2/4 (exhausted C, many-answers D)");
check(m.medianAnswersToMastery === 5, `median answers to mastery (4 and 6 -> 5): ${m.medianAnswersToMastery}`);
check(m.medianMinutesToMastery === 4, `median minutes to mastery (3 and 5 -> 4): ${m.medianMinutesToMastery}`);
check(m.learningGainSample === 2, `learning gain sample: B (6 answers) and D (15): ${m.learningGainSample}`);
/* B: first 3 wrong (0); last 3 = C, C and the teacher-marked W (2/3) -> +2/3. D: W C W ... W C W -> 0. Mean 1/3. */
check(Math.abs(m.meanLearningGain! - 1 / 3) < 1e-9, `mean learning gain 1/3 (${m.meanLearningGain})`);

const empty = computeMasteryPilotMeasures({ records: [], evidence: [] });
check(empty.falseMasteryRate.rate === null && empty.medianAnswersToMastery === null && empty.meanLearningGain === null, "no data -> null, never 0%");

/* Tranche 4D: the teacher summary carries this learner's measures. */
const teacherLearner = "learner-pm-teacher-" + Date.now();
await persistenceStore.ensureLearnerExists(teacherLearner);
const C = "competency-gh-math-b4-number-patterns-001";
const mastered = state(teacherLearner, C, { masteredAt: iso(T0 + 3 * MIN) });
await saveLearnerState({ ...createInitialLearnerState(teacherLearner, C), competencies: [mastered] });
for (const item of [ev(teacherLearner, C, T0, "correct"), ev(teacherLearner, C, T0 + MIN, "correct"), ev(teacherLearner, C, T0 + 2 * MIN, "correct"), ev(teacherLearner, C, T0 + 2 * DAY, "incorrect", retention)]) {
  await saveEvidence(item);
}
const summary = await buildTeacherLearnerSummary(teacherLearner);
check(summary.masteryMeasures.competenciesMastered === 1 && summary.masteryMeasures.falseMasteryRate.numerator === 1 && summary.masteryMeasures.falseMasteryRate.denominator === 1, "teacher summary: per-learner measures (1 mastered, 1/1 false mastery)");
check(summary.masteryMeasures.delayedRetentionAfterMastery.rate === 0, "teacher summary: delayed retention failure visible");

if (process.env.FILUMIRE_PERSISTENCE === "postgres") {
  const { pool } = await import("../services/database");
  const { deleteTestLearners } = await import("./postgres-test-cleanup");
  await deleteTestLearners(pool, [teacherLearner]);
  await pool.end();
}

console.log(`PASS pilot-measures-4c (${passed} checks)`);
process.exit(0);
