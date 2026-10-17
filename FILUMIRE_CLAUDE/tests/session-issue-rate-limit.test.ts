import assert from "node:assert/strict";
import { mock } from "node:test";
import { exportJWK, generateKeyPair, jwtVerify, SignJWT } from "jose";

// Import handlers only after forcing an isolated, offline environment. No env
// files, remote JWKS, or PostgreSQL connections are used by this suite.
process.env.FILUMIRE_PERSISTENCE = "memory";
process.env.DATABASE_URL = "postgresql://unused:unused@database.invalid/unused";
process.env.FILUMIRE_AUTH_JWT_SECRET = "test-only-session-issue-rate-limit-secret-at-least-32";
Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true, writable: true, enumerable: true });
const issuer = "https://identity.example.test";
const { privateKey, publicKey } = await generateKeyPair("RS256");
const publicJwk = { ...await exportJWK(publicKey), kid: "offline-rate-limit-key" };
process.env.FILUMIRE_EXTERNAL_AUTH_JWKS = JSON.stringify({ keys: [publicJwk] });
process.env.FILUMIRE_EXTERNAL_AUTH_ISSUER = issuer;
process.env.FILUMIRE_EXTERNAL_AUTH_AUDIENCE = "filumire-session-issuer";

const { pool } = await import("../services/database");
const queryMock = mock.method(pool, "query", () => { throw new Error("Database queries are forbidden"); });
const connectMock = mock.method(pool, "connect", () => { throw new Error("Database connections are forbidden"); });
const { POST: issue } = await import("../apps/learner/app/api/session/issue/route");
const { persistenceStore } = await import("../services/persistence-provider");
const { consumeRateLimit, resetRateLimits } = await import("../services/account/rate-limit");
const { resolveOrCreatePrincipalForExternalIdentity, createPrincipalLearnerAccess } = await import("../services/principal");
const { getPrincipalAuthSession } = await import("../services/auth-session");

const subject = "offline-rate-limit-subject";
const principalId = await resolveOrCreatePrincipalForExternalIdentity(issuer, subject);
const learnerId = "learner-session-rate-limit";
await persistenceStore.ensureLearnerExists(learnerId);
await createPrincipalLearnerAccess("access-session-rate-limit", principalId, learnerId, "self");
const makeToken = (sub: string) => new SignJWT()
  .setProtectedHeader({ alg: "RS256", kid: publicJwk.kid })
  .setIssuer(issuer).setAudience("filumire-session-issuer")
  .setSubject(sub).setIssuedAt().setExpirationTime("1h").sign(privateKey);
const token = await makeToken(subject);
const unlinkedToken = await makeToken("offline-unlinked-subject");
const request = (address?: string, bearer?: string, extra: Record<string, string> = {}) =>
  new Request("https://learner.example.test/api/session/issue", {
    method: "POST",
    headers: { ...(address ? { "x-forwarded-for": address } : {}),
      ...(bearer ? { authorization: `Bearer ${bearer}` } : {}), ...extra },
  });
const principalSpy = mock.method(persistenceStore, "resolveOrCreatePrincipalForExternalIdentity");
const sessionSpy = mock.method(persistenceStore, "createPrincipalAuthSession");
const warningMock = mock.method(console, "warn", () => undefined);
const errorMock = mock.method(console, "error", () => undefined);
let checks = 0;
function noSession(response: Response, status: number) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("set-cookie"), null);
}
async function limited(response: Response) {
  noSession(response, 429);
  assert.equal((await response.json()).code, "rate_limited");
  const retry = Number(response.headers.get("retry-after"));
  assert(retry > 0 && retry <= 900, "Retry-After stays inside the fifteen-minute budget");
}

try {
  await resetRateLimits();
  const valid = await issue(request("192.0.2.1", token));
  assert.equal(valid.status, 201);
  assert.equal(valid.headers.get("cache-control"), "no-store");
  const cookie = valid.headers.get("set-cookie")!;
  for (const attribute of ["HttpOnly", "Secure", "SameSite=Strict", "Path=/", "Max-Age=604800"]) {
    assert(cookie.includes(attribute));
  }
  const internalToken = decodeURIComponent(cookie.match(/filumire_auth_session=([^;]+)/)![1]);
  const verified = await jwtVerify(internalToken, new TextEncoder().encode(process.env.FILUMIRE_AUTH_JWT_SECRET), {
    algorithms: ["HS256"], issuer: "filumire-learner", audience: "filumire-learner-api",
  });
  const body = await valid.json();
  assert.equal(verified.payload.sub, principalId);
  assert.equal(verified.payload.learner_id, learnerId);
  assert.equal((await getPrincipalAuthSession(body.sessionId))?.status, "active");
  noSession(await issue(request("192.0.2.1", "invalid-token")), 401);
  noSession(await issue(request("192.0.2.1", unlinkedToken)), 403);
  checks++;

  await resetRateLimits();
  principalSpy.mock.resetCalls();
  sessionSpy.mock.resetCalls();
  // Invalid and missing credentials consume the same address budget. Changing
  // a token, claimed identity, or downstream proxy suffix cannot escape it.
  for (let attempt = 0; attempt < 30; attempt++) {
    noSession(await issue(request("192.0.2.10", attempt % 2 ? "invalid-token" : undefined)), 401);
  }
  await limited(await issue(request("192.0.2.10", token)));
  await limited(await issue(request("192.0.2.10, 198.51.100.1", unlinkedToken)));
  assert.equal(principalSpy.mock.callCount(), 0, "throttling precedes principal creation");
  assert.equal(sessionSpy.mock.callCount(), 0, "throttling precedes session creation");
  assert.equal((await issue(request("192.0.2.11", token))).status, 201, "another address has its own budget");
  for (let attempt = 0; attempt < 30; attempt++) {
    assert((await consumeRateLimit("login:ip:192.0.2.10", 30, 900_000)).allowed,
      "external issuance does not consume the password-login scope");
  }
  checks++;

  // No sleep or JWT expiry manipulation: exercise only an unauthenticated
  // request after advancing the limiter's clock past its window.
  const timeMock = mock.method(Date, "now", () => new Date().getTime() + 900_001);
  try {
    noSession(await issue(request("192.0.2.10")), 401);
  } finally { timeMock.mock.restore(); }
  checks++;

  await resetRateLimits();
  principalSpy.mock.resetCalls();
  sessionSpy.mock.resetCalls();
  const concurrent = await Promise.all(Array.from({ length: 40 }, () => issue(request("192.0.2.20", token))));
  assert.equal(concurrent.filter(response => response.status === 201).length, 30);
  const throttled = concurrent.filter(response => response.status === 429);
  assert.equal(throttled.length, 10);
  for (const response of throttled) await limited(response);
  assert.equal(principalSpy.mock.callCount(), 30);
  assert.equal(sessionSpy.mock.callCount(), 30);
  checks++;

  await resetRateLimits();
  for (let attempt = 0; attempt < 30; attempt++) noSession(await issue(request()), 401);
  await limited(await issue(request(undefined, token)));
  assert.equal((await issue(request(undefined, token, { "x-real-ip": "192.0.2.30" }))).status, 201);
  checks++;

  // Simulate unavailable limiter storage without adding a production bypass or
  // dependency-injection option to the authentication route.
  await resetRateLimits();
  principalSpy.mock.resetCalls();
  sessionSpy.mock.resetCalls();
  const windows = (globalThis as { __filumireRateLimitWindows?: Map<string, unknown> }).__filumireRateLimitWindows;
  assert(windows);
  const failureMock = mock.method(windows, "get", () => { throw new Error("limiter storage unavailable"); });
  try {
    noSession(await issue(request("192.0.2.40", token)), 500);
    assert.equal(principalSpy.mock.callCount(), 0);
    assert.equal(sessionSpy.mock.callCount(), 0);
  } finally { failureMock.mock.restore(); }
  assert.equal((await issue(request("192.0.2.40", token))).status, 201, "storage recovery restores issuance");
  checks++;

  assert.equal(queryMock.mock.callCount(), 0);
  assert.equal(connectMock.mock.callCount(), 0);
  console.log(`PASS: external session issuance — ${checks} rate-limit/authentication scenarios (memory only)`);
} finally {
  await resetRateLimits();
  mock.restoreAll();
  await pool.end();
}
