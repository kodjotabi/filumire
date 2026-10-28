import assert from "node:assert/strict";

import { POST as register } from "../apps/learner/app/api/account/register/route";
import { POST as addLearner } from "../apps/learner/app/api/account/learners/route";
import { POST as issueTeacherCode } from "../apps/learner/app/api/account/learners/[learnerId]/teachers/route";
import { POST as redeemTeacherCode } from "../apps/learner/app/api/account/teacher-links/route";
import { POST as login } from "../apps/learner/app/api/session/login/route";
import { MAX_REVIEWERS, reviewerList, reviewerModeActive } from "../services/account";
import { resetRateLimits } from "../services/account/rate-limit";
import { localFamilyAccessEnabled } from "../services/family-access/otp";

/*
 * Private review (FILUMIRE_ACCESS_MODE=reviewers): only listed adults,
 * in their listed role, may register or sign in; learners only when the
 * guardian who created them is listed. Refusals are indistinguishable
 * from ordinary failures. Fictional accounts, in-memory persistence only.
 */

if ((process.env.FILUMIRE_PERSISTENCE ?? "memory") !== "memory") {
  throw new Error("reviewer-access test runs on in-memory persistence only");
}

function setEnv(name: string, value: string | undefined): void {
  Object.defineProperty(process.env, name, { configurable: true, enumerable: true, writable: true, value });
}

setEnv("NODE_ENV", "production");
setEnv("FILUMIRE_AUTH_JWT_SECRET", "test-only-reviewer-access-secret-32-characters");
setEnv("FILUMIRE_ACCOUNT_REGISTRATION", undefined);
setEnv("FILUMIRE_ACCESS_MODE", undefined);
setEnv("FILUMIRE_REVIEWER_EMAILS", undefined);

const run = Date.now().toString(36);
const origin = "http://localhost";
const email = (name: string) => `${name}.${run}@example.test`;
const PASSWORD = "fictional-review-pass-1";
const G1 = email("g1"), G2 = email("g2"), G3 = email("g3"), T1 = email("t1"), T2 = email("t2");
const FIVE = `${G1}:guardian, ${G2.toUpperCase()}:Guardian ,${G3}:guardian,${T1}:teacher,${T2}:teacher,`;
// Extra fictional entries after FIVE: 15 more is exactly the cap of 20, 16 more is one over.
const extra = (count: number) => Array.from({ length: count }, (_, i) => `${email(`extra${i}`)}:${i % 2 ? "teacher" : "guardian"}`).join(",");
const TWENTY = `${FIVE}${extra(15)}`;
const OVER_CAP = `${FIVE}${extra(16)}`;

function request(path: string, body: unknown, cookie?: string): Request {
  return new Request(`${origin}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin, "sec-fetch-site": "same-origin", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

function cookieFrom(response: Response): string {
  const match = (response.headers.get("set-cookie") ?? "").match(/filumire_auth_session=([^;]*)/);
  assert(match?.[1], "response sets a session cookie");
  return `filumire_auth_session=${match[1]}`;
}

async function registerAs(kind: "guardian" | "teacher", address: string) {
  await resetRateLimits();
  const consent = kind === "guardian" ? { confirmsGuardian: true } : { accountType: "teacher", confirmsTeacher: true };
  return register(request("/api/account/register", {
    email: address, password: PASSWORD, displayName: `Fictional ${kind}`, preferredLanguage: "en", acceptsNotice: true, ...consent,
  }));
}

async function signIn(identifier: string, password = PASSWORD) {
  await resetRateLimits();
  return login(request("/api/session/login", { login: identifier, password }));
}

async function body(response: Response) {
  return { status: response.status, body: await response.json() };
}

async function addFictionalLearner(guardianCookie: string, name: string) {
  const username = `${name}${run}`.slice(0, 24);
  const added = await addLearner(request("/api/account/learners", {
    displayName: name, username, password: PASSWORD, consentsToLearnerData: true, gradeId: "level-gh-basic-5-pilot",
  }, guardianCookie));
  assert.equal(added.status, 201);
  const { learnerId } = (await added.json()) as { learnerId: string };
  return { username, learnerId };
}

function pass(name: string) { console.log({ test: name, result: "PASS" }); }

async function main(): Promise<void> {
  // 0. Accounts that already exist before the private review (e.g. older production data).
  setEnv("FILUMIRE_ACCOUNT_REGISTRATION", "open");
  const OLD = email("pre-existing");
  const old = await registerAs("guardian", OLD);
  assert.equal(old.status, 201);
  const oldLearner = (await addFictionalLearner(cookieFrom(old), "oldkid")).username;
  setEnv("FILUMIRE_ACCOUNT_REGISTRATION", undefined);
  const closedBody = await body(await registerAs("guardian", email("anyone")));
  assert.equal(closedBody.status, 403, "production registration stays closed by default");
  pass("baseline: production registration closed; pre-existing accounts created");

  // 1. Parsing: valid lists normalise; anything invalid fails closed.
  setEnv("FILUMIRE_ACCESS_MODE", "reviewers");
  assert.equal(reviewerModeActive(), true);
  setEnv("FILUMIRE_REVIEWER_EMAILS", FIVE);
  const parsed = reviewerList();
  assert(parsed && parsed.size === 5 && MAX_REVIEWERS === 20);
  assert.equal(parsed.get(G2), "guardian", "case and whitespace are normalised");
  assert.deepEqual([...parsed.values()].sort(), ["guardian", "guardian", "guardian", "teacher", "teacher"]);
  setEnv("FILUMIRE_REVIEWER_EMAILS", TWENTY);
  assert.equal(reviewerList()?.size, 20, "exactly twenty entries are accepted");
  setEnv("FILUMIRE_REVIEWER_EMAILS", `${TWENTY.split(",").slice(0, 19).join(",")}`);
  setEnv("FILUMIRE_REVIEWER_EMAILS_ADDITIONAL", `${email("supplement")}:teacher`);
  assert.equal(reviewerList()?.size, 20, "nineteen plus one supplemental entry are accepted");
  setEnv("FILUMIRE_REVIEWER_EMAILS", TWENTY);
  assert.equal(reviewerList(), undefined, "twenty plus one supplemental entry fail closed");
  // Empty string, not undefined: process.env stores undefined as the text "undefined".
  setEnv("FILUMIRE_REVIEWER_EMAILS_ADDITIONAL", "");
  for (const invalid of [
    undefined, "", " , ",
    OVER_CAP,
    `${G1}`, `${G1}:`, `${G1}:admin`, `${G1}:learner`, `not-an-email:guardian`, `:guardian`,
    `${G1}:guardian,${G1.toUpperCase()}:teacher`,
  ]) {
    setEnv("FILUMIRE_REVIEWER_EMAILS", invalid);
    assert.equal(reviewerList(), undefined, `invalid list ${JSON.stringify(invalid)} fails closed`);
  }
  pass("list parsing: 3 guardians + 2 teachers and exactly 20 entries accepted; empty, >20, roleless, wrong role, malformed and duplicate lists rejected");

  // 2. Registration: listed email in its listed role only; refusals identical to "closed".
  setEnv("FILUMIRE_REVIEWER_EMAILS", FIVE);
  const g1 = await registerAs("guardian", G1);
  assert.equal(g1.status, 201);
  assert.equal((await registerAs("teacher", T1)).status, 201);
  assert.equal((await registerAs("guardian", `  ${G2.toUpperCase()} `)).status, 201, "listed email in any case/spacing");
  for (const [kind, address, why] of [
    ["guardian", email("stranger"), "unlisted email"],
    ["teacher", G3, "guardian-listed email registering as teacher"],
    ["guardian", T2, "teacher-listed email registering as guardian"],
  ] as const) {
    assert.deepEqual(await body(await registerAs(kind, address)), closedBody, `${why} looks exactly like closed registration`);
  }
  setEnv("FILUMIRE_REVIEWER_EMAILS", OVER_CAP);
  assert.deepEqual(await body(await registerAs("guardian", G3)), closedBody, "invalid list admits no registration");
  setEnv("FILUMIRE_REVIEWER_EMAILS", FIVE);
  pass("registration: only listed emails in their listed role; every refusal identical to closed registration");

  // 3. Sign-in: listed adults and their learners only; refusals identical to a wrong password.
  const g1Cookie = cookieFrom(await signIn(G1));
  assert.equal((await signIn(T1)).status, 200, "listed teacher signs in");
  const { username: kid, learnerId } = await addFictionalLearner(g1Cookie, "reviewkid");
  assert.equal((await signIn(kid)).status, 200, "learner of a listed guardian signs in");
  const wrongPassword = await body(await signIn(G1, "not-the-password-1"));
  assert.equal(wrongPassword.status, 401);
  assert.deepEqual(await body(await signIn(email("nobody"))), wrongPassword, "unknown account");
  assert.deepEqual(await body(await signIn(OLD)), wrongPassword, "pre-existing unlisted guardian with the correct password");
  assert.deepEqual(await body(await signIn(oldLearner)), wrongPassword, "learner of an unlisted guardian with the correct password");
  pass("sign-in: listed adults and their learners succeed; unlisted accounts with correct passwords look like a wrong password");

  // 4. Teacher linking between listed reviewers still works end to end.
  const issued = await issueTeacherCode(request(`/api/account/learners/${learnerId}/teachers`, {}, g1Cookie), { params: Promise.resolve({ learnerId }) });
  assert.equal(issued.status, 201);
  const { code } = (await issued.json()) as { code: string };
  const t1Cookie = cookieFrom(await signIn(T1));
  assert.equal((await redeemTeacherCode(request("/api/account/teacher-links", { code }, t1Cookie))).status, 201);
  pass("listed guardian links a listed teacher with a one-time code");

  // One reviewer, all three views: a guardian address plus a +teacher address, linked to the reviewer's own learner.
  const DUAL = `dual.${run}@example.test`, DUAL_TEACHER = `dual+teacher.${run}@example.test`;
  setEnv("FILUMIRE_REVIEWER_EMAILS", `${FIVE}${DUAL}:guardian,${DUAL_TEACHER}:teacher`);
  const dualParent = await registerAs("guardian", DUAL);
  assert.equal(dualParent.status, 201);
  const dualKid = await addFictionalLearner(cookieFrom(dualParent), "dualkid");
  assert.equal((await registerAs("teacher", DUAL_TEACHER)).status, 201, "+teacher address registers as a teacher");
  const dualCode = await issueTeacherCode(request(`/api/account/learners/${dualKid.learnerId}/teachers`, {}, cookieFrom(await signIn(DUAL))), { params: Promise.resolve({ learnerId: dualKid.learnerId }) });
  assert.equal(dualCode.status, 201);
  const { code: ownCode } = (await dualCode.json()) as { code: string };
  assert.equal((await redeemTeacherCode(request("/api/account/teacher-links", { code: ownCode }, cookieFrom(await signIn(DUAL_TEACHER))))).status, 201);
  assert.equal((await signIn(dualKid.username)).status, 200, "the reviewer's learner signs in");
  assert.deepEqual(await body(await registerAs("teacher", DUAL)), closedBody, "the guardian address cannot also become a teacher");
  setEnv("FILUMIRE_REVIEWER_EMAILS", FIVE);
  pass("one reviewer holds parent, teacher and learner views via a +teacher second address");

  // Production's supplemental reviewer must retain adult and learner access.
  const SIXTH = email("supplemental");
  setEnv("FILUMIRE_REVIEWER_EMAILS_ADDITIONAL", `${SIXTH}:guardian`);
  const sixth = await registerAs("guardian", SIXTH);
  assert.equal(sixth.status, 201);
  const sixthLearner = await addFictionalLearner(cookieFrom(sixth), "sixthkid");
  assert.equal((await signIn(SIXTH)).status, 200);
  assert.equal((await signIn(sixthLearner.username)).status, 200);
  assert.equal((await signIn(G1)).status, 200, "base reviewer remains authorised");
  for (const additional of [`${G1}:guardian`, `${SIXTH}:guardian,${email("seventh")}:teacher`, `${SIXTH}:admin`]) {
    setEnv("FILUMIRE_REVIEWER_EMAILS_ADDITIONAL", additional);
    assert.equal(reviewerList(), undefined);
    assert.deepEqual(await body(await signIn(SIXTH)), wrongPassword);
  }
  setEnv("FILUMIRE_REVIEWER_EMAILS_ADDITIONAL", "");
  assert.equal((await signIn(G1)).status, 200, "list stays valid after the supplemental entry is removed");
  assert.deepEqual(await body(await signIn(SIXTH)), wrongPassword);
  assert.deepEqual(await body(await signIn(sixthLearner.username)), wrongPassword);
  pass("supplemental reviewer and learner retain access; duplicates, multiple additions, invalid roles and removal fail closed");

  // 5. Removing a reviewer or breaking the list locks them out at the next sign-in.
  setEnv("FILUMIRE_REVIEWER_EMAILS", `${G2}:guardian,${G3}:guardian,${T1}:teacher,${T2}:teacher`);
  assert.deepEqual(await body(await signIn(G1)), wrongPassword, "removed guardian");
  assert.deepEqual(await body(await signIn(kid)), wrongPassword, "learner of a removed guardian");
  setEnv("FILUMIRE_REVIEWER_EMAILS", `${G1}:teacher,${T1}:teacher`);
  assert.deepEqual(await body(await signIn(G1)), wrongPassword, "listed under the wrong role");
  setEnv("FILUMIRE_REVIEWER_EMAILS", "");
  assert.deepEqual(await body(await signIn(T1)), wrongPassword, "empty list admits no one");
  setEnv("FILUMIRE_REVIEWER_EMAILS", FIVE);
  pass("removal, wrong role and empty list refuse sign-in");

  // 6. Lockout still applies to listed reviewers.
  for (let attempt = 0; attempt < 5; attempt++) await signIn(T1, "wrong-password-xyz");
  assert.equal((await signIn(T1)).status, 429, "five wrong passwords lock the account even for the right one");
  pass("existing lockout unchanged");

  // 7. Phone family access is off in reviewer mode (phone accounts cannot be listed).
  setEnv("NODE_ENV", "development"); setEnv("FILUMIRE_LOCAL_FAMILY_ACCESS", "mock");
  setEnv("FILUMIRE_ACCESS_MODE", undefined);
  assert.equal(localFamilyAccessEnabled(), true, "local mock family access as before");
  setEnv("FILUMIRE_ACCESS_MODE", "reviewers");
  assert.equal(localFamilyAccessEnabled(), false);
  setEnv("FILUMIRE_LOCAL_FAMILY_ACCESS", undefined); setEnv("NODE_ENV", "production");
  pass("family access disabled in reviewer mode");

  // 8. Mode off: existing behaviour exactly as before.
  setEnv("FILUMIRE_ACCESS_MODE", undefined);
  assert.equal((await signIn(OLD)).status, 200, "unlisted accounts sign in normally when reviewer mode is off");
  assert.deepEqual(await body(await registerAs("guardian", G3)), closedBody, "production registration still closed");
  setEnv("FILUMIRE_ACCOUNT_REGISTRATION", "open");
  assert.equal((await registerAs("guardian", email("open-mode"))).status, 201, "open registration unchanged");
  setEnv("FILUMIRE_ACCOUNT_REGISTRATION", undefined);
  pass("reviewer mode off: sign-in and registration unchanged");
}

main().then(() => console.log("PASS reviewer-access")).catch((error) => {
  console.error(error);
  process.exit(1);
});
