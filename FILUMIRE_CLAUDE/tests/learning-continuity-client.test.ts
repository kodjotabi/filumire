import assert from "node:assert/strict";
import { LearningRequestOrder, restoreLearningActivity, submitPendingAnswer } from "../apps/learner/services/learning-continuity";
import { fetchLearningSession, LearningNetworkError, LearningRequestError, type LearningResponse } from "../apps/learner/services/learning-client";
import { readPendingSubmission, writePendingSubmission, clearPendingSubmission, type PendingAssessmentSubmission } from "../apps/learner/services/pending-submission";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function activity(id: string, learnerId = "learner-a", sessionId = "new-session"): LearningResponse {
  return {
    learnerState: { learnerId, competencies: [] },
    decision: { id, sessionId, action: "practice", competencyId: "competency-a", reasonCode: "test" },
    progress: { learnerId, competencyCount: 1, completedCompetencies: 0, masteryEstimate: 0, confidence: 0, evidenceCount: 0, readiness: false, percent: 0 },
    instruction: { content: id },
  };
}
const pending: PendingAssessmentSubmission = {
  learnerId: "learner-a", sessionId: "old-session", clientRequestId: "original-request",
  competencyId: "competency-a", assessmentItemId: "item-a", response: "answer",
  interventionId: "intervention-a", queuedAt: "2026-01-01T00:00:00Z",
};
const storage = new Map<string, string>();
Object.defineProperty(globalThis, "window", { configurable: true, value: {
  localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) },
  location: { search: "" },
} });
Object.defineProperty(globalThis, "document", { configurable: true, value: { cookie: "filumire_signed_in=1", documentElement: { lang: "en" } } });

// Late success/error/finally callbacks cannot publish after navigation or a
// newer request. This is the same ordering guard used by both learner screens.
const order = new LearningRequestOrder();
const old = order.begin();
const latest = order.begin();
assert.equal(order.accepts(old), false);
assert.equal(order.accepts(latest), true);
order.invalidate();
assert.equal(order.accepts(latest), false);
console.log("PASS: stale responses and unmounted screen publication rejected");

writePendingSubmission(pending);
assert.deepEqual(readPendingSubmission(), pending, "refresh restores exact retry payload");
writePendingSubmission({ ...pending, clientRequestId: "newer-answer" });
clearPendingSubmission(pending.clientRequestId);
assert.equal(readPendingSubmission()?.clientRequestId, "newer-answer");
clearPendingSubmission("newer-answer");
console.log("PASS: refresh persistence and delayed acknowledgement preserve newer answer");

let fetches = 0;
let retried: PendingAssessmentSubmission | undefined;
let cleared: string | undefined;
const restored = await restoreLearningActivity("math", {
  fetch: async () => activity(++fetches === 1 ? "before" : "authoritative-after"),
  readPending: () => pending,
  clearPending: (key) => { cleared = key; },
  submit: async (body) => { retried = body as PendingAssessmentSubmission; return activity("post"); },
});
assert.equal(restored.data.decision.id, "authoritative-after");
assert.deepEqual(retried, { ...pending, sessionId: "new-session" });
assert.equal(cleared, pending.clientRequestId);
assert.equal(fetches, 2);
console.log("PASS: returning session reconciles original answer before authoritative restoration");

let foreignSubmitted = false;
const foreign = await restoreLearningActivity(undefined, {
  fetch: async () => activity("other", "learner-b"), readPending: () => pending,
  clearPending: () => { throw Error("must preserve other learner's pending answer"); },
  submit: async () => { foreignSubmitted = true; return activity("wrong"); },
});
assert.equal(foreignSubmitted, false);
assert.equal(foreign.data.learnerState.learnerId, "learner-b");
console.log("PASS: pending answers are never replayed for another learner");

const networkFailure = await restoreLearningActivity(undefined, {
  fetch: async () => activity("current"), readPending: () => pending,
  clearPending: () => { throw Error("must not clear failed answer"); },
  submit: async () => { throw new LearningNetworkError("offline"); },
});
assert.deepEqual(networkFailure.pending, pending);
assert(networkFailure.syncError instanceof LearningNetworkError);
console.log("PASS: failed reconciliation retains retry identity and answer");

for (const status of [400, 401, 409, 429, 500]) {
  let removed = false;
  const failure = await restoreLearningActivity(undefined, {
    fetch: async () => activity("current"), readPending: () => pending,
    clearPending: () => { removed = true; },
    submit: async () => { throw new LearningRequestError("test failure", status); },
  });
  const retryable = [401, 429, 500].includes(status);
  assert.equal(removed, !retryable);
  assert.equal(Boolean(failure.pending), retryable);
  assert(failure.syncError instanceof LearningRequestError);
}
console.log("PASS: definitive rejections unblock activity; expired authentication, throttling and server failures retain retry key");

const delayed = deferred<LearningResponse>();
let calls = 0;
const submit = async () => { calls++; return delayed.promise; };
const first = submitPendingAnswer(pending, submit);
const duplicate = submitPendingAnswer(pending, submit);
assert.equal(first, duplicate);
await Promise.resolve();
assert.equal(calls, 1);
let fetchedDuringSubmission = false;
const navigation = restoreLearningActivity(undefined, {
  fetch: async () => { fetchedDuringSubmission = true; return activity("after-navigation"); },
  readPending: () => null, clearPending: () => {}, submit,
});
await Promise.resolve();
assert.equal(fetchedDuringSubmission, false);
delayed.resolve(activity("committed"));
await first;
assert.equal((await navigation).data.decision.id, "after-navigation");
console.log("PASS: duplicate submissions deduplicated; navigation waits for in-flight mutation");

const gate = deferred<LearningResponse>();
const subjects: string[] = [];
const deps = {
  fetch: async (subject?: string) => { subjects.push(subject!); return subject === "old-subject" ? gate.promise : activity("new-subject"); },
  readPending: () => null, clearPending: () => {}, submit: async () => activity("unused"),
};
const oldNavigation = restoreLearningActivity("old-subject", deps);
const newNavigation = restoreLearningActivity("new-subject", deps);
await new Promise((resolve) => setImmediate(resolve));
assert.deepEqual(subjects, ["old-subject"]);
gate.resolve(activity("old-subject"));
await oldNavigation;
assert.equal((await newNavigation).data.decision.id, "new-subject");
assert.deepEqual(subjects, ["old-subject", "new-subject"]);
console.log("PASS: delayed navigation cannot overwrite final server subject context");

let followup = 0;
const fallback = await restoreLearningActivity(undefined, {
  fetch: async () => { if (++followup > 1) throw new LearningNetworkError("offline after commit"); return activity("before"); },
  readPending: () => null, clearPending: () => {}, submit: async () => activity("committed-current"),
}, pending);
assert.equal(fallback.data.decision.id, "committed-current");
assert.equal(fallback.pending, undefined);
assert(fallback.syncError instanceof LearningNetworkError);
console.log("PASS: storage-unavailable retry and committed-response fallback");

const originalFetch = globalThis.fetch;
globalThis.fetch = async (_url, options) => {
  assert.equal(options?.cache, "no-store");
  return new Response(JSON.stringify(activity("fresh")), { status: 200 });
};
try { assert.equal((await fetchLearningSession("math")).decision.id, "fresh"); }
finally { globalThis.fetch = originalFetch; }
console.log("PASS: authoritative activity fetch bypasses browser cache");

// Reconciliation of an earlier number-pattern answer must not replace a
// newly selected Fractions lesson, even if the final GET goes offline.
for (const offlineAfterCommit of [false, true]) {
  const selections: Array<[string | undefined, string | undefined]> = [];
  const fractions = activity("fractions-explanation");
  fractions.decision.competencyId = "fractions";
  let calls = 0, submitted = 0, removed = 0;
  const result = await restoreLearningActivity("math", {
    fetch: async (subject, topic) => {
      selections.push([subject, topic]);
      if (++calls === 2 && offlineAfterCommit) throw new LearningNetworkError("offline after earlier answer committed");
      return fractions;
    },
    readPending: () => pending,
    clearPending: key => { assert.equal(key, pending.clientRequestId); removed++; },
    submit: async body => { assert.equal(body.clientRequestId, pending.clientRequestId); submitted++; return activity("number-pattern-response"); },
  }, undefined, "fractions");
  assert.deepEqual(selections, [["math", "fractions"], ["math", "fractions"]]);
  assert.equal(result.data.decision.competencyId, "fractions");
  assert.equal(submitted, 1); assert.equal(removed, 1);
  assert.equal(Boolean(result.syncError), offlineAfterCommit);
}
console.log("PASS: pending answer reconciliation preserves explicit topic selection and idempotency");
