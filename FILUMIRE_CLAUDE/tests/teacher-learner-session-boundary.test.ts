import assert from "node:assert/strict";
import { mock } from "node:test";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

// A teacher link grants review through the teacher pages, never a session
// that learns as the learner. Offline: memory store, PostgreSQL forbidden.
process.env.FILUMIRE_PERSISTENCE = "memory";
process.env.DATABASE_URL = "postgresql://unused:unused@database.invalid/unused";
process.env.FILUMIRE_AUTH_JWT_SECRET = "test-only-teacher-session-boundary-secret-32";
Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true, writable: true, enumerable: true });
const issuer = "https://identity.example.test";
const { privateKey, publicKey } = await generateKeyPair("RS256");
const jwk = { ...await exportJWK(publicKey), kid: "teacher-boundary" };
process.env.FILUMIRE_EXTERNAL_AUTH_JWKS = JSON.stringify({ keys: [jwk] });
process.env.FILUMIRE_EXTERNAL_AUTH_ISSUER = issuer;
process.env.FILUMIRE_EXTERNAL_AUTH_AUDIENCE = "filumire-session-issuer";

const { pool } = await import("../services/database");
mock.method(pool, "query", () => { throw new Error("PostgreSQL forbidden"); });
mock.method(pool, "connect", () => { throw new Error("PostgreSQL forbidden"); });
mock.method(console, "warn", () => undefined);
mock.method(console, "error", () => undefined);
const { persistenceStore } = await import("../services/persistence-provider");
const { resolveOrCreatePrincipalForExternalIdentity, createPrincipalLearnerAccess } = await import("../services/principal");
const { issueSessionForPrincipal, resolveSignedInSession } = await import("../services/identity");
const { POST: issue } = await import("../apps/learner/app/api/session/issue/route");
const { GET } = await import("../apps/learner/app/api/learning/route");

const token = (subject: string) => new SignJWT()
  .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
  .setIssuer(issuer).setAudience("filumire-session-issuer")
  .setSubject(subject).setIssuedAt().setExpirationTime("1h").sign(privateKey);
const issueRequest = async (subject: string, learnerId: string, address: string) =>
  issue(new Request("https://learner.example.test/api/session/issue", {
    method: "POST",
    headers: { authorization: `Bearer ${await token(subject)}`, "content-type": "application/json", "x-forwarded-for": address },
    body: JSON.stringify({ learnerId }),
  }));
const sessionCookie = (response: Response) =>
  (response.headers.get("set-cookie") ?? "").split(/,(?=\s*filumire_)/)
    .map((part) => part.split(";")[0].trim()).find((part) => part.startsWith("filumire_auth_session="));
const learningRequest = (cookie: string) =>
  new Request("https://learner.example.test/api/learning?dashboard=1", { headers: { cookie } });

const learnerId = "learner-teacher-boundary";
await persistenceStore.ensureLearnerExists(learnerId);
const teacher = await resolveOrCreatePrincipalForExternalIdentity(issuer, "boundary-teacher");
await createPrincipalLearnerAccess("access-boundary-teacher", teacher, learnerId, "teacher");
const self = await resolveOrCreatePrincipalForExternalIdentity(issuer, "boundary-self");
await createPrincipalLearnerAccess("access-boundary-self", self, learnerId, "self");

// 1. External sign-in with only a teacher link issues no learner session.
const refused = await issueRequest("boundary-teacher", learnerId, "203.0.113.21");
assert.ok(refused.status >= 400, `teacher link was issued a learner session (${refused.status})`);
assert.equal(sessionCookie(refused), undefined);

// 2. A teacher-bound learner session issued before this rule is refused on use.
const legacy = await issueSessionForPrincipal(teacher, learnerId);
const legacyCookie = `filumire_auth_session=${legacy.token}`;
assert.equal((await GET(learningRequest(legacyCookie))).status, 401, "learning API accepted a teacher-bound session");
await assert.rejects(resolveSignedInSession(new Request("https://learner.example.test/", { headers: { cookie: legacyCookie } })));

// 3. The learner's own external identity still learns as the learner.
const allowed = await issueRequest("boundary-self", learnerId, "203.0.113.22");
assert.equal(allowed.status, 201);
const allowedCookie = sessionCookie(allowed);
assert.ok(allowedCookie);
assert.equal((await GET(learningRequest(allowedCookie))).status, 200);

console.log("PASS teacher/learner session boundary: teacher links never learn as the learner; self links still do (memory only)");
