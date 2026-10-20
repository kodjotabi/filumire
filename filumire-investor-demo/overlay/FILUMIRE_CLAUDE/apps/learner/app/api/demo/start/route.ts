import { randomBytes } from "node:crypto";
import { addLearnerForGuardian, createTeacherLinkCodeFor, linkTeacherWithCode, registerGuardian, registerTeacher, updateLearnerProfileFor } from "../../../../../../services/account";
import { issueSessionForPrincipal } from "../../../../../../services/identity";
import { setLearnerGrade } from "../../../../../../services/learner-context";
import { errorResponse, json, readJsonBody, withSessionCookies } from "../../account/http";
import { DEMO_LEARNERS, DEMO_TEACHER, type DemoLearnerKey } from "../../../demo/learners";

/*
 * Investor demo only (never part of the live app). Creates the fictional
 * demo family once with the app's own account functions: a guardian, three
 * learners and a teacher the guardian linked with the normal link codes.
 * Then signs in as the chosen learner, the guardian or the teacher, exactly
 * as the app's own sign-in would. Refuses unless the offline launcher set
 * FILUMIRE_DEMO=1.
 */
type DemoFamily = { principalId: string; learners: Record<DemoLearnerKey, string>; teacherPrincipalId?: string };
// __filumireDemoFamilyData is the plain copy that demo-state.ts saves and restores.
const shared = globalThis as { __filumireDemoFamily?: Promise<DemoFamily>; __filumireDemoFamilyData?: DemoFamily };
// Nobody signs in with these: the picker is the only way in.
const password = () => randomBytes(18).toString("base64url");

async function createFamily(): Promise<DemoFamily> {
  const { principalId } = await registerGuardian({
    email: "demo.family@fictional.localhost", password: password(), displayName: "Demo Family",
    preferredLanguage: "en", confirmsGuardian: true, acceptsNotice: true,
  });
  const learners = {} as Record<DemoLearnerKey, string>;
  for (const learner of DEMO_LEARNERS) {
    const { learnerId } = await addLearnerForGuardian(principalId, {
      displayName: learner.name, username: `demo-${learner.key}`, password: password(),
      preferredLanguage: learner.language, avatarId: learner.avatarId, consentsToLearnerData: true,
    });
    await setLearnerGrade(learnerId, learner.gradeId, "guardian");
    await updateLearnerProfileFor(principalId, learnerId, { avatarId: learner.avatarId, completeOnboarding: true });
    learners[learner.key] = learnerId;
  }
  return withTeacher({ principalId, learners });
}

/** The fictional teacher, linked to every demo learner through the guardian's link codes. */
async function withTeacher(family: DemoFamily): Promise<DemoFamily> {
  if (!family.teacherPrincipalId) {
    const { principalId: teacherPrincipalId } = await registerTeacher({
      email: "demo.teacher@fictional.localhost", password: password(), displayName: DEMO_TEACHER.name,
      preferredLanguage: "en", confirmsTeacher: true, acceptsNotice: true,
    });
    for (const learnerId of Object.values(family.learners)) {
      const { code } = await createTeacherLinkCodeFor(family.principalId, learnerId);
      await linkTeacherWithCode(teacherPrincipalId, code);
    }
    family = { ...family, teacherPrincipalId };
  }
  shared.__filumireDemoFamilyData = family;
  return family;
}

export async function POST(request: Request) {
  try {
    if (process.env.FILUMIRE_DEMO !== "1") return json({ error: "Not available." }, { status: 404 });
    const body = await readJsonBody(request);
    const learner = DEMO_LEARNERS.find((item) => item.key === body.learner);
    if (!learner && body.learner !== "guardian" && body.learner !== "teacher") return json({ error: "Unknown demo learner." }, { status: 400 });
    // A family restored from before the teacher existed gets one now.
    shared.__filumireDemoFamily = (shared.__filumireDemoFamily ?? createFamily()).then(withTeacher);
    shared.__filumireDemoFamily.catch(() => { shared.__filumireDemoFamily = undefined; });
    const family = await shared.__filumireDemoFamily;
    const language = body.language === "fr" ? "fr" : "en";
    if (learner) {
      const session = await issueSessionForPrincipal(family.principalId, family.learners[learner.key]);
      return withSessionCookies(json({ redirect: `/dashboard?lang=${learner.language}` }), session.token);
    }
    const adult = body.learner === "guardian" ? family.principalId : family.teacherPrincipalId!;
    const session = await issueSessionForPrincipal(adult);
    return withSessionCookies(json({ redirect: `/${body.learner === "guardian" ? "family" : "teacher"}?lang=${language}` }), session.token);
  } catch (error) {
    return errorResponse(error, "demo start");
  }
}
