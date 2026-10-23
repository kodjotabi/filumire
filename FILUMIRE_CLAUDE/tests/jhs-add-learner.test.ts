import assert from "node:assert/strict";

import { POST as register } from "../apps/learner/app/api/account/register/route";
import { POST as addLearner } from "../apps/learner/app/api/account/learners/route";
import { GET as placementChoices } from "../apps/learner/app/api/account/placement-choices/route";
import { POST as login } from "../apps/learner/app/api/session/login/route";
import { GET as learning } from "../apps/learner/app/api/learning/route";
import { resetRateLimits } from "../services/account/rate-limit";
import { getLearnerLearningContext } from "../services/learner-context";
import { seedContent } from "../services/content-store/seed";
import { PRIVATE_JHS_SCOPE } from "../packages/curriculum/jhs-private-policy";

/*
 * The add-learner form offers Basic 7–9 directly while the private
 * presentation is on: the class list comes from the server, and a
 * Basic 7–9 class is placed with its subject through the same check
 * as the Class and subject form. A refused class creates no learner.
 * With the presentation off, only primary classes are offered or
 * accepted. In-memory persistence only.
 */

if ((process.env.FILUMIRE_PERSISTENCE ?? "memory") !== "memory") {
  throw new Error("jhs-add-learner test runs on in-memory persistence only");
}

function setEnv(name: string, value: string | undefined): void {
  Object.defineProperty(process.env, name, { configurable: true, enumerable: true, writable: true, value });
}

setEnv("NODE_ENV", "production");
setEnv("FILUMIRE_AUTH_JWT_SECRET", "test-only-jhs-add-learner-secret-at-least-32");
setEnv("FILUMIRE_ACCOUNT_REGISTRATION", "open");
setEnv("FILUMIRE_JHS_MODE", "private-presentation");

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

type Choices = { choices: { curriculumVersionId: string; gradeId: string; name: string; draft: boolean; subjects: { id: string }[] }[] };

async function main(): Promise<void> {
  seedContent();
  const registered = await register(request("POST", "/api/account/register", {
    email: `jhs.add.${run}@example.test`, password: "family-test-pass-1", displayName: "Test Guardian",
    preferredLanguage: "en", confirmsGuardian: true, acceptsNotice: true,
  }));
  assert.equal(registered.status, 201);
  const guardian = cookieFrom(registered);
  const learnerBody = (name: string, extra: Record<string, unknown>) => ({
    displayName: name, username: `${name.toLowerCase()}.${run}`.slice(0, 24), password: `${name.toLowerCase()}-test-pass-1`,
    consentsToLearnerData: true, ...extra,
  });

  assert.equal((await placementChoices(request("GET", "/api/account/placement-choices", undefined))).status, 401);
  const on = (await (await placementChoices(request("GET", "/api/account/placement-choices", undefined, guardian))).json()) as Choices;
  assert.deepEqual(on.choices.map(choice => choice.name), ["Basic 4", "Basic 5", "Basic 6", "Basic 7", "Basic 8", "Basic 9"]);
  assert.deepEqual(on.choices.filter(choice => choice.draft).map(choice => choice.curriculumVersionId), [CCP, CCP, CCP]);
  console.log({ test: "signed-in guardian gets Basic 4-9; signed-out 401", result: "PASS" });

  // Basic 7 chosen in the add-learner form: created and placed in one request.
  const row = PRIVATE_JHS_SCOPE[0];
  const kofi = learnerBody("Kofi", { curriculumVersionId: CCP, gradeId: row.gradeId, subjectId: row.subjectId });
  const added = await addLearner(request("POST", "/api/account/learners", kofi, guardian));
  assert.equal(added.status, 201);
  const { learnerId } = (await added.json()) as { learnerId: string };
  const context = await getLearnerLearningContext(learnerId);
  assert.equal(context?.curriculumVersionId, CCP);
  assert.equal(context?.gradeId, row.gradeId);
  assert.equal(context?.activeSubjectId, row.subjectId);
  assert.equal(context?.gradeSetBy, "guardian");
  await resetRateLimits();
  const learner = cookieFrom(await login(request("POST", "/api/session/login", { login: kofi.username, password: kofi.password })));
  assert.equal((await learning(request("GET", "/api/learning?dashboard=1", undefined, learner))).status, 200);
  assert.equal((await learning(request("GET", "/api/learning", undefined, learner))).status, 200);
  console.log({ test: "new learner added straight into Basic 7 learns", result: "PASS" });

  // A subject that does not belong to the class is refused before the learner exists.
  const otherGrade = on.choices.find(choice => choice.draft && choice.gradeId !== row.gradeId)!;
  const efua = learnerBody("Efua", { curriculumVersionId: CCP, gradeId: otherGrade.gradeId, subjectId: row.subjectId });
  assert.equal((await addLearner(request("POST", "/api/account/learners", efua, guardian))).status, 400);
  assert.equal((await addLearner(request("POST", "/api/account/learners", { ...efua, subjectId: "" }, guardian))).status, 400);
  const efuaPrimary = await addLearner(request("POST", "/api/account/learners", { ...efua, curriculumVersionId: undefined, subjectId: undefined, gradeId: "level-gh-basic-5-pilot" }, guardian));
  assert.equal(efuaPrimary.status, 201, "refused request created nothing: the username is still free");
  const efuaContext = await getLearnerLearningContext(((await efuaPrimary.json()) as { learnerId: string }).learnerId);
  assert.equal(efuaContext?.gradeId, "level-gh-basic-5-pilot");
  console.log({ test: "mismatched or missing subject refused without creating a learner; primary path unchanged", result: "PASS" });

  // Presentation off: primary only, and a Basic 7-9 request is refused.
  setEnv("FILUMIRE_JHS_MODE", undefined);
  const off = (await (await placementChoices(request("GET", "/api/account/placement-choices", undefined, guardian))).json()) as Choices;
  assert.deepEqual(off.choices.map(choice => choice.name), ["Basic 4", "Basic 5", "Basic 6"]);
  const yaw = learnerBody("Yaw", { curriculumVersionId: CCP, gradeId: row.gradeId, subjectId: row.subjectId });
  assert.equal((await addLearner(request("POST", "/api/account/learners", yaw, guardian))).status, 400);
  assert.equal((await addLearner(request("POST", "/api/account/learners", { ...yaw, curriculumVersionId: undefined, subjectId: undefined, gradeId: row.gradeId }, guardian))).status, 400);
  assert.equal((await addLearner(request("POST", "/api/account/learners", { ...yaw, curriculumVersionId: undefined, subjectId: undefined, gradeId: undefined }, guardian))).status, 201);
  console.log({ test: "presentation off: Basic 4-6 only; Basic 7-9 refused, nothing created", result: "PASS" });
}

main().then(() => console.log("PASS jhs-add-learner")).catch((error) => {
  console.error(error);
  process.exit(1);
});
