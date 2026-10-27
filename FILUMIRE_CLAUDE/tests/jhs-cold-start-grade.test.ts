import assert from "node:assert/strict";

import { POST as register } from "../apps/learner/app/api/account/register/route";
import { POST as addLearner } from "../apps/learner/app/api/account/learners/route";
import { PATCH as updateLearner } from "../apps/learner/app/api/account/learners/[learnerId]/route";
import { POST as login } from "../apps/learner/app/api/session/login/route";
import { isSupportedGrade } from "../packages/curriculum-framework";
import { PRIVATE_JHS_SCOPE } from "../packages/curriculum/jhs-private-policy";
import { saveLearnerLearningContext } from "../services/learner-context";

/*
 * A Basic 7-9 learner finishing first-time setup on a server
 * instance that has not loaded content yet (a cold start, or a
 * route bundle of its own). Nothing here seeds content first, so
 * the profile route itself must make the private presentation's
 * classes known before it checks the class. With the
 * presentation off the class stays refused. In-memory only.
 */

if ((process.env.FILUMIRE_PERSISTENCE ?? "memory") !== "memory") {
  throw new Error("jhs-cold-start-grade test runs on in-memory persistence only");
}

function setEnv(name: string, value: string | undefined): void {
  Object.defineProperty(process.env, name, { configurable: true, enumerable: true, writable: true, value });
}

setEnv("NODE_ENV", "production");
setEnv("FILUMIRE_AUTH_JWT_SECRET", "test-only-jhs-cold-start-secret-at-least-32");
setEnv("FILUMIRE_ACCOUNT_REGISTRATION", "open");
setEnv("FILUMIRE_JHS_MODE", undefined);

const run = Date.now().toString(36);
const origin = "http://localhost";
const CCP = "curriculum-version-gh-nacca-ccp-2020";

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

async function main(): Promise<void> {
  const row = PRIVATE_JHS_SCOPE.find(item => item.gradeId === "level-gh-basic-8-ccp");
  assert(row, "the private scope includes a Basic 8 topic");

  const registered = await register(request("POST", "/api/account/register", {
    email: `jhs.cold.${run}@example.test`, password: "family-test-pass-1", displayName: "Test Guardian",
    preferredLanguage: "en", confirmsGuardian: true, acceptsNotice: true,
  }));
  assert.equal(registered.status, 201);
  const guardian = cookieFrom(registered);

  // Added without a class, then placed the way a guardian placement stores it.
  const username = `ama.cold.${run}`.slice(0, 24);
  const password = "ama-test-pass-1";
  const added = await addLearner(request("POST", "/api/account/learners", {
    displayName: "Ama", username, password, preferredLanguage: "en", consentsToLearnerData: true,
  }, guardian));
  assert.equal(added.status, 201);
  const { learnerId } = (await added.json()) as { learnerId: string };
  await saveLearnerLearningContext({
    learnerId, curriculumVersionId: CCP, gradeId: row.gradeId, activeSubjectId: row.subjectId,
    activeCompetencyId: row.competencyId, gradeSetBy: "guardian", updatedAt: new Date().toISOString(),
  });

  assert.equal(isSupportedGrade(CCP, row.gradeId), false, "nothing has loaded the Basic 7-9 classes yet");

  const learner = cookieFrom(await login(request("POST", "/api/session/login", { login: username, password })));
  const finishSetup = () => updateLearner(
    request("PATCH", `/api/account/learners/${learnerId}`, { avatarId: "avatar-1", gradeId: row.gradeId, completeOnboarding: true }, learner),
    { params: Promise.resolve({ learnerId }) },
  );

  const off = await finishSetup();
  assert.equal(off.status, 400, "with the presentation off a Basic 8 class is refused");
  assert.equal(((await off.json()) as { code: string }).code, "invalid_grade");
  console.log({ test: "presentation off: Basic 8 setup refused", result: "PASS" });

  setEnv("FILUMIRE_JHS_MODE", "private-presentation");
  assert.equal(isSupportedGrade(CCP, row.gradeId), false, "still cold: nothing has loaded the classes");

  const on = await finishSetup();
  assert.equal(on.status, 200, "a cold profile request accepts the guardian's Basic 8 class");
  assert.equal(((await on.json()) as { onboardingComplete: boolean }).onboardingComplete, true);
  console.log({ test: "presentation on, cold start: Basic 8 setup completes", result: "PASS" });
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
