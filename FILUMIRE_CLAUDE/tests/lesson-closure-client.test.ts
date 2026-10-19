import assert from "node:assert/strict";
import { closureScope, readLessonClosure, saveLessonClosure, clearLessonClosure, fetchLessonClosure, ClosureRequestError } from "../apps/learner/services/lesson-closure-client";
import { signOut, selectLearner } from "../apps/learner/services/account-client";
assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
const storage = new Map<string, string>();
Object.assign(globalThis, { window: { sessionStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) },
  localStorage: { getItem: () => null, removeItem: () => {}, setItem: () => {} }, location: { search: "" }, dispatchEvent: () => true }, document: { cookie: "" } });
const scope = closureScope("fictional-a", "math");
const pending = { scope, receipt: "signed-delivery-receipt", phase: "pending" as const, expiresAt: Date.now() + 60000 };
saveLessonClosure(pending); assert.deepEqual(readLessonClosure(scope), pending, "lost acknowledgement response survives refresh without storing fabricated completion");
assert.equal(readLessonClosure(closureScope("fictional-b", "math")), undefined);
assert.equal(readLessonClosure(closureScope("fictional-a", "science")), undefined);
saveLessonClosure({ ...pending, scope: closureScope("fictional-a", "math", "number-patterns") });
assert.equal(readLessonClosure(closureScope("fictional-a", "math", "fractions")), undefined, "same-subject topic navigation cannot restore another topic's summary");
storage.set("filumire.lessonClosure", JSON.stringify({ ...pending, scope: JSON.stringify(["fictional-a", "math"]) }));
assert.equal(readLessonClosure(closureScope("fictional-a", "math", "fractions")), undefined, "legacy subject-only receipts cannot be restored into a topic");
saveLessonClosure({ ...pending, phase: "review" }); assert.equal(readLessonClosure(scope)?.phase, "review");
saveLessonClosure({ ...pending, phase: "dismissed" }); assert.equal(readLessonClosure(scope)?.phase, "dismissed", "returning to the lesson cannot reshow an already dismissed summary");
saveLessonClosure({ ...pending, expiresAt: Date.now() - 1 }); assert.equal(readLessonClosure(scope), undefined);
let sent: RequestInit | undefined;
globalThis.fetch = async (_url, init) => { sent = init; return Response.json({ interventionId: "i", language: "fr", summary: {}, evidence: {} }); };
await fetchLessonClosure(pending.receipt, "fr");
assert.equal(sent!.cache, "no-store"); assert.equal(sent!.credentials, "same-origin");
assert.deepEqual(JSON.parse(sent!.body as string), { receipt: pending.receipt, language: "fr" });
globalThis.fetch = async () => { throw new Error("offline"); };
await assert.rejects(() => fetchLessonClosure(pending.receipt, "en"), (error) => error instanceof ClosureRequestError && error.status === 0);
globalThis.fetch = async () => Response.json({ code: "lesson_not_completed" }, { status: 409 });
await assert.rejects(() => fetchLessonClosure(pending.receipt, "en"), (error) => error instanceof ClosureRequestError && error.code === "lesson_not_completed");
globalThis.fetch = async () => Response.json({});
for (const action of [() => signOut(), () => selectLearner("fictional-b")]) {
  saveLessonClosure(pending); await action(); assert.equal(readLessonClosure(scope), undefined);
}
clearLessonClosure();
console.log("PASS: refresh/navigation phases, pending receipt recovery, learner/subject isolation, expiry, readonly transport, errors and account cleanup");
