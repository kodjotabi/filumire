import assert from "node:assert/strict";
import { mock } from "node:test";
import { NextRequest } from "next/server";

// Teacher write routes accept same-origin requests only. Real production
// sessions; memory store; PostgreSQL forbidden.
process.env.FILUMIRE_PERSISTENCE = "memory";
process.env.DATABASE_URL = "postgresql://unused:unused@database.invalid/unused";
process.env.FILUMIRE_AUTH_JWT_SECRET = "test-only-teacher-write-origin-secret-at-least-32";
Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true, writable: true, enumerable: true });

const { pool } = await import("../services/database");
mock.method(pool, "query", () => { throw new Error("PostgreSQL forbidden"); });
mock.method(pool, "connect", () => { throw new Error("PostgreSQL forbidden"); });
mock.method(console, "error", () => undefined);
const { persistenceStore } = await import("../services/persistence-provider");
const { createPrincipalLearnerAccess } = await import("../services/principal");
const { issueSessionForPrincipal } = await import("../services/identity");
const { getControlledTeacherActions } = await import("../services/controlled-teacher-actions");
const { getTeacherProfessionalNotes } = await import("../services/teacher-professional-notes");
const { getEvidence } = await import("../services/evidence-store");
const { getCompetenciesForSubject, GHANA_MATH_PILOT_SUBJECT_ID } = await import("../packages/curriculum");
const actions = await import("../apps/learner/app/api/teacher/actions/route");
const notes = await import("../apps/learner/app/api/teacher/notes/route");
const observations = await import("../apps/learner/app/api/teacher/observations/route");

const ORIGIN = "https://learner.example.test";
const stamp = crypto.randomUUID();
const teacherId = `teacher-origin-${stamp}`;
const learnerId = `learner-origin-${stamp}`;
const competencyId = getCompetenciesForSubject(GHANA_MATH_PILOT_SUBJECT_ID)[0].id;
await persistenceStore.createPrincipal(teacherId);
await persistenceStore.ensureLearnerExists(learnerId);
await createPrincipalLearnerAccess(`access-origin-${stamp}`, teacherId, learnerId, "teacher");
const { token } = await issueSessionForPrincipal(teacherId);
const cookie = `filumire_auth_session=${token}`;

const send = (path: string, body: object, headers: Record<string, string>) =>
  new NextRequest(`${ORIGIN}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie, ...headers },
    body: JSON.stringify(body),
  });
const sameOrigin = { origin: ORIGIN, "sec-fetch-site": "same-origin" };
const attacks: Array<[string, Record<string, string>]> = [
  ["cross-site browser request", { origin: "https://evil.example", "sec-fetch-site": "cross-site" }],
  ["foreign Origin header", { origin: "https://evil.example" }],
  ["same-site sibling (another filumire.com site)", { origin: "https://filumire.com", "sec-fetch-site": "same-site" }],
];
const routes = [
  { name: "actions", post: actions.POST, path: "/api/teacher/actions",
    body: (id: string) => ({ learnerId, competencyId, actionType: "request_practice", reason: "origin test", clientRequestId: id }),
    count: async () => (await getControlledTeacherActions(learnerId)).length },
  { name: "notes", post: notes.POST, path: "/api/teacher/notes",
    body: (id: string) => ({ learnerId, competencyId, noteType: "context", text: "origin test", clientRequestId: id }),
    count: async () => (await getTeacherProfessionalNotes(learnerId)).length },
  { name: "observations", post: observations.POST, path: "/api/teacher/observations",
    body: (id: string) => ({ learnerId, competencyId, outcome: "correct", clientRequestId: id }),
    count: async () => (await getEvidence(learnerId, competencyId)).length },
];

for (const route of routes) {
  for (const [label, headers] of attacks) {
    const before = await route.count();
    const response = await route.post(send(route.path, route.body(`attack-${route.name}-${label}`), headers));
    assert.equal(response.status, 403, `${route.name}: ${label} returned ${response.status}`);
    assert.equal(await route.count(), before, `${route.name}: ${label} wrote data`);
  }
  // The legitimate teacher workflow, from the application itself, still writes.
  const before = await route.count();
  const ok = await route.post(send(route.path, route.body(`legit-${route.name}`), sameOrigin));
  assert.equal(ok.status, 200, `${route.name}: same-origin teacher write returned ${ok.status}`);
  assert.equal(await route.count(), before + 1, `${route.name}: same-origin write was not stored`);
}

console.log("PASS teacher write origin: actions, notes and observations refuse cross-site, foreign-origin and same-site requests; same-origin teacher writes succeed (memory only)");
