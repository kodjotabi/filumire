// Production 29 Oct 2026: "too many connections for role filumire_app" made valid sessions
// answer 401, so learners were signed out and Ask FILU lost its learner. A session store that
// cannot be read must answer 503 and keep the session; genuine auth failures stay 401.
// The pool must also stay small enough for several Vercel instances to share the role limit.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { POST as register } from "../apps/learner/app/api/account/register/route";
import { POST as addLearner } from "../apps/learner/app/api/account/learners/route";
import { POST as selectLearner } from "../apps/learner/app/api/session/select-learner/route";
import { POST as logout } from "../apps/learner/app/api/session/logout/route";
import { GET as me } from "../apps/learner/app/api/session/me/route";
import { GET as learning } from "../apps/learner/app/api/learning/route";
import { GET as tutoringContext, POST as tutoring } from "../apps/learner/app/api/tutoring/conversation/route";
import { persistenceStore } from "../services/persistence-provider";

assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true, configurable: true, enumerable: true });
process.env.FILUMIRE_AUTH_JWT_SECRET = "test-only-session-check-signing-secret-at-least-32";
process.env.FILUMIRE_ACCOUNT_REGISTRATION = "open";
const run = randomUUID().slice(0, 8);
const get = (path: string, cookie = "") => new Request(`http://localhost${path}`, { headers: cookie ? { cookie } : {} });
const post = (path: string, body: unknown, cookie = "") => new Request(`http://localhost${path}`, {
  method: "POST", headers: { "content-type": "application/json", origin: "http://localhost", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body),
});
const sessionCookie = (response: Response) => {
  const match = response.headers.get("set-cookie")?.match(/filumire_auth_session=([^;]*)/);
  assert(match, "session cookie issued"); return `filumire_auth_session=${match[1]}`;
};
const clearsSession = (response: Response) => /filumire_auth_session=;|filumire_signed_in=;/.test(response.headers.get("set-cookie") ?? "");

const registered = await register(post("/api/account/register", {
  email: `session-check-${run}@example.test`, password: "test-guardian-password", displayName: "Fictional Guardian",
  preferredLanguage: "en", confirmsGuardian: true, acceptsNotice: true,
}));
assert.equal(registered.status, 201);
const guardian = sessionCookie(registered);
const added = await addLearner(post("/api/account/learners", {
  displayName: "Fictional Learner", username: `session.check.${run}`, password: "test-learner-password", preferredLanguage: "en", consentsToLearnerData: true,
}, guardian));
assert.equal(added.status, 201);
const { learnerId } = await added.json();
const selected = await selectLearner(post("/api/session/select-learner", { learnerId }, guardian));
assert.equal(selected.status, 200);
const learner = sessionCookie(selected);
assert.equal((await me(get("/api/session/me", learner))).status, 200);

// The session store fails as Neon does when the role has no free connections.
const realValid = persistenceStore.isPrincipalAuthSessionValid.bind(persistenceStore);
const realAccess = persistenceStore.getPrincipalLearnerAccess.bind(persistenceStore);
const exhausted = () => Promise.reject(new Error('too many connections for role "filumire_app"'));
const originalError = console.error;
console.error = () => {};
try {
  persistenceStore.isPrincipalAuthSessionValid = exhausted;
  const account = await me(get("/api/session/me", learner));
  assert.equal(account.status, 503, "session lookup: store failure is 503, not 401");
  assert.equal((await account.json()).code, "session_unavailable");
  assert.equal(clearsSession(account), false, "the session cookie is kept");
  const lesson = await learning(get("/api/learning?overview=1", learner));
  assert.notEqual(lesson.status, 401, "learning: store failure is not a sign-out");
  assert(lesson.status >= 500, "learning: store failure is refused");
  const context = await tutoringContext(get("/api/tutoring/conversation?language=en", learner));
  assert.equal(context.status, 503, "Ask FILU context: 503");
  const question = await tutoring(post("/api/tutoring/conversation", { question: "What is a noun?", language: "en", requestId: randomUUID() }, learner));
  assert.equal(question.status, 503, "Ask FILU question: 503");
  persistenceStore.isPrincipalAuthSessionValid = realValid;

  // The learner-access check after a valid session fails the same way.
  persistenceStore.getPrincipalLearnerAccess = exhausted;
  assert.equal((await me(get("/api/session/me", learner))).status, 503, "learner access lookup: 503");
  assert.equal((await tutoringContext(get("/api/tutoring/conversation?language=en", learner))).status, 503);
} finally {
  persistenceStore.isPrincipalAuthSessionValid = realValid;
  persistenceStore.getPrincipalLearnerAccess = realAccess;
  console.error = originalError;
}

// Recovered: the same session still works; nothing was signed out.
assert.equal((await me(get("/api/session/me", learner))).status, 200, "session survives the outage");
assert.equal((await tutoringContext(get("/api/tutoring/conversation?language=en", learner))).status, 200);

// Genuine authentication failures are still 401.
assert.equal((await me(get("/api/session/me"))).status, 401, "no cookie");
assert.equal((await me(get("/api/session/me", learner.slice(0, -4) + "AAAA"))).status, 401, "tampered token");
assert.equal((await tutoringContext(get("/api/tutoring/conversation?language=en", "filumire_auth_session=not-a-token"))).status, 401);
assert.equal((await logout(post("/api/session/logout", {}, learner))).status, 200);
assert.equal((await me(get("/api/session/me", learner))).status, 401, "revoked session");
assert.equal((await tutoringContext(get("/api/tutoring/conversation?language=en", learner))).status, 401);

// Pool sizing: several warm instances must fit within the role's connection limit.
const database = readFileSync(new URL("../services/database.ts", import.meta.url), "utf8");
const max = Number(database.match(/\bmax:\s*(\d+)/)?.[1]);
const idle = Number(database.match(/idleTimeoutMillis:\s*(\d+)/)?.[1]);
const roleScript = readFileSync(new URL("../scripts/create-app-role.mjs", import.meta.url), "utf8");
const CONNECTION_LIMIT = Number(roleScript.match(/export const CONNECTION_LIMIT = (\d+);/)?.[1]);
assert.equal(CONNECTION_LIMIT, 20);
assert(max >= 1 && max * 6 <= CONNECTION_LIMIT, `pool max ${max} lets at least 6 instances share ${CONNECTION_LIMIT} connections`);
assert(idle > 0 && idle <= 10000, `idle connections released within 10 s (${idle} ms)`);

console.log("PASS: session store failure is 503 and keeps the session (session/me, learning, Ask FILU); auth failures stay 401; pool fits the role limit");
