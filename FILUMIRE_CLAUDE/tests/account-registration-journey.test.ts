/*
 * Built-in accounts, end to end through the real route handlers:
 * guardian registration and consent, adding a learner, learner
 * sign-in, learning, sign-out and return with progress intact,
 * plus account isolation, lockout and rate limiting.
 *
 * Runs in production mode (cookie sessions only, no development
 * identity headers) against the configured persistence store.
 */
import { GET as learningGet } from "../apps/learner/app/api/learning/route";
import { GET as adultSummary } from "../apps/learner/app/api/adult/summary/route";
import { POST as register } from "../apps/learner/app/api/account/register/route";
import { POST as addLearner } from "../apps/learner/app/api/account/learners/route";
import { PATCH as patchLearner } from "../apps/learner/app/api/account/learners/[learnerId]/route";
import { POST as setLearnerPassword } from "../apps/learner/app/api/account/learners/[learnerId]/password/route";
import { POST as login } from "../apps/learner/app/api/session/login/route";
import { POST as logout } from "../apps/learner/app/api/session/logout/route";
import { GET as me } from "../apps/learner/app/api/session/me/route";
import { POST as selectLearner } from "../apps/learner/app/api/session/select-learner/route";
import { listGuardianConsentRecords } from "../services/account";
import { accountStore } from "../services/account/store";
import { resetRateLimits } from "../services/account/rate-limit";
import { getLearnerLearningContext } from "../services/learner-context";
import { persistenceStore } from "../services/persistence-provider";
import { GRADE_GHANA_BASIC_5_ID } from "../packages/curriculum-framework";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function setEnv(name: string, value: string | undefined): void {
  Object.defineProperty(process.env, name, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
}

setEnv("NODE_ENV", "production");
setEnv("FILUMIRE_AUTH_JWT_SECRET", "test-only-account-journey-secret-at-least-32-chars");
setEnv("FILUMIRE_ACCOUNT_REGISTRATION", "open");

const run = Date.now().toString(36);
const createdPrincipals: string[] = [];
const createdLearners: string[] = [];
const results: string[] = [];

function pass(name: string): void {
  results.push(name);
  console.log({ test: name, result: "PASS" });
}

function cookieFrom(response: Response): string {
  const header = response.headers.get("set-cookie") ?? "";
  const match = header.match(/filumire_auth_session=([^;]*)/);
  assert(match && match[1], "response sets a session cookie");
  return `filumire_auth_session=${match[1]}`;
}

function post(path: string, body: unknown, cookie?: string): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

function patch(path: string, body: unknown, cookie: string): Request {
  return new Request(`http://localhost${path}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  });
}

function get(path: string, cookie?: string): Request {
  return new Request(`http://localhost${path}`, {
    headers: cookie ? { cookie } : {},
  });
}

const params = (learnerId: string) => ({
  params: Promise.resolve({ learnerId }),
});

async function code(response: Response): Promise<string | undefined> {
  return ((await response.clone().json()) as { code?: string }).code;
}

async function registerGuardian(email: string): Promise<string> {
  const response = await register(
    post("/api/account/register", {
      email,
      password: "family-test-pass-1",
      displayName: "Test Guardian",
      preferredLanguage: "en",
      confirmsGuardian: true,
      acceptsNotice: true,
    }),
  );
  assert(response.status === 201, `registration returned ${response.status}`);
  return cookieFrom(response);
}

async function main(): Promise<void> {
  const guardianEmail = `guardian.${run}@example.test`;
  const learnerUsername = `ama.${run}`.slice(0, 24);

  // 1. Registration validation and consent.
  const noConsent = await register(
    post("/api/account/register", {
      email: guardianEmail,
      password: "family-test-pass-1",
      displayName: "Test Guardian",
      confirmsGuardian: true,
      acceptsNotice: false,
    }),
  );
  assert(noConsent.status === 400 && (await code(noConsent)) === "invalid_consent", "registration requires consent");

  const weak = await register(
    post("/api/account/register", {
      email: guardianEmail,
      password: "short",
      displayName: "Test Guardian",
      confirmsGuardian: true,
      acceptsNotice: true,
    }),
  );
  assert(weak.status === 400 && (await code(weak)) === "invalid_password", "registration rejects short passwords");

  const notJson = await register(
    new Request("http://localhost/api/account/register", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "email=x",
    }),
  );
  assert(notJson.status === 400, "registration accepts JSON only");
  pass("registration validates input and requires guardian consent");

  setEnv("FILUMIRE_ACCOUNT_REGISTRATION", undefined);
  const closed = await register(
    post("/api/account/register", {
      email: guardianEmail,
      password: "family-test-pass-1",
      displayName: "Test Guardian",
      confirmsGuardian: true,
      acceptsNotice: true,
    }),
  );
  assert(closed.status === 403 && (await code(closed)) === "registration_closed", "production registration is closed unless opened");
  setEnv("FILUMIRE_ACCOUNT_REGISTRATION", "open");
  pass("production registration stays closed until explicitly opened");

  const guardianCookie = await registerGuardian(guardianEmail);
  const duplicate = await register(
    post("/api/account/register", {
      email: guardianEmail.toUpperCase(),
      password: "family-test-pass-1",
      displayName: "Someone Else",
      confirmsGuardian: true,
      acceptsNotice: true,
    }),
  );
  assert(duplicate.status === 409, "duplicate email (any case) is rejected");
  pass("guardian registers and is signed in; duplicate email rejected");

  // 2. Guardian session is principal-only.
  const guardianMe = await (await me(get("/api/session/me", guardianCookie))).json();
  assert(guardianMe.accountKind === "guardian" && guardianMe.learners.length === 0, "guardian account summary");
  assert(guardianMe.activeLearnerId === null, "guardian session is not bound to a learner");
  const guardianLearning = await learningGet(get("/api/learning", guardianCookie));
  assert(guardianLearning.status === 401, "principal-only session cannot use learner endpoints");
  pass("guardian session reaches account pages but not learner endpoints");

  // 3. Add a learner with consent.
  const noLearnerConsent = await addLearner(
    post("/api/account/learners", {
      displayName: "Ama",
      username: learnerUsername,
      password: "ama-pass",
      consentsToLearnerData: false,
    }, guardianCookie),
  );
  assert(noLearnerConsent.status === 400, "adding a learner requires consent");

  const added = await addLearner(
    post("/api/account/learners", {
      displayName: "Ama",
      username: learnerUsername,
      password: "ama-pass",
      preferredLanguage: "fr",
      consentsToLearnerData: true,
    }, guardianCookie),
  );
  assert(added.status === 201, `add learner returned ${added.status}`);
  const { learnerId } = (await added.json()) as { learnerId: string };

  const dupUser = await addLearner(
    post("/api/account/learners", {
      displayName: "Kofi",
      username: learnerUsername.toUpperCase(),
      password: "kofi-pass",
      consentsToLearnerData: true,
    }, guardianCookie),
  );
  assert(dupUser.status === 409, "duplicate learner username rejected");

  const guardianPrincipalId = guardianMe.principalId as string;
  createdPrincipals.push(guardianPrincipalId);
  createdLearners.push(learnerId);
  const consents = await listGuardianConsentRecords(guardianPrincipalId);
  assert(consents.length === 3, `expected 3 consent records, got ${consents.length}`);
  assert(
    consents.every((record) => record.verificationStatus === "unverified" && record.method === "self_declared_checkbox"),
    "consent is recorded as an unverified self-declaration",
  );
  assert(consents.some((record) => record.learnerId === learnerId), "learner consent names the learner");
  pass("guardian adds a learner; consent recorded per learner, unverified");

  const credential = await accountStore.getCredentialByLogin(learnerUsername);
  assert(credential?.passwordHash.startsWith("scrypt$") && !credential.passwordHash.includes("ama-pass"), "password stored only as scrypt hash");
  pass("passwords are stored as salted scrypt hashes");

  // 4. Learner sign-in.
  resetRateLimits();
  const wrong = await login(post("/api/session/login", { login: learnerUsername, password: "nope-nope" }));
  const unknown = await login(post("/api/session/login", { login: `nobody.${run}`, password: "nope-nope" }));
  assert(wrong.status === 401 && unknown.status === 401, "wrong and unknown logins both 401");
  assert((await code(wrong)) === (await code(unknown)), "wrong password and unknown user are indistinguishable");
  pass("failed sign-in does not reveal whether an account exists");

  const learnerLogin = await login(post("/api/session/login", { login: ` ${learnerUsername.toUpperCase()} `, password: "ama-pass" }));
  assert(learnerLogin.status === 200, `learner login returned ${learnerLogin.status}`);
  const learnerCookie = cookieFrom(learnerLogin);
  const learnerMe = await (await me(get("/api/session/me", learnerCookie))).json();
  createdPrincipals.push(learnerMe.principalId);
  assert(learnerMe.accountKind === "learner" && learnerMe.activeLearnerId === learnerId, "learner session bound to own learner");
  assert(learnerMe.learners[0].preferredLanguage === "fr", "learner language carried from profile");
  assert(learnerMe.learners[0].username === undefined, "learner summary does not echo credentials");
  pass("learner signs in with own username and lands on own learner");

  // 5. Onboarding: grade, avatar, onboarding complete.
  const onboarded = await patchLearner(
    patch(`/api/account/learners/${learnerId}`, { avatarId: "3", gradeId: GRADE_GHANA_BASIC_5_ID, completeOnboarding: true }, learnerCookie),
    params(learnerId),
  );
  assert(onboarded.status === 200, `onboarding update returned ${onboarded.status}`);
  const onboardedLearner = await onboarded.json();
  assert(onboardedLearner.onboardingComplete === true && onboardedLearner.avatarId === "3", "onboarding saved");
  const contextBefore = await getLearnerLearningContext(learnerId);
  assert(contextBefore?.gradeId === GRADE_GHANA_BASIC_5_ID, "grade saved at onboarding");
  pass("learner completes onboarding; profile and grade saved on the server");

  // 6. Learn.
  const learning = await learningGet(get("/api/learning", learnerCookie));
  assert(learning.status === 200, `learning GET returned ${learning.status}`);
  const statesBefore = await persistenceStore.getLearnerStates(learnerId);
  assert(statesBefore.length > 0, "learning created learner state");
  pass("signed-in learner reaches the adaptive learning engine");

  // 7. Sign out; the old cookie stops working.
  const out = await logout(post("/api/session/logout", {}, learnerCookie));
  assert(out.status === 200 && /Max-Age=0/.test(out.headers.get("set-cookie") ?? ""), "logout clears cookie");
  const replay = await learningGet(get("/api/learning", learnerCookie));
  assert(replay.status === 401, "revoked session cannot be replayed");
  const replayMe = await me(get("/api/session/me", learnerCookie));
  assert(replayMe.status === 401, "revoked session has no account");
  pass("sign-out revokes the server session");

  // 8. Return and continue.
  const again = await login(post("/api/session/login", { login: learnerUsername, password: "ama-pass" }));
  const againCookie = cookieFrom(again);
  const statesAfter = await persistenceStore.getLearnerStates(learnerId);
  const contextAfter = await getLearnerLearningContext(learnerId);
  assert(statesAfter.length === statesBefore.length, "learner state survives sign-out");
  assert(contextAfter?.gradeId === contextBefore.gradeId && contextAfter.activeSubjectId === contextBefore.activeSubjectId, "learning context survives sign-out");
  const againMe = await (await me(get("/api/session/me", againCookie))).json();
  assert(againMe.learners[0].onboardingComplete === true, "onboarding is not repeated");
  const continued = await learningGet(get("/api/learning", againCookie));
  assert(continued.status === 200, "returning learner continues learning");
  pass("returning learner continues with saved progress and profile");

  // 9. Guardian opens their child's learning, then returns to family view.
  const select = await selectLearner(post("/api/session/select-learner", { learnerId }, guardianCookie));
  assert(select.status === 200, `guardian select returned ${select.status}`);
  const guardianLearnerCookie = cookieFrom(select);
  assert((await learningGet(get("/api/learning", guardianLearnerCookie))).status === 200, "guardian can open own child's learning");
  assert((await me(get("/api/session/me", guardianCookie))).status === 401, "previous guardian session revoked on switch");
  const back = await selectLearner(post("/api/session/select-learner", { learnerId: null }, guardianLearnerCookie));
  assert(back.status === 200, "guardian can return to principal-only session");
  const familyCookie = cookieFrom(back);
  const family = await (await me(get("/api/session/me", familyCookie))).json();
  assert(family.learners.length === 1 && family.learners[0].username === learnerUsername, "guardian sees own learner and username");
  const summary = await adultSummary(get(`/api/adult/summary?learnerId=${encodeURIComponent(learnerId)}`, familyCookie));
  assert(summary.status === 200, `guardian adult summary returned ${summary.status}`);
  pass("guardian switches into and out of a child's learning");

  const learnerToNull = await selectLearner(post("/api/session/select-learner", { learnerId: null }, againCookie));
  assert(learnerToNull.status === 403, "learner sign-in cannot drop its learner binding");
  pass("learner session stays bound to the learner");

  // 10. Isolation between families.
  const otherCookie = await registerGuardian(`other.${run}@example.test`);
  const otherPatch = await patchLearner(patch(`/api/account/learners/${learnerId}`, { displayName: "Hacked" }, otherCookie), params(learnerId));
  assert(otherPatch.status === 403, "another guardian cannot edit this learner");
  const otherSelect = await selectLearner(post("/api/session/select-learner", { learnerId }, otherCookie));
  assert(otherSelect.status === 403, "another guardian cannot learn as this learner");
  const otherPassword = await setLearnerPassword(post(`/api/account/learners/${learnerId}/password`, { password: "taken-over" }, otherCookie), params(learnerId));
  assert(otherPassword.status === 403, "another guardian cannot reset this learner's password");
  const otherSummary = await adultSummary(get(`/api/adult/summary?learnerId=${encodeURIComponent(learnerId)}`, otherCookie));
  assert(otherSummary.status === 403 || otherSummary.status === 404, `another guardian cannot read summary (got ${otherSummary.status})`);
  const otherMe = await (await me(get("/api/session/me", otherCookie))).json();
  createdPrincipals.push(otherMe.principalId);
  assert(otherMe.learners.length === 0, "another guardian sees no learners");
  const learnerSelfPassword = await setLearnerPassword(post(`/api/account/learners/${learnerId}/password`, { password: "new-pass-1" }, againCookie), params(learnerId));
  assert(learnerSelfPassword.status === 403, "learner cannot reset own password");
  pass("families are isolated from each other");

  // 11. Guardian resets learner password.
  const reset = await setLearnerPassword(post(`/api/account/learners/${learnerId}/password`, { password: "ama-new-pass" }, familyCookie), params(learnerId));
  assert(reset.status === 200, `guardian reset returned ${reset.status}`);
  resetRateLimits();
  assert((await login(post("/api/session/login", { login: learnerUsername, password: "ama-pass" }))).status === 401, "old password no longer works");
  assert((await login(post("/api/session/login", { login: learnerUsername, password: "ama-new-pass" }))).status === 200, "new password works");
  pass("guardian resets a learner's password");

  // 12. Lockout after repeated failures.
  resetRateLimits();
  let last: Response | undefined;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    last = await login(post("/api/session/login", { login: guardianEmail, password: `wrong-${attempt}-pass` }));
  }
  assert(last?.status === 429 && (await code(last)) === "locked", "fifth failure locks the account");
  const whileLocked = await login(post("/api/session/login", { login: guardianEmail, password: "family-test-pass-1" }));
  assert(whileLocked.status === 429, "correct password refused while locked");
  pass("account locks after five failed attempts");

  // 13. Per-address rate limit.
  resetRateLimits();
  let limited: Response | undefined;
  for (let attempt = 0; attempt < 31; attempt += 1) {
    limited = await login(post("/api/session/login", { login: `spray${attempt}.${run}`, password: "nope-nope" }));
  }
  assert(limited?.status === 429 && (await code(limited)) === "rate_limited", "sign-in is rate limited per address");
  resetRateLimits();
  pass("sign-in attempts are rate limited per address");

  console.log({ accountJourneyTest: "PASS", checks: results.length, persistence: process.env.FILUMIRE_PERSISTENCE ?? "memory" });
}

async function cleanUp(): Promise<void> {
  if (process.env.FILUMIRE_PERSISTENCE !== "postgres") return;

  const { pool } = await import("../services/database");
  const { deleteTestLearners, deleteTestPrincipals } = await import("./postgres-test-cleanup");

  await deleteTestLearners(pool, createdLearners);
  await deleteTestPrincipals(pool, createdPrincipals);
  await pool.end();
}

main()
  .finally(cleanUp)
  .then(
    () => process.exit(0),
    (error) => {
      console.error(error);
      process.exit(1);
    },
  );
