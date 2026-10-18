import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { POST as register } from "../apps/learner/app/api/account/register/route";
import { POST as addLearner } from "../apps/learner/app/api/account/learners/route";
import { POST as login } from "../apps/learner/app/api/session/login/route";
import { POST as logout } from "../apps/learner/app/api/session/logout/route";
import { GET as learning, POST as learningPost } from "../apps/learner/app/api/learning/route";
import { POST as tutoring } from "../apps/learner/app/api/tutoring/conversation/route";
import { getLearnerInterventions, createIntervention } from "../services/intervention-store";
import { persistenceStore } from "../services/persistence-provider";
import { loadConversationContext } from "../services/edututor/conversation-context";
import type { LearningResponse } from "../apps/learner/services/learning-client";
import type { ConversationResponse } from "../packages/ai/conversation";

assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true, configurable: true, enumerable: true });
process.env.FILUMIRE_AUTH_JWT_SECRET = "test-only-tutoring-signing-secret-at-least-32-chars";
process.env.FILUMIRE_ACCOUNT_REGISTRATION = "open";
const run = randomUUID().slice(0, 8);
function post(path: string, body: unknown, cookie?: string, extra: Record<string, string> = {}) {
  return new Request(`http://localhost${path}`, { method: "POST", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...extra }, body: JSON.stringify(body) });
}
function cookie(response: Response) {
  const match = response.headers.get("set-cookie")?.match(/filumire_auth_session=([^;]*)/);
  assert(match); return `filumire_auth_session=${match[1]}`;
}
function ask(language = "en", historyToken?: string) { return { language, question: language === "fr" ? "Explique-moi cette étape" : "Explain this step", requestId: randomUUID(), historyToken }; }
const registration = await register(post("/api/account/register", {
  email: `tutor-${run}@example.test`, password: "test-guardian-password", displayName: "Fictional Guardian", preferredLanguage: "en", confirmsGuardian: true, acceptsNotice: true,
}));
assert.equal(registration.status, 201); const guardian = cookie(registration);
assert.equal((await tutoring(post("/api/tutoring/conversation", ask(), guardian))).status, 401, "guardian with no selected learner cannot tutor");
async function learner(suffix: string) {
  const username = `tutor.${run}.${suffix}`;
  const added = await addLearner(post("/api/account/learners", { displayName: "Fictional Learner", username, password: "test-learner-password", preferredLanguage: "fr", consentsToLearnerData: true }, guardian));
  assert.equal(added.status, 201);
  const { learnerId } = await added.json() as { learnerId: string };
  const signedIn = await login(post("/api/session/login", { login: username, password: "test-learner-password" }));
  assert.equal(signedIn.status, 200); return { learnerId, cookie: cookie(signedIn), username };
}
const a = await learner("a"); const b = await learner("b");
assert.equal((await tutoring(post("/api/tutoring/conversation", ask(), undefined, { "x-filumire-learner-id": a.learnerId }))).status, 401, "production never trusts a development header");
const lesson = await learning(new Request("http://localhost/api/learning", { headers: { cookie: a.cookie } }));
assert.equal(lesson.status, 200); const opened = await lesson.json() as LearningResponse;
// Teaching-first: the topic opens with its explanation; "Check my knowledge first" starts the protected diagnosis.
const checking = await learningPost(post("/api/learning", { sessionId: opened.decision.sessionId, competencyId: opened.decision.competencyId, interactionType: "check_first" }, a.cookie));
assert.equal(checking.status, 200); const data = await checking.json() as LearningResponse;
const initial = await tutoring(post("/api/tutoring/conversation", ask("fr"), a.cookie));
assert.equal(initial.status, 200); const history = await initial.json() as ConversationResponse;
assert.equal(history.assessmentProtected, true); assert.equal(history.messages.at(-1)!.language, "fr");
assert.equal((await tutoring(post("/api/tutoring/conversation", ask("fr", history.historyToken), b.cookie))).status, 409);
for (const intervention of await getLearnerInterventions(a.learnerId)) {
  if (intervention.status === "active") await persistenceStore.saveIntervention({ ...intervention, status: "cancelled" });
}
await createIntervention({ learnerId: a.learnerId, competencyId: data.decision.competencyId, sessionId: data.decision.sessionId, decisionId: "fictional-teaching", type: "teach" });
const trusted = await loadConversationContext(a.learnerId, "fr");
assert.equal(trusted.assessmentProtected, false); assert(trusted.providerContext.teaching.length > 0, "existing French instructional content is reusable");
const teaching = await tutoring(post("/api/tutoring/conversation", ask("fr", history.historyToken), a.cookie));
assert.equal(teaching.status, 200); const reply = await teaching.json() as ConversationResponse;
assert.equal(reply.messages.length, 4); assert.equal(reply.provider, "curriculum");
assert.match(reply.messages.at(-1)!.text, /leçon|étape/);
const otherAssessment = await createIntervention({ learnerId: a.learnerId, competencyId: "math-b4-number-patterns-002", sessionId: data.decision.sessionId, decisionId: "fictional-other-assessment", type: "practice" });
assert.equal((await loadConversationContext(a.learnerId, "fr")).assessmentProtected, true, "an active scored intervention in another tab/competency must also block teaching");
await persistenceStore.saveIntervention({ ...otherAssessment, status: "cancelled" });
assert.equal((await logout(post("/api/session/logout", {}, a.cookie))).status, 200);
assert.equal((await tutoring(post("/api/tutoring/conversation", ask(), a.cookie))).status, 401, "revoked sessions cannot read tutoring");
const returned = await login(post("/api/session/login", { login: a.username, password: "test-learner-password" }));
assert.equal(returned.status, 200);
assert.equal((await tutoring(post("/api/tutoring/conversation", ask("en", reply.historyToken), cookie(returned)))).status, 409, "old conversation is not reusable in a new account session");
let lastStatus = 0;
for (let i = 0; i < 22; i++) lastStatus = (await tutoring(post("/api/tutoring/conversation", ask(), cookie(returned)))).status;
assert.equal(lastStatus, 429, "real shared limiter restricts repeated tutoring calls");
console.log("PASS: actual production cookie authentication, French teaching context, cross-learner rejection, logout, returning sessions and real rate limiting (memory only)");
