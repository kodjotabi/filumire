import assert from "node:assert/strict";
import { DELETE as remove } from "../apps/learner/app/api/account/learners/[learnerId]/route";
import { GET as me } from "../apps/learner/app/api/session/me/route";
import { registerGuardian, registerTeacher, addLearnerForGuardian, authenticateWithPassword, describeAccount,
  createTeacherLinkCodeFor, linkTeacherWithCode } from "../services/account";
import { accountStore } from "../services/account/store";
import { issueSessionForPrincipal } from "../services/identity";
import { persistenceStore } from "../services/persistence-provider";
import { createPrincipalLearnerAccess, isPrincipalAuthorizedForLearner } from "../services/principal";
import { getLearnerLearningContext, setLearnerGrade } from "../services/learner-context";
import { GRADE_GHANA_BASIC_5_ID } from "../packages/curriculum-framework";
import { createInitialLearnerState } from "../services/learner-state";

assert(process.env.FILUMIRE_PERSISTENCE === "memory" ||
  (process.env.FILUMIRE_PERSISTENCE === "postgres" && process.env.FILUMIRE_REMOVAL_PG_TEST_VERIFIED === "true"),
  "fictional fixtures require memory or the verified isolated PostgreSQL runner");
Object.assign(process.env, { NODE_ENV: "production", FILUMIRE_ACCOUNT_REGISTRATION: "open",
  FILUMIRE_AUTH_JWT_SECRET: "fictional-learner-removal-secret-at-least-32-characters" });
if (process.env.FILUMIRE_REMOVAL_TEST_REVIEWERS === "true") {
  Object.assign(process.env, { FILUMIRE_ACCESS_MODE: "reviewers", FILUMIRE_ACCOUNT_REGISTRATION: "closed",
    FILUMIRE_REVIEWER_EMAILS: "owner@example.test:guardian,other@example.test:guardian,teacher@example.test:teacher,spare1@example.test:guardian,spare2@example.test:teacher" });
}
const password = "fictional-password-78";
const guardianInput = (name: string) => ({ email: `${name}@example.test`, displayName: name, password,
  preferredLanguage: "en", confirmsGuardian: true, acceptsNotice: true });
const owner = (await registerGuardian(guardianInput("owner"))).principalId;
const other = (await registerGuardian(guardianInput("other"))).principalId;
const teacher = (await registerTeacher({ ...guardianInput("teacher"), confirmsTeacher: true })).principalId;
const add = (username: string) => addLearnerForGuardian(owner, { displayName: username, username, password,
  preferredLanguage: "en", consentsToLearnerData: true });
const child = await add("fictional.remove");
const sibling = await add("fictional.keep");
const childPrincipal = (await authenticateWithPassword("fictional.remove", password)).principalId;
const token = async (principal: string, learnerId?: string) => `filumire_auth_session=${(await issueSessionForPrincipal(principal, learnerId)).token}`;
const ownerCookie = await token(owner);
const childCookie = await token(childPrincipal, child.learnerId);
const otherCookie = await token(other);
const teacherCookie = await token(teacher);
const linked = await createTeacherLinkCodeFor(owner, child.learnerId);
await linkTeacherWithCode(teacher, linked.code);
const unusedCode = await createTeacherLinkCodeFor(owner, child.learnerId);
await setLearnerGrade(child.learnerId, GRADE_GHANA_BASIC_5_ID, "guardian");
await persistenceStore.saveLearnerState(createInitialLearnerState(child.learnerId, "fictional-removal-competency"));
await persistenceStore.saveEvidence({ id: crypto.randomUUID(), learnerId: child.learnerId,
  competencyId: "fictional-removal-competency", source: "assessment", outcome: "correct",
  timestamp: new Date().toISOString(), policyVersion: "fictional-removal-test" });
assert.equal((await persistenceStore.getEvidenceForLearner(child.learnerId)).length, 1);
const snapshot = async () => JSON.stringify({ profile: await accountStore.getLearnerProfile(child.learnerId),
  context: await getLearnerLearningContext(child.learnerId),
  states: await persistenceStore.getLearnerStates(child.learnerId), evidence: await persistenceStore.getEvidenceForLearner(child.learnerId),
  consents: await accountStore.listConsentRecords(owner) });
const before = await snapshot();
async function attempt(cookie: string, body: unknown = { confirmRemoval: true }, learnerId = child.learnerId, origin = "http://localhost") {
  return remove(new Request(`http://localhost/api/account/learners/${learnerId}`, { method: "DELETE",
    headers: { cookie, origin, "content-type": "application/json" }, body: JSON.stringify(body) }),
    { params: Promise.resolve({ learnerId }) });
}
assert.equal((await attempt("")).status, 401);
for (const cookie of [otherCookie, childCookie, teacherCookie]) assert.equal((await attempt(cookie)).status, 403);
assert.equal((await attempt(ownerCookie, {}, "missing-learner")).status, 403);
for (const confirmRemoval of [undefined, false, "true", 1]) {
  assert.equal((await attempt(ownerCookie, { confirmRemoval })).status, 400);
}
assert.equal((await attempt(ownerCookie, { confirmRemoval: true }, child.learnerId, "https://foreign.example")).status, 400);
assert.equal(await snapshot(), before, "refused requests leave records untouched");
assert.equal(await isPrincipalAuthorizedForLearner(owner, child.learnerId), true);
// An unrelated guardian cannot remove a learner even if granted a guardian link.
await createPrincipalLearnerAccess(crypto.randomUUID(), other, child.learnerId, "guardian");
assert.equal((await attempt(otherCookie)).status, 403);
assert.equal((await accountStore.removeLearnerAccount(other, child.learnerId)), false, "store enforces ownership independently");
assert.equal((await attempt(ownerCookie)).status, 200);
assert.equal(await snapshot(), before, "removal preserves the profile, consent and learning history");
for (const principal of [owner, other, teacher, childPrincipal]) {
  assert.equal(await isPrincipalAuthorizedForLearner(principal, child.learnerId), false);
}
assert.equal((await describeAccount(owner)).learners.some(row => row.learnerId === child.learnerId), false);
assert.equal(await isPrincipalAuthorizedForLearner(owner, sibling.learnerId), true);
await assert.rejects(authenticateWithPassword("fictional.remove", password));
assert.equal((await me(new Request("http://localhost/api/session/me", { headers: { cookie: childCookie } }))).status, 401);
assert.equal((await me(new Request("http://localhost/api/session/me", { headers: { cookie: ownerCookie } }))).status, 200);
await assert.rejects(linkTeacherWithCode(teacher, unusedCode.code));
assert.equal((await attempt(ownerCookie)).status, 403, "repeated removal fails safely");
for (let i = 0; i < 3; i++) {
  const raced = await add(`fictional.race${i}`);
  const code = await createTeacherLinkCodeFor(owner, raced.learnerId);
  const outcomes = await Promise.allSettled([
    attempt(ownerCookie, { confirmRemoval: true }, raced.learnerId),
    linkTeacherWithCode(teacher, code.code),
    attempt(ownerCookie, { confirmRemoval: true }, raced.learnerId),
  ]);
  assert(outcomes.some(result => result.status === "fulfilled" && result.value instanceof Response && result.value.status === 200));
  const removalResponses = [outcomes[0], outcomes[2]].map(result => {
    assert.equal(result.status, "fulfilled");
    return (result as PromiseFulfilledResult<Response>).value.status;
  });
  assert.deepEqual(removalResponses.sort(), [200, 403], "one concurrent removal succeeds; the other fails safely");
  assert.equal(await isPrincipalAuthorizedForLearner(teacher, raced.learnerId), false, "racing code cannot restore teacher access");
  assert.equal(await isPrincipalAuthorizedForLearner(owner, raced.learnerId), false);
}
console.log("PASS learner removal: confirmation, ownership, role, origin, access, sessions, history and sibling protection");

export const removalFixtures = { owner, other, teacher, child, sibling, childPrincipal, ownerCookie, add, attempt };
