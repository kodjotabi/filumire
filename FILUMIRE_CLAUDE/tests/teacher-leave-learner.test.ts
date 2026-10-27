import assert from "node:assert/strict";
import { DELETE as leave } from "../apps/learner/app/api/account/teacher-links/[learnerId]/route";
import { GET as me } from "../apps/learner/app/api/session/me/route";
import { registerGuardian, registerTeacher, addLearnerForGuardian, authenticateWithPassword,
  createTeacherLinkCodeFor, linkTeacherWithCode } from "../services/account";
import { accountStore } from "../services/account/store";
import { issueSessionForPrincipal } from "../services/identity";
import { persistenceStore } from "../services/persistence-provider";
import { isPrincipalAuthorizedForLearner } from "../services/principal";
import { createInitialLearnerState } from "../services/learner-state";

/*
 * A teacher stops teaching one learner. Only that teacher's own
 * link ends: the learner keeps signing in, the guardian and any
 * other teacher keep their access, and no learning record changes.
 * Fictional fixtures, in-memory persistence only.
 */
assert((process.env.FILUMIRE_PERSISTENCE ?? "memory") === "memory", "fictional fixtures require in-memory persistence");
Object.assign(process.env, { NODE_ENV: "production", FILUMIRE_ACCOUNT_REGISTRATION: "open",
  FILUMIRE_AUTH_JWT_SECRET: "fictional-teacher-leave-secret-at-least-32-characters" });

const password = "fictional-password-78";
const adult = (name: string) => ({ email: `${name}@example.test`, displayName: name, password,
  preferredLanguage: "en", confirmsGuardian: true, acceptsNotice: true });
const owner = (await registerGuardian(adult("owner"))).principalId;
const teacher = (await registerTeacher({ ...adult("teacher"), confirmsTeacher: true })).principalId;
const colleague = (await registerTeacher({ ...adult("colleague"), confirmsTeacher: true })).principalId;
const stranger = (await registerTeacher({ ...adult("stranger"), confirmsTeacher: true })).principalId;
const child = await addLearnerForGuardian(owner, { displayName: "Kofi", username: "fictional.kofi", password,
  preferredLanguage: "en", consentsToLearnerData: true });
const childPrincipal = (await authenticateWithPassword("fictional.kofi", password)).principalId;
const token = async (principal: string, learnerId?: string) =>
  `filumire_auth_session=${(await issueSessionForPrincipal(principal, learnerId)).token}`;
const [ownerCookie, teacherCookie, strangerCookie, childCookie] = await Promise.all([
  token(owner), token(teacher), token(stranger), token(childPrincipal, child.learnerId)]);
await linkTeacherWithCode(teacher, (await createTeacherLinkCodeFor(owner, child.learnerId)).code);
await linkTeacherWithCode(colleague, (await createTeacherLinkCodeFor(owner, child.learnerId)).code);
await persistenceStore.saveLearnerState(createInitialLearnerState(child.learnerId, "fictional-leave-competency"));
await persistenceStore.saveEvidence({ id: crypto.randomUUID(), learnerId: child.learnerId,
  competencyId: "fictional-leave-competency", source: "assessment", outcome: "correct",
  timestamp: new Date().toISOString(), policyVersion: "fictional-leave-test" });

const snapshot = async () => JSON.stringify({ profile: await accountStore.getLearnerProfile(child.learnerId),
  states: await persistenceStore.getLearnerStates(child.learnerId),
  evidence: await persistenceStore.getEvidenceForLearner(child.learnerId) });
const before = await snapshot();

async function attempt(cookie: string, body: unknown = { confirmRemoval: true }, learnerId = child.learnerId, origin = "http://localhost") {
  return leave(new Request(`http://localhost/api/account/teacher-links/${learnerId}`, { method: "DELETE",
    headers: { cookie, origin, "content-type": "application/json" }, body: JSON.stringify(body) }),
    { params: Promise.resolve({ learnerId }) });
}

// Refused: signed out, a guardian, the learner, an unlinked teacher, no confirmation, another site.
assert.equal((await attempt("")).status, 401);
for (const cookie of [ownerCookie, childCookie, strangerCookie]) assert.equal((await attempt(cookie)).status, 403);
assert.equal((await attempt(teacherCookie, { confirmRemoval: true }, "missing-learner")).status, 403);
for (const confirmRemoval of [undefined, false, "true", 1]) {
  assert.equal((await attempt(teacherCookie, { confirmRemoval })).status, 400);
}
assert.equal((await attempt(teacherCookie, { confirmRemoval: true }, child.learnerId, "https://foreign.example")).status, 400);
assert.equal(await isPrincipalAuthorizedForLearner(teacher, child.learnerId), true, "refused requests change nothing");
console.log({ test: "refusals: signed out, guardian, learner, unlinked teacher, unconfirmed, foreign origin", result: "PASS" });

// The teacher leaves: only their own link ends.
const left = await attempt(teacherCookie);
assert.equal(left.status, 200);
assert.deepEqual(await left.json(), { removed: true });
assert.equal(await isPrincipalAuthorizedForLearner(teacher, child.learnerId), false);
for (const principal of [owner, colleague, childPrincipal]) {
  assert.equal(await isPrincipalAuthorizedForLearner(principal, child.learnerId), true);
}
await authenticateWithPassword("fictional.kofi", password);
assert.equal((await me(new Request("http://localhost/api/session/me", { headers: { cookie: childCookie } }))).status, 200);
assert.equal(await snapshot(), before, "leaving keeps the learner's profile and learning history");
assert.equal((await attempt(teacherCookie)).status, 403, "leaving twice fails safely");
console.log({ test: "teacher leaves; guardian, other teacher and learner unaffected", result: "PASS" });

// The guardian can link the same teacher again with a new code.
await linkTeacherWithCode(teacher, (await createTeacherLinkCodeFor(owner, child.learnerId)).code);
assert.equal(await isPrincipalAuthorizedForLearner(teacher, child.learnerId), true);
console.log({ test: "guardian can relink the teacher", result: "PASS" });
