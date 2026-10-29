import assert from "node:assert/strict";
import { NextRequest } from "next/server";

import { POST as register } from "../apps/learner/app/api/account/register/route";
import { POST as addLearner } from "../apps/learner/app/api/account/learners/route";
import { POST as issueTeacherCode } from "../apps/learner/app/api/account/learners/[learnerId]/teachers/route";
import { POST as redeemTeacherCode } from "../apps/learner/app/api/account/teacher-links/route";
import { GET as sessionMe } from "../apps/learner/app/api/session/me/route";
import { GET as teacherSummary } from "../apps/learner/app/api/teacher/summary/route";
import { POST as login } from "../apps/learner/app/api/session/login/route";
import { reviewerAllRolesUntil, reviewerHasAllRoles } from "../services/account";
import { resetRateLimits } from "../services/account/rate-limit";
// The deploy guard is plain JavaScript (no type declarations).
const deployGuard = "../scripts/deploy-guard.mjs";
const { checkDeployment } = (await import(deployGuard)) as { checkDeployment: (env: Record<string, string>) => unknown };

/*
 * All-roles test period (owner decision 28 Oct 2026): until
 * FILUMIRE_REVIEWER_ACCESS_UNTIL, a reviewer listed as a guardian also
 * uses the teacher workspace with the same email, for learners they
 * created. Outside the period, outside reviewer mode, for unlisted or
 * teacher-listed accounts, or with a missing/invalid date, nothing
 * changes. When the period ends the teacher link stops counting on the
 * server at once. Fictional accounts, in-memory persistence only.
 *
 * Run: node scripts/run-offline-suites.mjs reviewer-all-roles
 */

if ((process.env.FILUMIRE_PERSISTENCE ?? "memory") !== "memory") {
  throw new Error("reviewer-all-roles test runs on in-memory persistence only");
}

function setEnv(name: string, value: string | undefined): void {
  Object.defineProperty(process.env, name, { configurable: true, enumerable: true, writable: true, value });
}

setEnv("NODE_ENV", "production");
setEnv("FILUMIRE_AUTH_JWT_SECRET", "test-only-reviewer-all-roles-secret-32-chars");
setEnv("FILUMIRE_ACCOUNT_REGISTRATION", undefined);
setEnv("FILUMIRE_REVIEWER_ACCESS_UNTIL", undefined);

const run = Date.now().toString(36);
const origin = "http://localhost";
const email = (name: string) => `${name}.${run}@example.test`;
const PASSWORD = "fictional-review-pass-1";
const ALL = email("all"), OTHER = email("other"), TEACHER = email("teacher");
const LIST = `${ALL}:guardian,${OTHER}:guardian,${TEACHER}:teacher`;
const FUTURE = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
const PAST = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);

setEnv("FILUMIRE_ACCESS_MODE", "reviewers");
setEnv("FILUMIRE_REVIEWER_EMAILS", LIST);

function request(path: string, body: unknown, cookie?: string): Request {
  return new Request(`${origin}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin, "sec-fetch-site": "same-origin", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

function get(path: string, cookie: string): NextRequest {
  return new NextRequest(`${origin}${path}`, { headers: { origin, "sec-fetch-site": "same-origin", cookie } });
}

function cookieFrom(response: Response): string {
  const match = (response.headers.get("set-cookie") ?? "").match(/filumire_auth_session=([^;]*)/);
  assert(match?.[1], "response sets a session cookie");
  return `filumire_auth_session=${match[1]}`;
}

async function registerAs(kind: "guardian" | "teacher", address: string) {
  await resetRateLimits();
  const consent = kind === "guardian" ? { confirmsGuardian: true } : { accountType: "teacher", confirmsTeacher: true };
  const response = await register(request("/api/account/register", {
    email: address, password: PASSWORD, displayName: `Fictional ${kind}`, preferredLanguage: "en", acceptsNotice: true, ...consent,
  }));
  assert.equal(response.status, 201, `${address} registers`);
}

async function signIn(identifier: string) {
  await resetRateLimits();
  const response = await login(request("/api/session/login", { login: identifier, password: PASSWORD }));
  assert.equal(response.status, 200, `${identifier} signs in`);
  return cookieFrom(response);
}

async function addFictionalLearner(guardianCookie: string, name: string) {
  const added = await addLearner(request("/api/account/learners", {
    displayName: name, username: `${name}${run}`.slice(0, 24), password: PASSWORD, consentsToLearnerData: true, gradeId: "level-gh-basic-5-pilot",
  }, guardianCookie));
  assert.equal(added.status, 201);
  return ((await added.json()) as { learnerId: string }).learnerId;
}

async function codeFor(guardianCookie: string, learnerId: string) {
  await resetRateLimits();
  const issued = await issueTeacherCode(request(`/api/account/learners/${learnerId}/teachers`, {}, guardianCookie), { params: Promise.resolve({ learnerId }) });
  assert.equal(issued.status, 201);
  return ((await issued.json()) as { code: string }).code;
}

async function redeem(cookie: string, code: string) {
  await resetRateLimits();
  return (await redeemTeacherCode(request("/api/account/teacher-links", { code }, cookie))).status;
}

async function account(cookie: string) {
  return (await (await sessionMe(get("/api/session/me", cookie))).json()) as { roles?: string[]; allRolesUntil?: string; accountKind: string };
}

async function teacherSees(cookie: string, learnerId: string) {
  const all = await teacherSummary(get("/api/teacher/summary", cookie));
  const one = await teacherSummary(get(`/api/teacher/summary?learnerId=${learnerId}`, cookie));
  const listed = all.status === 200 && JSON.stringify(await all.json()).includes(learnerId);
  return { listed, oneStatus: one.status };
}

function pass(name: string) { console.log({ test: name, result: "PASS" }); }

async function main(): Promise<void> {
  // 1. Dates: date-only is inclusive (end of that UTC day); ISO needs a zone; anything else is off.
  for (const [value, expected] of [
    ["2026-12-31", Date.parse("2027-01-01T00:00:00Z")],
    ["2026-12-31T18:00:00Z", Date.parse("2026-12-31T18:00:00Z")],
    ["2026-12-31T18:00:00+01:00", Date.parse("2026-12-31T17:00:00Z")],
    ["2026-02-31", undefined], ["31/12/2026", undefined], ["2026-12-31T18:00:00", undefined], ["", undefined], ["soon", undefined],
  ] as const) {
    setEnv("FILUMIRE_REVIEWER_ACCESS_UNTIL", value);
    assert.equal(reviewerAllRolesUntil(), expected, `until ${JSON.stringify(value)}`);
  }
  setEnv("FILUMIRE_REVIEWER_ACCESS_UNTIL", "2026-12-31");
  assert.equal(reviewerHasAllRoles(ALL, "guardian", Date.parse("2026-12-31T23:59:59Z")), true, "last second of the day counts");
  assert.equal(reviewerHasAllRoles(ALL, "guardian", Date.parse("2027-01-01T00:00:00Z")), false, "next day does not");
  assert.equal(reviewerHasAllRoles(TEACHER, "teacher", Date.parse("2026-12-01T00:00:00Z")), false, "teacher-listed accounts do not gain parent rights");
  assert.equal(reviewerHasAllRoles(email("unlisted"), "guardian", Date.parse("2026-12-01T00:00:00Z")), false, "unlisted guardians get nothing");
  setEnv("FILUMIRE_ACCESS_MODE", undefined);
  assert.equal(reviewerHasAllRoles(ALL, "guardian", Date.parse("2026-12-01T00:00:00Z")), false, "outside reviewer mode the period is ignored");
  setEnv("FILUMIRE_ACCESS_MODE", "reviewers");
  pass("expiry parsing: date-only inclusive UTC, zoned ISO, invalid or missing off; only listed guardians in reviewer mode");

  // 2. Without a period: one email, one role, as before.
  setEnv("FILUMIRE_REVIEWER_ACCESS_UNTIL", undefined);
  await registerAs("guardian", ALL);
  await registerAs("guardian", OTHER);
  await registerAs("teacher", TEACHER);
  let allCookie = await signIn(ALL);
  const kid = await addFictionalLearner(allCookie, "allkid");
  const otherCookie = await signIn(OTHER);
  const otherKid = await addFictionalLearner(otherCookie, "otherkid");
  assert.equal((await account(allCookie)).roles, undefined, "no roles field outside the period");
  assert.equal(await redeem(allCookie, await codeFor(allCookie, kid)), 403, "a guardian cannot use a teacher code");
  pass("no period: guardian account keeps one role; teacher codes refused");

  // 3. During the period: the same email opens the teacher workspace for its own learner.
  setEnv("FILUMIRE_REVIEWER_ACCESS_UNTIL", FUTURE);
  allCookie = await signIn(ALL);
  const described = await account(allCookie);
  assert.deepEqual(described.roles, ["guardian", "teacher"]);
  assert.equal(described.allRolesUntil, new Date(reviewerAllRolesUntil()!).toISOString());
  assert.equal(await redeem(allCookie, await codeFor(allCookie, kid)), 201, "own learner linked as teacher with the same email");
  assert.deepEqual(await teacherSees(allCookie, kid), { listed: true, oneStatus: 200 }, "teacher summary shows the own learner");
  assert.equal((await account(await signIn(OTHER))).roles?.length, 2, "every listed guardian gets the period");
  assert.equal((await account(await signIn(TEACHER))).roles, undefined, "teacher-listed account unchanged");
  pass("period active: listed guardian is parent + teacher with one email; teacher summary works");

  // 4. Another family's learner is never reachable through the period.
  const foreignCode = await codeFor(otherCookie, otherKid);
  assert.equal(await redeem(allCookie, foreignCode), 400, "another family's code fails like any bad code");
  assert.deepEqual(await teacherSees(allCookie, otherKid), { listed: false, oneStatus: 403 }, "no teacher link left behind");
  assert.equal(await redeem(await signIn(TEACHER), foreignCode), 400, "the misused code is spent");
  assert.equal(await redeem(await signIn(TEACHER), await codeFor(otherCookie, otherKid)), 201, "real teachers link as before");
  pass("period active: only own learners; foreign codes spent and undone; real teachers unaffected");

  // 5. Period over: the teacher link stops counting on the server immediately; parent and learner views stay.
  setEnv("FILUMIRE_REVIEWER_ACCESS_UNTIL", PAST);
  assert.equal((await account(allCookie)).roles, undefined, "roles gone after expiry, same session");
  assert.deepEqual(await teacherSees(allCookie, kid), { listed: false, oneStatus: 403 }, "teacher summary refused after expiry");
  assert.equal(await redeem(allCookie, await codeFor(allCookie, kid)), 403, "no new teacher links after expiry");
  assert.equal((await account(allCookie)).accountKind, "guardian", "parent access unchanged");
  await signIn(`allkid${run}`.slice(0, 24));
  pass("period over: teacher access refused at once; parent and learner sign-in unaffected");

  // 6. Removing the email or invalidating the date ends it the same way; restoring the period restores the view.
  setEnv("FILUMIRE_REVIEWER_ACCESS_UNTIL", FUTURE);
  assert.equal((await teacherSees(allCookie, kid)).oneStatus, 200, "period restored");
  setEnv("FILUMIRE_REVIEWER_ACCESS_UNTIL", "31/12/2026");
  assert.equal((await teacherSees(allCookie, kid)).oneStatus, 403, "invalid date: off");
  setEnv("FILUMIRE_REVIEWER_ACCESS_UNTIL", FUTURE);
  setEnv("FILUMIRE_REVIEWER_EMAILS", `${OTHER}:guardian,${TEACHER}:teacher`);
  assert.equal((await teacherSees(allCookie, kid)).oneStatus, 401, "email removed from the list: open session refused");
  assert.notEqual((await sessionMe(get("/api/session/me", allCookie))).status, 200, "email removed: parent view refused too");
  setEnv("FILUMIRE_REVIEWER_EMAILS", LIST);
  pass("removing the email or an invalid date also ends teacher access");

  // 7. Deploy guard: a mistyped date or a period without reviewer mode refuses the build.
  const base = { VERCEL: "1", VERCEL_ENV: "preview", FILUMIRE_PERSISTENCE: "memory", FILUMIRE_ACCESS_MODE: "reviewers", FILUMIRE_REVIEWER_EMAILS: LIST };
  const code = (env: Record<string, string>) => { try { checkDeployment(env); return "ok"; } catch (error) { return (error as { code?: string }).code; } };
  assert.equal(code(base), "ok");
  assert.equal(code({ ...base, FILUMIRE_REVIEWER_ACCESS_UNTIL: "2026-12-31" }), "ok");
  assert.equal(code({ ...base, FILUMIRE_REVIEWER_ACCESS_UNTIL: "2026-12-31T23:59:00Z" }), "ok");
  assert.equal(code({ ...base, FILUMIRE_REVIEWER_ACCESS_UNTIL: "31/12/2026" }), "reviewer_access_until_invalid");
  assert.equal(code({ ...base, FILUMIRE_REVIEWER_ACCESS_UNTIL: "2026-02-31" }), "reviewer_access_until_invalid");
  assert.equal(code({ ...base, FILUMIRE_ACCESS_MODE: "", FILUMIRE_REVIEWER_ACCESS_UNTIL: "2026-12-31" }), "reviewer_access_until_without_reviewer_mode");
  pass("deploy guard refuses an invalid date or a period without reviewer mode");

  // 8. Role-less reviewers (owner decision 28 Oct 2026: "no roles"): admitted with every role only during
  //    the period; when it ends they cannot sign in and their open sessions stop working at once.
  const OPEN = email("open"), OPEN_TEACHER = email("openteacher");
  setEnv("FILUMIRE_REVIEWER_EMAILS", `${LIST},${OPEN}`);
  setEnv("FILUMIRE_REVIEWER_EMAILS_ADDITIONAL", OPEN_TEACHER);
  setEnv("FILUMIRE_REVIEWER_ACCESS_UNTIL", FUTURE);
  await registerAs("guardian", OPEN);
  await registerAs("teacher", OPEN_TEACHER);
  const openCookie = await signIn(OPEN);
  assert.deepEqual((await account(openCookie)).roles, ["guardian", "teacher"], "role-less reviewer is parent + teacher");
  const openKid = await addFictionalLearner(openCookie, "openkid");
  assert.equal(await redeem(openCookie, await codeFor(openCookie, openKid)), 201);
  assert.deepEqual(await teacherSees(openCookie, openKid), { listed: true, oneStatus: 200 });
  const openTeacherCookie = await signIn(OPEN_TEACHER);
  const openKidCookie = await signIn(`openkid${run}`.slice(0, 24));
  pass("role-less reviewer during the period: registers, signs in, parent + teacher, own learner signs in");

  setEnv("FILUMIRE_REVIEWER_ACCESS_UNTIL", PAST);
  for (const cookie of [openCookie, openTeacherCookie, openKidCookie]) {
    assert.notEqual((await sessionMe(get("/api/session/me", cookie))).status, 200, "open session ends with the period");
  }
  for (const identifier of [OPEN, OPEN_TEACHER, `openkid${run}`.slice(0, 24)]) {
    await resetRateLimits();
    assert.equal((await login(request("/api/session/login", { login: identifier, password: PASSWORD }))).status, 401, `${identifier} refused after the period`);
  }
  await resetRateLimits();
  const late = await register(request("/api/account/register", {
    email: email("late"), password: PASSWORD, displayName: "Fictional late", preferredLanguage: "en", acceptsNotice: true, confirmsGuardian: true,
  }));
  assert.equal(late.status, 403, "no registration after the period");
  assert.equal((await account(allCookie)).accountKind, "guardian", "role-listed reviewers keep their own access");
  setEnv("FILUMIRE_REVIEWER_ACCESS_UNTIL", undefined);
  assert.notEqual((await sessionMe(get("/api/session/me", openCookie))).status, 200, "no date: role-less reviewers stay out");
  pass("period over: role-less reviewers and their learners signed out and refused; role-listed reviewers unchanged");

  assert.equal(code({ ...base, FILUMIRE_REVIEWER_EMAILS: `${LIST},${OPEN}` }), "roleless_reviewers_without_end_date");
  assert.equal(code({ ...base, FILUMIRE_REVIEWER_EMAILS: `${LIST},${OPEN}`, FILUMIRE_REVIEWER_ACCESS_UNTIL: "2027-01-20" }), "ok");
  assert.equal(code({ ...base, FILUMIRE_REVIEWER_EMAILS: LIST, FILUMIRE_REVIEWER_EMAILS_ADDITIONAL: OPEN }), "roleless_reviewers_without_end_date");
  assert.equal(code({ ...base, FILUMIRE_REVIEWER_EMAILS: `${LIST},not-an-email`, FILUMIRE_REVIEWER_ACCESS_UNTIL: "2027-01-20" }), "reviewer_list_invalid");
  setEnv("FILUMIRE_REVIEWER_EMAILS", LIST);
  setEnv("FILUMIRE_REVIEWER_EMAILS_ADDITIONAL", "");
  pass("deploy guard: role-less reviewers need an end date; malformed role-less entries refused");

  console.log("PASS reviewer all-roles test period");
}

await main();
