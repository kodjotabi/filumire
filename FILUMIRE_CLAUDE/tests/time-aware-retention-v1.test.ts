import assert from "node:assert/strict";
import type { LearnerCompetencyState } from "../packages/domain";
import { createInitialLearnerState } from "../services/learner-state";
import {
  decideNextBestAction,
  type AdaptivePolicyContext,
} from "../services/adaptive-policy";
import { chooseFocus } from "../services/learner-path/focus";
import type { PathCurriculum } from "../services/learner-path";

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const T0 = new Date("2026-10-01T09:00:00.000Z").getTime();
const iso = (ms: number) => new Date(ms).toISOString();

/* ---------- Policy ---------- */

const base: AdaptivePolicyContext = {
  masteryEstimate: 0.9,
  confidence: 0.9,
  evidenceCount: 6,
  consecutiveFailures: 0,
  diagnosticState: "probable_mastery",
  diagnosticConfidence: 0.9,
  errorPatterns: [],
  interventionHistory: [],
  prerequisiteSatisfied: true,
  hasNextCompetency: true,
  retentionStatus: "not_tested",
  retentionConfidence: 0,
  transferStatus: "demonstrated",
  transferConfidence: 0.9,
  readyForAdvancement: false,
};

// Legacy: with no window given, retention is checked straight away.
assert.equal(decideNextBestAction(base).action, "retention_check");
assert.equal(
  decideNextBestAction({ ...base, retentionWindow: "open" }).action,
  "retention_check",
);

// Window not open and transfer shown: move on and come back.
{
  const d = decideNextBestAction({ ...base, retentionWindow: "not_yet_open" });
  assert.equal(d.action, "advance");
  assert.equal(d.reasonCode, "ACQUIRED_RETENTION_PENDING_MOVE_ON");
}

// Window not open, transfer not yet shown: transfer is testable now.
{
  const d = decideNextBestAction({
    ...base,
    retentionWindow: "not_yet_open",
    transferStatus: "not_tested",
    transferConfidence: 0,
  });
  assert.equal(d.action, "transfer_check");
}

// Last competency: nowhere to move on to, original behaviour kept.
assert.equal(
  decideNextBestAction({
    ...base,
    retentionWindow: "not_yet_open",
    hasNextCompetency: false,
  }).action,
  "retention_check",
);

// A lapsed retention check inside its gap also lets the learner move on.
assert.equal(
  decideNextBestAction({
    ...base,
    retentionStatus: "not_retained",
    retentionWindow: "not_yet_open",
  }).action,
  "advance",
);

// Mastery still comes first: weak mastery is never skipped by the window.
assert.equal(
  decideNextBestAction({
    ...base,
    masteryEstimate: 0.5,
    retentionWindow: "not_yet_open",
  }).action,
  "practice",
);

// Fully retained learners advance exactly as before.
assert.equal(
  decideNextBestAction({
    ...base,
    retentionStatus: "retained",
    retentionConfidence: 0.9,
    readyForAdvancement: true,
    retentionWindow: "open",
  }).action,
  "advance",
);

/* ---------- Focus ---------- */

const curriculum: PathCurriculum = {
  listCompetencyIds: () => ["A", "B", "C"],
  getPrerequisites: (id) => ({ A: [], B: ["A"], C: ["B"] } as Record<string, string[]>)[id],
};

function state(id: string, o: Partial<LearnerCompetencyState> = {}): LearnerCompetencyState {
  const base = createInitialLearnerState("focus", id).competencies[0];
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

// Just acquired: window closed.
{
  const f = chooseFocus({
    states: [acquired("A")],
    currentCompetencyId: "A",
    curriculum,
    now: new Date(T0 + 2 * HOUR),
  });
  assert.equal(f.retentionWindow, "not_yet_open");
  assert.equal(f.reviewDue, false);
  assert.equal(f.competencyId, "A");
}

// A day later: window open.
{
  const f = chooseFocus({
    states: [acquired("A")],
    currentCompetencyId: "A",
    curriculum,
    now: new Date(T0 + 25 * HOUR),
  });
  assert.equal(f.retentionWindow, "open");
}

// Moved on to B (just started): A's check is due, so the learner comes back.
{
  const f = chooseFocus({
    states: [state("B"), acquired("A")],
    currentCompetencyId: "B",
    curriculum,
    now: new Date(T0 + 2 * DAY),
  });
  assert.equal(f.reviewDue, true);
  assert.equal(f.competencyId, "A");
  assert.equal(f.reasonCode, "RETENTION_REVIEW_DUE");
}

// In the middle of learning B: the review waits.
{
  const f = chooseFocus({
    states: [
      state("B", { evidenceCount: 2, masteryEstimate: 0.4, confidence: 0.3, lastUpdated: iso(T0 + DAY) }),
      acquired("A"),
    ],
    currentCompetencyId: "B",
    curriculum,
    now: new Date(T0 + 2 * DAY),
  });
  assert.equal(f.reviewDue, false);
  assert.equal(f.competencyId, "B");
}

// Review not yet due: stay on B.
{
  const f = chooseFocus({
    states: [state("B"), acquired("A")],
    currentCompetencyId: "B",
    curriculum,
    now: new Date(T0 + 3 * HOUR),
  });
  assert.equal(f.reviewDue, false);
  assert.equal(f.competencyId, "B");
}

console.log("TIME-AWARE RETENTION TESTS PASS");
