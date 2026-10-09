import assert from "node:assert/strict";
import type { LearnerCompetencyState } from "../packages/domain";
import {
  applyEvidence,
  createInitialLearnerState,
} from "../services/learner-state";
import {
  buildLearnerPath,
  DEFAULT_PATH_POLICY,
  recommendNext,
  type PathCurriculum,
} from "../services/learner-path";

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const T0 = new Date("2026-10-01T09:00:00.000Z").getTime();
const iso = (ms: number) => new Date(ms).toISOString();

function graph(edges: Record<string, string[]>, order?: string[]): PathCurriculum {
  const ids = order ?? Object.keys(edges);
  return {
    listCompetencyIds: () => ids,
    getPrerequisites: (id) => edges[id],
  };
}

const ABCD = graph({ A: [], B: ["A"], C: ["B"], D: [] }, ["A", "B", "C", "D"]);

function state(id: string, o: Partial<LearnerCompetencyState> = {}): LearnerCompetencyState {
  const base = createInitialLearnerState("learner-path", id).competencies[0];
  return { ...base, ...o };
}

function acquired(id: string, o: Partial<LearnerCompetencyState> = {}): LearnerCompetencyState {
  return state(id, {
    masteryEstimate: 0.95,
    confidence: 0.9,
    evidenceCount: 6,
    masteredAt: iso(T0),
    lastUpdated: iso(T0),
    ...o,
  });
}

const entry = (path: ReturnType<typeof buildLearnerPath>, id: string) =>
  path.entries.find((e) => e.competencyId === id)!;

// 1. Nothing started: everything not_started, first competency is recommended.
{
  const path = buildLearnerPath({ states: [], curriculum: ABCD, now: new Date(T0) });
  assert.ok(path.entries.every((e) => e.status === "not_started"));
  const recs = recommendNext({ path, curriculum: ABCD });
  assert.equal(recs[0].kind, "start_next");
  assert.equal(recs[0].competencyId, "A");
}

// 2. Mastered too recently to test retention: wait, and move on.
{
  const now = new Date(T0 + 1 * HOUR);
  const path = buildLearnerPath({
    states: [acquired("A", { transferState: { status: "demonstrated", confidence: 1, evidenceIds: [] } })],
    curriculum: ABCD,
    now,
  });
  const a = entry(path, "A");
  assert.equal(a.status, "consolidating");
  assert.equal(a.retention, "waiting");
  assert.equal(a.retentionDueAt, iso(T0 + DEFAULT_PATH_POLICY.retentionGapMs));
  const recs = recommendNext({ path, curriculum: ABCD, currentCompetencyId: "A" });
  assert.equal(recs[0].kind, "start_next");
  assert.equal(recs[0].competencyId, "B");
  assert.ok(!recs.some((r) => r.kind === "retention_review"));
}

// 3. Transfer can be tested straight away, before retention is due.
{
  const path = buildLearnerPath({ states: [acquired("A")], curriculum: ABCD, now: new Date(T0 + HOUR) });
  const recs = recommendNext({ path, curriculum: ABCD, currentCompetencyId: "A" });
  assert.equal(recs[0].kind, "transfer_check");
  assert.equal(recs[1].kind, "start_next");
}

// 4. After the gap, the retention review becomes due and comes first.
{
  const path = buildLearnerPath({
    states: [acquired("A", { transferState: { status: "demonstrated", confidence: 1, evidenceIds: [] } })],
    curriculum: ABCD,
    now: new Date(T0 + 25 * HOUR),
  });
  assert.equal(entry(path, "A").retention, "due");
  const recs = recommendNext({ path, curriculum: ABCD });
  assert.equal(recs[0].kind, "retention_review");
  assert.equal(recs[0].competencyId, "A");
}

// 5. Confirmed retention is spaced out; later reviews wait longer.
{
  const T1 = T0 + 2 * DAY;
  const retained = (successful: number) =>
    acquired("A", {
      transferState: { status: "demonstrated", confidence: 1, evidenceIds: [] },
      retentionState: { status: "retained", lastCheckedAt: iso(T1), confidence: 1, evidenceIds: [] },
      retentionPerformance: { attempts: successful, successfulAttempts: successful, unsuccessfulAttempts: 0, confidence: 1 },
    });
  const at = (s: LearnerCompetencyState, ms: number) =>
    entry(buildLearnerPath({ states: [s], curriculum: ABCD, now: new Date(ms) }), "A");
  assert.equal(at(retained(2), T1 + 3 * DAY).status, "secured");
  assert.equal(at(retained(2), T1 + 8 * DAY).status, "review_due");
  assert.equal(at(retained(3), T1 + 8 * DAY).status, "secured");
  assert.equal(at(retained(3), T1 + 31 * DAY).status, "review_due");
}

// 6. A failed retention check is not re-tested immediately.
{
  const T2 = T0 + 3 * DAY;
  const s = acquired("A", {
    retentionState: { status: "not_retained", lastCheckedAt: iso(T2), confidence: 0, evidenceIds: [] },
  });
  const soon = entry(buildLearnerPath({ states: [s], curriculum: ABCD, now: new Date(T2 + 2 * HOUR) }), "A");
  assert.equal(soon.retention, "lapsed");
  const later = entry(buildLearnerPath({ states: [s], curriculum: ABCD, now: new Date(T2 + 25 * HOUR) }), "A");
  assert.equal(later.retention, "due");
}

// 7. Struggling on C with nothing earlier in place points at the root cause.
{
  const path = buildLearnerPath({
    states: [state("C", { evidenceCount: 3, masteryEstimate: 0.2, confidence: 0.3, diagnosticState: "prerequisite_gap" })],
    curriculum: ABCD,
    now: new Date(T0),
  });
  const c = entry(path, "C");
  assert.equal(c.status, "needs_support");
  assert.deepEqual(c.likelyRootCauses, ["A"]);
  const recs = recommendNext({ path, curriculum: ABCD, currentCompetencyId: "C" });
  assert.equal(recs[0].kind, "prerequisite_repair");
  assert.equal(recs[0].competencyId, "A");
  assert.equal(recs[1].kind, "continue");
}

// 8. With A secure, the root cause moves up to B.
{
  const path = buildLearnerPath({
    states: [
      acquired("A"),
      state("B", { evidenceCount: 3, masteryEstimate: 0.3, confidence: 0.3 }),
      state("C", { evidenceCount: 2, masteryEstimate: 0.1, confidence: 0.2 }),
    ],
    curriculum: ABCD,
    now: new Date(T0),
  });
  assert.deepEqual(entry(path, "C").likelyRootCauses, ["B"]);
  assert.deepEqual(entry(path, "B").likelyRootCauses, []);
}

// 9. Finished topics are not repaired, and a path with nothing to do says why.
{
  const secured = (id: string) =>
    acquired(id, {
      transferState: { status: "demonstrated", confidence: 1, evidenceIds: [] },
      retentionState: { status: "retained", lastCheckedAt: iso(T0), confidence: 1, evidenceIds: [] },
      retentionPerformance: { attempts: 2, successfulAttempts: 2, unsuccessfulAttempts: 0, confidence: 1 },
    });
  const all = ["A", "B", "C", "D"].map(secured);
  const path = buildLearnerPath({ states: all, curriculum: ABCD, now: new Date(T0 + DAY) });
  assert.ok(path.entries.every((e) => e.status === "secured"));
  const recs = recommendNext({ path, curriculum: ABCD });
  assert.equal(recs[0].kind, "complete");
  assert.equal(recs[0].reasonCode, "PATH_COMPLETE");

  const waiting = ["A", "B", "C", "D"].map((id) =>
    acquired(id, { transferState: { status: "demonstrated", confidence: 1, evidenceIds: [] } }),
  );
  const p2 = buildLearnerPath({ states: waiting, curriculum: ABCD, now: new Date(T0 + HOUR) });
  const r2 = recommendNext({ path: p2, curriculum: ABCD });
  assert.equal(r2[0].kind, "complete");
  assert.equal(r2[0].reasonCode, "WAITING_FOR_RETENTION_WINDOW");
}

// 10. A cycle in the graph cannot hang the path.
{
  const cyclic = graph({ A: ["B"], B: ["A"] }, ["A", "B"]);
  const path = buildLearnerPath({
    states: [state("A", { evidenceCount: 2, masteryEstimate: 0.1, confidence: 0.1 })],
    curriculum: cyclic,
    now: new Date(T0),
  });
  assert.ok(Array.isArray(entry(path, "A").likelyRootCauses));
  recommendNext({ path, curriculum: cyclic });
}

// 11. Duplicate states: the one with most evidence wins.
{
  const path = buildLearnerPath({
    states: [state("A", { evidenceCount: 1, masteryEstimate: 0.1 }), acquired("A", { evidenceCount: 9 })],
    curriculum: ABCD,
    now: new Date(T0),
  });
  assert.equal(entry(path, "A").acquisition, "established");
}

// 12. The learner state records when mastery was first reached.
{
  const L = "learner-path-time";
  const C = "competency-path-time";
  const reps = ["numeric", "visual", "verbal"] as const;
  let s = createInitialLearnerState(L, C);
  const history: any[] = [];
  const stamps: string[] = [];
  let firstAcquired: string | undefined;
  for (let i = 0; i < 8; i += 1) {
    const e: any = {
      id: `t-${i}`,
      learnerId: L,
      competencyId: C,
      source: "assessment",
      outcome: "correct",
      timestamp: iso(T0 + i * HOUR),
      policyVersion: "test",
      purpose: "mastery",
      independence: "independent",
      strength: "strong",
      difficulty: "standard",
      representation: reps[i % 3],
    };
    history.push(e);
    s = applyEvidence(s, e, [...history]);
    const c = s.competencies[0];
    stamps.push(String(c.masteredAt));
    assert.equal(c.lastEvidenceAt, e.timestamp);
    if (c.masteredAt && !firstAcquired) firstAcquired = c.masteredAt;
  }
  assert.ok(firstAcquired, "mastery must be reached");
  assert.equal(s.competencies[0].masteredAt, firstAcquired, "masteredAt must not move once set");
}

console.log("LEARNER PATH TESTS PASS");
