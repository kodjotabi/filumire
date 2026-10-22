import assert from "node:assert/strict";

import { POST as register } from "../apps/learner/app/api/account/register/route";
import { POST as addLearner } from "../apps/learner/app/api/account/learners/route";
import { GET as placementOptions, POST as place } from "../apps/learner/app/api/account/learners/[learnerId]/placement/route";
import { POST as login } from "../apps/learner/app/api/session/login/route";
import { GET as learning } from "../apps/learner/app/api/learning/route";
import { GET as presentationScope } from "../apps/learner/app/api/presentation-scope/route";
import { resetRateLimits } from "../services/account/rate-limit";
import { getEvidenceForLearner } from "../services/evidence-store";
import { getLearnerLearningContext } from "../services/learner-context";
import { seedContent } from "../services/content-store/seed";
import { PRIVATE_JHS_SCOPE } from "../packages/curriculum/jhs-private-policy";

/*
 * Switching the Basic 7–9 private presentation off strands nobody silently:
 * a placed learner gets 409 class_unavailable (no migration, no evidence
 * rewrite) and the guardian returns them to a primary class.
 * In-memory persistence only.
 */

if ((process.env.FILUMIRE_PERSISTENCE ?? "memory") !== "memory") {
  throw new Error("jhs-private-rollback test runs on in-memory persistence only");
}

function setEnv(name: string, value: string | undefined): void {
  Object.defineProperty(process.env, name, { configurable: true, enumerable: true, writable: true, value });
}

setEnv("NODE_ENV", "production");
setEnv("FILUMIRE_AUTH_JWT_SECRET", "test-only-jhs-private-rollback-secret-32-chars");
setEnv("FILUMIRE_ACCOUNT_REGISTRATION", "open");
setEnv("FILUMIRE_JHS_MODE", "private-presentation");

const run = Date.now().toString(36);
const origin = "http://localhost";

function request(method: string, path: string, body: unknown, cookie?: string): Request {
  return new Request(`${origin}${path}`, {
    method,
    headers: { "content-type": "application/json", origin, "sec-fetch-site": "same-origin", ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function cookieFrom(response: Response): string {
  const match = (response.headers.get("set-cookie") ?? "").match(/filumire_auth_session=([^;]*)/);
  assert(match?.[1], "response sets a session cookie");
  return `filumire_auth_session=${match[1]}`;
}

const params = (learnerId: string) => ({ params: Promise.resolve({ learnerId }) });

async function main(): Promise<void> {
  seedContent();
  const scopeOn = await (await presentationScope()).json();
  assert.deepEqual(scopeOn, { enabled: true, authored: 42, mapped: 625 });

  const registered = await register(request("POST", "/api/account/register", {
    email: `jhs.rollback.${run}@example.test`, password: "family-test-pass-1", displayName: "Test Guardian",
    preferredLanguage: "en", confirmsGuardian: true, acceptsNotice: true,
  }));
  assert.equal(registered.status, 201);
  const guardian = cookieFrom(registered);
  const username = `ama.${run}`.slice(0, 24), password = "ama-test-pass-1";
  const added = await addLearner(request("POST", "/api/account/learners", {
    displayName: "Ama", username, password, consentsToLearnerData: true, gradeId: "level-gh-basic-5-pilot",
  }, guardian));
  assert.equal(added.status, 201);
  const { learnerId } = (await added.json()) as { learnerId: string };
  await resetRateLimits();
  const learner = cookieFrom(await login(request("POST", "/api/session/login", { login: username, password })));

  const row = PRIVATE_JHS_SCOPE[0];
  const target = { curriculumVersionId: "curriculum-version-gh-nacca-ccp-2020", gradeId: row.gradeId, subjectId: row.subjectId };
  assert.equal((await place(request("POST", `/api/account/learners/${learnerId}/placement`, target, guardian), params(learnerId))).status, 200);
  assert.equal((await learning(request("GET", "/api/learning?dashboard=1", undefined, learner))).status, 200);
  const lesson = await learning(request("GET", "/api/learning", undefined, learner));
  assert.equal(lesson.status, 200);
  console.log({ test: "placed JHS learner learns while the presentation is on", result: "PASS" });

  // Presentation switched off (server restart with the setting removed).
  setEnv("FILUMIRE_JHS_MODE", undefined);
  assert.deepEqual(await (await presentationScope()).json(), { enabled: false });
  const contextBefore = await getLearnerLearningContext(learnerId);
  const evidenceBefore = await getEvidenceForLearner(learnerId);
  for (const path of ["/api/learning?dashboard=1", "/api/learning"]) {
    const response = await learning(request("GET", path, undefined, learner));
    assert.equal(response.status, 409, path);
    const body = (await response.json()) as { code?: string; error?: string };
    assert.equal(body.code, "class_unavailable", path);
    assert.match(body.error ?? "", /Ask your parent or guardian/);
  }
  assert.deepEqual(await getLearnerLearningContext(learnerId), contextBefore, "nothing migrated");
  assert.deepEqual(await getEvidenceForLearner(learnerId), evidenceBefore, "no evidence rewritten");
  console.log({ test: "stranded learner gets 409 class_unavailable; context and evidence unchanged", result: "PASS" });

  const options = (await (await placementOptions(request("GET", `/api/account/learners/${learnerId}/placement`, undefined, guardian), params(learnerId))).json()) as {
    choices: { curriculumVersionId: string; gradeId: string; draft: boolean; subjects: { id: string }[] }[];
    current?: { gradeId: string };
  };
  assert.equal(options.current?.gradeId, row.gradeId);
  assert.equal(options.choices.some(choice => choice.draft), false);
  const primary = options.choices.find(choice => choice.gradeId === "level-gh-basic-5-pilot")!;
  const back = await place(request("POST", `/api/account/learners/${learnerId}/placement`, {
    curriculumVersionId: primary.curriculumVersionId, gradeId: primary.gradeId, subjectId: primary.subjects[0].id,
  }, guardian), params(learnerId));
  assert.equal(back.status, 200);
  assert.equal((await learning(request("GET", "/api/learning?dashboard=1", undefined, learner))).status, 200);
  assert.deepEqual(await getEvidenceForLearner(learnerId), evidenceBefore, "returning keeps evidence");
  console.log({ test: "guardian returns the learner to Basic 5; learning resumes", result: "PASS" });
}

main().then(() => console.log("PASS jhs-private-rollback")).catch((error) => {
  console.error(error);
  process.exit(1);
});
