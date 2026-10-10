import { POST as register } from "../apps/learner/app/api/account/register/route";
import { POST as addLearner } from "../apps/learner/app/api/account/learners/route";
import { PATCH as patchLearner } from "../apps/learner/app/api/account/learners/[learnerId]/route";
import { POST as setLearnerPassword } from "../apps/learner/app/api/account/learners/[learnerId]/password/route";
import {
  GET as listTeachers,
  POST as createCode,
  DELETE as cancelCode,
} from "../apps/learner/app/api/account/learners/[learnerId]/teachers/route";
import { DELETE as removeTeacher } from "../apps/learner/app/api/account/learners/[learnerId]/teachers/[teacherId]/route";
import { POST as linkTeacher } from "../apps/learner/app/api/account/teacher-links/route";
import { GET as me } from "../apps/learner/app/api/session/me/route";
import { POST as logout } from "../apps/learner/app/api/session/logout/route";
import { POST as selectLearner } from "../apps/learner/app/api/session/select-learner/route";
import { GET as teacherSummary } from "../apps/learner/app/api/teacher/summary/route";
import { hashLinkCode } from "../services/account";
import { accountStore } from "../services/account/store";
import { resetRateLimits } from "../services/account/rate-limit";
import { NextRequest } from "next/server";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function setEnv(name: string, value: string): void {
  Object.defineProperty(process.env, name, { configurable: true, enumerable: true, writable: true, value });
}

setEnv("NODE_ENV", "production");
setEnv("FILUMIRE_AUTH_JWT_SECRET", "test-only-teacher-linking-secret-at-least-32-chars");
setEnv("FILUMIRE_ACCOUNT_REGISTRATION", "open");

const run = Date.now().toString(36);
const createdPrincipals: string[] = [];
const createdLearners: string[] = [];

function pass(name: string): void {
  console.log({ test: name, result: "PASS" });
}

function cookieFrom(response: Response): string {
  const match = (response.headers.get("set-cookie") ?? "").match(/filumire_auth_session=([^;]*)/);
  assert(match?.[1], "response sets a session cookie");
  return `filumire_auth_session=${match[1]}`;
}

function request(method: string, path: string, cookie?: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function code(response: Response): Promise<string | undefined> {
  return ((await response.clone().json()) as { code?: string }).code;
}

const learnerParams = (learnerId: string) => ({ params: Promise.resolve({ learnerId }) });

async function registerAdult(kind: "guardian" | "teacher", email: string): Promise<string> {
  const response = await register(request("POST", "/api/account/register", undefined, {
    accountType: kind,
    email,
    password: "adult-test-pass-1",
    displayName: kind === "teacher" ? "Test Teacher" : "Test Guardian",
    preferredLanguage: "en",
    ...(kind === "teacher" ? { confirmsTeacher: true } : { confirmsGuardian: true }),
    acceptsNotice: true,
  }));
  assert(response.status === 201, `${kind} registration returned ${response.status}`);
  const cookie = cookieFrom(response);
  const account = await (await me(request("GET", "/api/session/me", cookie))).json();
  assert(account.accountKind === kind, `registered account is a ${kind}`);
  createdPrincipals.push(account.principalId);
  return cookie;
}

async function main(): Promise<void> {
  await resetRateLimits();

  // 1. Accounts.
  const refused = await register(request("POST", "/api/account/register", undefined, {
    accountType: "teacher", email: `t0.${run}@example.test`, password: "adult-test-pass-1",
    displayName: "No Declaration", acceptsNotice: true,
  }));
  assert(refused.status === 400 && (await code(refused)) === "invalid_consent", "teacher must confirm the declaration");

  const guardian = await registerAdult("guardian", `g.${run}@example.test`);
  const otherGuardian = await registerAdult("guardian", `g2.${run}@example.test`);
  const teacher = await registerAdult("teacher", `t.${run}@example.test`);
  const otherTeacher = await registerAdult("teacher", `t2.${run}@example.test`);

  const added = await addLearner(request("POST", "/api/account/learners", guardian, {
    displayName: "Abena", username: `abena.${run}`.slice(0, 24), password: "abena-pass", consentsToLearnerData: true,
  }));
  assert(added.status === 201, `add learner returned ${added.status}`);
  const { learnerId } = (await added.json()) as { learnerId: string };
  createdLearners.push(learnerId);

  const teacherAdds = await addLearner(request("POST", "/api/account/learners", teacher, {
    displayName: "Kwame", username: `kwame.${run}`.slice(0, 24), password: "kwame-pass", consentsToLearnerData: true,
  }));
  assert(teacherAdds.status === 403, "a teacher cannot create learners");

  const empty = await (await teacherSummary(request("GET", "/api/teacher/summary", teacher))).json();
  assert(empty.learners.length === 0, "a new teacher sees no learners");
  assert((await teacherSummary(request("GET", `/api/teacher/summary?learnerId=${learnerId}`, teacher))).status === 403, "unlinked teacher cannot open the learner");
  pass("teachers register with a declaration and start with no learners");

  // 2. Only the learner's guardian can issue a code.
  assert((await createCode(request("POST", `/api/account/learners/${learnerId}/teachers`, teacher), learnerParams(learnerId))).status === 403, "a teacher cannot issue a code");
  assert((await createCode(request("POST", `/api/account/learners/${learnerId}/teachers`, otherGuardian), learnerParams(learnerId))).status === 403, "another family cannot issue a code");

  const issued = await createCode(request("POST", `/api/account/learners/${learnerId}/teachers`, guardian), learnerParams(learnerId));
  assert(issued.status === 201, `code issue returned ${issued.status}`);
  const { code: linkCode, expiresAt } = (await issued.json()) as { code: string; expiresAt: string };
  assert(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(linkCode), "code is ten characters in two groups");
  assert(Date.parse(expiresAt) - Date.now() > 6.9 * 24 * 3600_000, "code lasts seven days");
  pass("only the learner's guardian can issue a teacher link code");

  // 3. Linking.
  const wrong = await linkTeacher(request("POST", "/api/account/teacher-links", teacher, { code: "ABCDE-FGHJK" }));
  assert(wrong.status === 400 && (await code(wrong)) === "invalid_linkCode", "a wrong code is refused");
  const guardianTries = await linkTeacher(request("POST", "/api/account/teacher-links", otherGuardian, { code: linkCode }));
  assert(guardianTries.status === 403, "only teacher accounts can use a code");

  const linked = await linkTeacher(request("POST", "/api/account/teacher-links", teacher, { code: linkCode.toLowerCase().replace("-", " ") }));
  assert(linked.status === 201, `link returned ${linked.status}`);
  assert(((await linked.json()) as { learnerId: string }).learnerId === learnerId, "link names the learner");

  const reused = await linkTeacher(request("POST", "/api/account/teacher-links", otherTeacher, { code: linkCode }));
  assert(reused.status === 400, "a code works only once");

  const teacherView = await teacherSummary(request("GET", `/api/teacher/summary?learnerId=${learnerId}`, teacher));
  assert(teacherView.status === 200, "linked teacher opens the learner's teacher summary");
  const teacherAccount = await (await me(request("GET", "/api/session/me", teacher))).json();
  assert(teacherAccount.learners.length === 1 && teacherAccount.learners[0].username === undefined, "teacher sees the learner but never the username");
  pass("a teacher links with the guardian's code, once");

  // 4. A teacher's permissions stop at teaching.
  assert((await patchLearner(request("PATCH", `/api/account/learners/${learnerId}`, teacher, { displayName: "Changed" }), learnerParams(learnerId))).status === 403, "teacher cannot edit the profile");
  assert((await setLearnerPassword(request("POST", `/api/account/learners/${learnerId}/password`, teacher, { password: "taken-over" }), learnerParams(learnerId))).status === 403, "teacher cannot reset the password");
  assert((await selectLearner(request("POST", "/api/session/select-learner", teacher, { learnerId }))).status === 403, "teacher cannot sign in as the learner");
  assert((await createCode(request("POST", `/api/account/learners/${learnerId}/teachers`, teacher), learnerParams(learnerId))).status === 403, "teacher cannot invite other teachers");
  pass("linked teachers cannot edit, impersonate or re-share the learner");

  // 5. Guardian sees and removes teachers.
  assert((await listTeachers(request("GET", `/api/account/learners/${learnerId}/teachers`, otherGuardian), learnerParams(learnerId))).status === 403, "another family cannot list teachers");
  const list = await (await listTeachers(request("GET", `/api/account/learners/${learnerId}/teachers`, guardian), learnerParams(learnerId))).json();
  assert(list.teachers.length === 1 && list.teachers[0].email === `t.${run}@example.test`, "guardian sees the linked teacher");
  const teacherId = list.teachers[0].principalId as string;

  const removeParams = { params: Promise.resolve({ learnerId, teacherId }) };
  assert((await removeTeacher(request("DELETE", `/api/account/learners/${learnerId}/teachers/${teacherId}`, otherGuardian), removeParams)).status === 403, "another family cannot remove the teacher");
  const removed = await removeTeacher(request("DELETE", `/api/account/learners/${learnerId}/teachers/${teacherId}`, guardian), removeParams);
  assert(removed.status === 200, `remove returned ${removed.status}`);
  assert((await teacherSummary(request("GET", `/api/teacher/summary?learnerId=${learnerId}`, teacher))).status === 403, "removed teacher loses access at once");
  pass("guardian sees linked teachers and removes access immediately");

  // 6. Codes: a new code cancels the unused one; relinking works; expiry.
  const first = (await (await createCode(request("POST", `/api/account/learners/${learnerId}/teachers`, guardian), learnerParams(learnerId))).json()).code as string;
  const second = (await (await createCode(request("POST", `/api/account/learners/${learnerId}/teachers`, guardian), learnerParams(learnerId))).json()).code as string;
  assert((await linkTeacher(request("POST", "/api/account/teacher-links", teacher, { code: first }))).status === 400, "an older unused code is cancelled");
  assert((await linkTeacher(request("POST", "/api/account/teacher-links", teacher, { code: second }))).status === 201, "a removed teacher can be linked again with a new code");
  assert((await teacherSummary(request("GET", `/api/teacher/summary?learnerId=${learnerId}`, teacher))).status === 200, "relinked teacher has access again");

  const third = (await (await createCode(request("POST", `/api/account/learners/${learnerId}/teachers`, guardian), learnerParams(learnerId))).json()).code as string;
  const otherTeacherAccount = await (await me(request("GET", "/api/session/me", otherTeacher))).json();
  const expired = await accountStore.redeemTeacherLinkCode(
    hashLinkCode(third.replace("-", "")),
    otherTeacherAccount.principalId,
    crypto.randomUUID(),
    new Date(Date.now() + 8 * 24 * 3600_000).toISOString(),
  );
  assert(expired === undefined, "a code is refused after seven days");
  pass("codes expire, are single-use, and a new code cancels the old");

  await resetRateLimits();
  const invitation = (await (await createCode(request("POST", `/api/account/learners/${learnerId}/teachers`, guardian), learnerParams(learnerId))).json()).code as string;
  for (const unauthorized of [undefined, otherGuardian, teacher]) {
    const response = await cancelCode(request("DELETE", `/api/account/learners/${learnerId}/teachers`, unauthorized), learnerParams(learnerId));
    assert(response.status === (unauthorized ? 403 : 401), "only this learner's guardian can cancel invitations");
  }
  assert((await cancelCode(request("DELETE", `/api/account/learners/${learnerId}/teachers`, guardian), learnerParams(learnerId))).status === 200, "guardian cancels an invitation");
  assert((await linkTeacher(request("POST", "/api/account/teacher-links", otherTeacher, { code: invitation }))).status === 400, "cancelled invitation cannot grant access");
  assert((await teacherSummary(request("GET", `/api/teacher/summary?learnerId=${learnerId}`, teacher))).status === 200, "cancelling invitations keeps existing teacher access");
  assert((await cancelCode(request("DELETE", `/api/account/learners/${learnerId}/teachers`, guardian), learnerParams(learnerId))).status === 200, "cancellation is idempotent");
  pass("guardians cancel unused invitations without removing linked teachers");

  const concurrent = (await (await createCode(request("POST", `/api/account/learners/${learnerId}/teachers`, guardian), learnerParams(learnerId))).json()).code as string;
  const claims = await Promise.all([teacher, otherTeacher].map((cookie) => linkTeacher(request("POST", "/api/account/teacher-links", cookie, { code: concurrent }))));
  assert(claims.filter((response) => response.status === 201).length === 1, "a concurrent claim grants access exactly once");
  assert(claims.filter((response) => response.status === 400).length === 1, "the competing claim is refused");
  pass("simultaneous code redemption is single-use");

  assert((await logout(request("POST", "/api/session/logout", teacher))).status === 200, "teacher signs out");
  assert((await me(request("GET", "/api/session/me", teacher))).status === 401, "teacher session is revoked on the server");
  const expiredLogout = await logout(request("POST", "/api/session/logout", teacher));
  assert(expiredLogout.status === 401, "already-revoked logout reports no active session");
  const cleared = expiredLogout.headers.get("set-cookie") ?? "";
  assert(cleared.includes("filumire_auth_session=") && cleared.includes("filumire_signed_in=") && cleared.includes("Max-Age=0"), "expired logout clears both cookies");
  pass("teacher logout revokes access and expired logout clears stale cookies");

  await resetRateLimits();
  console.log({ teacherLinkingTest: "PASS", persistence: process.env.FILUMIRE_PERSISTENCE ?? "memory" });
}

async function cleanUp(): Promise<void> {
  if (process.env.FILUMIRE_PERSISTENCE !== "postgres") return;

  const { pool } = await import("../services/database");
  const { deleteTestLearners, deleteTestPrincipals } = await import("./postgres-test-cleanup");

  await pool.query("DELETE FROM teacher_link_codes WHERE learner_id = ANY($1)", [createdLearners]);
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
