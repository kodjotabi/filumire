import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { POST as register } from "../apps/learner/app/api/account/register/route";
import { POST as addLearner } from "../apps/learner/app/api/account/learners/route";
import { POST as login } from "../apps/learner/app/api/session/login/route";
import { POST as logout } from "../apps/learner/app/api/session/logout/route";
import { GET, POST } from "../apps/learner/app/api/learning/route";
import { POST as closurePost } from "../apps/learner/app/api/learning/closure/route";
import { getContent } from "../services/content-store";
import { getLearnerState } from "../services/learner-state-store";
import { getEvidenceForLearner } from "../services/evidence-store";
import type { LearningResponse } from "../apps/learner/services/learning-client";
import type { LessonClosure } from "../packages/contracts/lesson-closure";

assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true, writable: true, enumerable: true });
process.env.FILUMIRE_AUTH_JWT_SECRET = "fictional-closure-test-secret-more-than-32-characters";
process.env.FILUMIRE_ACCOUNT_REGISTRATION = "open";
const run = randomUUID().slice(0, 8);
function request(path: string, body: unknown, cookie?: string, extra: Record<string, string> = {}) {
  return new Request(`http://localhost${path}`, { method: "POST", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...extra }, body: JSON.stringify(body) });
}
function cookie(response: Response) { const match = response.headers.get("set-cookie")?.match(/filumire_auth_session=([^;]*)/); assert(match); return `filumire_auth_session=${match[1]}`; }
const guardianResponse = await register(request("/api/account/register", { email: `closure-${run}@example.test`, password: "fictional-password-123", displayName: "Fictional Guardian", confirmsGuardian: true, acceptsNotice: true, preferredLanguage: "en" }));
assert.equal(guardianResponse.status, 201); const guardian = cookie(guardianResponse);
async function learner(suffix: string) {
  const username = `closure.${run}.${suffix}`;
  const added = await addLearner(request("/api/account/learners", { displayName: "Fictional Learner", username, password: "fictional-password-123", preferredLanguage: "fr", consentsToLearnerData: true }, guardian));
  assert.equal(added.status, 201); const { learnerId } = await added.json() as { learnerId: string };
  const logged = await login(request("/api/session/login", { login: username, password: "fictional-password-123" }));
  assert.equal(logged.status, 200); return { learnerId, cookie: cookie(logged), username };
}
const a = await learner("a"), b = await learner("b");
const initial = await GET(new Request("http://localhost/api/learning", { headers: { cookie: a.cookie } }));
assert.equal(initial.status, 200); let data = await initial.json() as LearningResponse;
for (let i = 0; !data.lessonReceipt && i < 4; i++) {
  const content = getContent(data.content!.id)!; assert(content.assessmentItemId);
  const wrong = JSON.parse(content.metadata!.options!).find((item: string) => item !== content.metadata!.expectedResponse);
  const result = await POST(request("/api/learning", { sessionId: data.decision.sessionId, competencyId: data.decision.competencyId,
    interventionId: data.decision.interventionId, assessmentItemId: content.assessmentItemId, response: wrong, clientRequestId: randomUUID() }, a.cookie));
  assert.equal(result.status, 200); data = await result.json() as LearningResponse;
}
assert(data.lessonReceipt); const receipt = data.lessonReceipt;
const beforeState = JSON.stringify(await getLearnerState(a.learnerId, data.decision.competencyId));
const beforeEvidence = JSON.stringify(await getEvidenceForLearner(a.learnerId));
const ack = { interactionType: "acknowledge", sessionId: data.decision.sessionId, competencyId: data.decision.competencyId, interventionId: data.decision.interventionId };
// Two actual simultaneous requests preserve the existing acknowledgement/check safeguards.
const replies = await Promise.all([POST(request("/api/learning", ack, a.cookie)), POST(request("/api/learning", ack, a.cookie))]);
assert(replies.every((response) => response.status === 200));
assert.equal(JSON.stringify(await getLearnerState(a.learnerId, data.decision.competencyId)), beforeState);
assert.equal(JSON.stringify(await getEvidenceForLearner(a.learnerId)), beforeEvidence);
for (const language of ["en", "fr"]) {
  const summary = await closurePost(request("/api/learning/closure", { receipt, language }, a.cookie));
  assert.equal(summary.status, 200); const model = await summary.json() as LessonClosure;
  assert.equal(model.summary.available, true); assert(model.summary.narration.length > 0); assert.equal(model.language, language);
  if (language === "fr") assert.match(model.summary.narration, /suite|nombres|règle/);
}
// Next can construct an internal localhost URL even when the browser connects
// to 127.0.0.1. Match the actual Host, without trusting forwarded host input.
const previousVercel = process.env.VERCEL;
try {
  delete process.env.VERCEL;
  const originCases: Array<[string, string, Record<string, string>, number]> = [
    ["loopback Host differs from internal URL", "http://localhost:3228", { host: "127.0.0.1:3228", origin: "http://127.0.0.1:3228", "sec-fetch-site": "same-origin" }, 200],
    ["localhost", "http://localhost:3228", { host: "localhost:3228", origin: "http://localhost:3228" }, 200],
    ["hosted same-origin", "https://learner.example.test", { host: "learner.example.test", origin: "https://learner.example.test" }, 200],
    ["foreign origin", "http://localhost:3228", { host: "127.0.0.1:3228", origin: "https://evil.example" }, 403],
    ["internal URL must not bypass Host", "http://localhost:3228", { host: "127.0.0.1:3228", origin: "http://localhost:3228" }, 403],
    ["different port", "http://localhost:3228", { host: "127.0.0.1:3228", origin: "http://127.0.0.1:3229" }, 403],
    ["different scheme", "http://localhost:3228", { host: "127.0.0.1:3228", origin: "https://127.0.0.1:3228" }, 403],
    ["cross-site even with matching origin", "http://localhost:3228", { origin: "http://localhost:3228", "sec-fetch-site": "cross-site" }, 403],
    ["same-site is not same-origin", "https://learner.example.test", { origin: "https://sibling.example.test", "sec-fetch-site": "same-site" }, 403],
    ["opaque origin", "http://localhost:3228", { origin: "null" }, 403],
    ["malformed origin", "http://localhost:3228", { origin: "not-an-origin" }, 403],
    ["forwarded host cannot override Host", "http://localhost:3228", { host: "127.0.0.1:3228", origin: "https://evil.example", "x-forwarded-host": "evil.example", "x-forwarded-proto": "https" }, 403],
  ];
  for (const [label, internalUrl, originHeaders, status] of originCases) {
    const response = await closurePost(new Request(`${internalUrl}/api/learning/closure`, { method: "POST",
      headers: { "content-type": "application/json", cookie: a.cookie, ...originHeaders }, body: JSON.stringify({ receipt, language: "en" }) }));
    assert.equal(response.status, status, label);
    const body = await response.json();
    if (status === 403) assert.equal(body.code, "invalid_origin", label);
    else assert.equal(body.competencyId, data.decision.competencyId, label);
  }
  process.env.VERCEL = "1";
  const proxied = await closurePost(new Request("http://localhost/api/learning/closure", { method: "POST",
    headers: { "content-type": "application/json", cookie: a.cookie, host: "learner.example.test", origin: "https://learner.example.test", "x-forwarded-proto": "https", "sec-fetch-site": "same-origin" },
    body: JSON.stringify({ receipt, language: "fr" }) }));
  assert.equal(proxied.status, 200, "trusted deployment protocol follows existing same-origin policy");
} finally {
  if (previousVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = previousVercel;
}
assert.equal(JSON.stringify(await getLearnerState(a.learnerId, data.decision.competencyId)), beforeState, "origin checks and summary reads preserve progress");
assert.equal(JSON.stringify(await getEvidenceForLearner(a.learnerId)), beforeEvidence, "origin checks and summary reads preserve evidence");
assert.equal((await closurePost(request("/api/learning/closure", { receipt, language: "en" }, b.cookie))).status, 404);
assert.equal((await closurePost(request("/api/learning/closure", { receipt, language: "en" }, undefined, { "x-filumire-learner-id": a.learnerId }))).status, 401);
assert.equal((await closurePost(request("/api/learning/closure", { receipt, language: "en", mastery: 1 }, a.cookie))).status, 400);
assert.equal((await logout(request("/api/session/logout", {}, a.cookie))).status, 200);
assert.equal((await closurePost(request("/api/learning/closure", { receipt, language: "en" }, a.cookie))).status, 401);
const returned = await login(request("/api/session/login", { login: a.username, password: "fictional-password-123" })); assert.equal(returned.status, 200);
assert.equal((await closurePost(request("/api/learning/closure", { receipt, language: "fr" }, cookie(returned)))).status, 200, "the same learner may verify an existing delivered lesson in a returning account session");
console.log("PASS: production-cookie isolation, real English/French authored summaries, concurrent acknowledgements, logout and returning learner verification (memory only)");
