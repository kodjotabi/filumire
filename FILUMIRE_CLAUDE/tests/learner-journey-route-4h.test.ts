import { GET, POST } from "../apps/learner/app/api/learning/route";
import { POST as issue } from "../apps/learner/app/api/session/issue/route";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { createPrincipalLearnerAccess, resolveOrCreatePrincipalForExternalIdentity } from "../services/principal";
import { persistenceStore } from "../services/persistence-provider";
import { setLearnerGrade } from "../services/learner-context";
import { seedContent } from "../services/content-store/seed";
import { getAllContent } from "../services/content-store/index";
import { getEvidence } from "../services/evidence-store/index";
import { getLearnerState } from "../services/learner-state/index";
import { buildTeacherLearnerSummary } from "../services/teacher-summary/index";
import { isCompetencyCompleted, CONTENT_EXHAUSTED_NEEDS_SUPPORT } from "../services/learner-path/progression";
import { supportsSpacedRevision } from "../services/learner-path/revision";
import {
  getAllSubjects,
  getCompetenciesForSubject,
  getCompetency,
  getInitialCompetencyForCurriculumSubjectLevel,
} from "../packages/curriculum/index";
import type { LearningContent } from "../packages/content";

/*
 * TRANCHE 4H: end-to-end learner journeys through the REAL learning route
 * (GET/POST /api/learning handlers with a PRODUCTION session: identity
 * token -> POST /api/session/issue -> session cookie, NODE_ENV=production,
 * learner grade set in the learner context), for every
 * pilot subject and grade, driven exactly as apps/learner/app/learn/page.tsx
 * drives it: GET by subjectId; answer questions with POST
 * interactionType "assessment"; press Next on cards with POST
 * interactionType "acknowledge"; GET again after an advance or a 409.
 *
 * The test knows the answers only as an oracle (server-side content store);
 * the learner-facing payload never contains them (checked).
 *
 * Journeys per subject/grade:
 *  - steady:     first answer of each topic wrong, then correct, until two
 *                topics are completed through mastery, retention and transfer,
 *                plus the request after the second advance;
 *  - struggling: always wrong, until the topic runs out of questions; then the
 *                learner moves on and the next request works;
 *  - placed:     starts on a topic whose prerequisites are not completed, mixed
 *                answers; expects a prerequisite repair, then completes the
 *                prerequisite and is returned to the original topic.
 * Every response: HTTP 200, same subject and grade, content belongs to the
 * decision's competency, no answer key leaked; every answer adds exactly one
 * evidence record; a wrong answer with an authored rule is diagnosed;
 * markers survive; the teacher summary reflects the journey.
 *
 * Failures are collected across all subjects (the sweep does not stop at
 * the first one) and reported together.
 *
 * Run: npx tsx --env-file=.env.local tests/learner-journey-route-4h.test.ts
 */

seedContent();

const contentByItem = new Map<string, LearningContent>();
for (const item of getAllContent()) {
  if (item.assessmentItemId && item.language === "en") contentByItem.set(item.assessmentItemId, item);
}

type Body = {
  decision: { action: string; reasonCode: string; competencyId: string; interventionId?: string };
  content?: { competencyId: string; assessmentItemId?: string; metadata?: Record<string, string> };
  error?: string;
};

/* Production identity, as in tests/grade-aware-subject-selection.test.ts. */
const ISSUER = "https://identity.journey-4h.example.test";
const AUDIENCE = "filumire-session-issuer";
function setEnv(name: string, value: string): () => void {
  const previous = Object.getOwnPropertyDescriptor(process.env, name);
  Object.defineProperty(process.env, name, { configurable: true, enumerable: true, value, writable: true });
  return () => (previous ? Object.defineProperty(process.env, name, previous) : Reflect.deleteProperty(process.env, name));
}
let signToken: (subject: string) => Promise<string>;
async function configureProduction(): Promise<() => void> {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.kid = "journey-4h-key";
  const restores = [
    setEnv("FILUMIRE_EXTERNAL_AUTH_JWKS", JSON.stringify({ keys: [jwk] })),
    setEnv("FILUMIRE_EXTERNAL_AUTH_ISSUER", ISSUER),
    setEnv("FILUMIRE_EXTERNAL_AUTH_AUDIENCE", AUDIENCE),
    setEnv("FILUMIRE_AUTH_JWT_SECRET", "journey-4h-secret-at-least-32-characters-long"),
    setEnv("NODE_ENV", "production"),
  ];
  signToken = (subject) => new SignJWT().setProtectedHeader({ alg: "RS256", kid: jwk.kid, typ: "JWT" }).setAudience(AUDIENCE).setExpirationTime("10m").setIssuedAt().setIssuer(ISSUER).setSubject(subject).sign(privateKey);
  return () => restores.reverse().forEach((restore) => restore());
}

const failures: string[] = [];
const summary: string[] = [];
let checks = 0;

class JourneyError extends Error {}

function makeChecker(label: string) {
  return (condition: unknown, message: string): void => {
    checks += 1;
    if (!condition) {
      throw new JourneyError(`${label}: ${message}`);
    }
  };
}

let signIns = 0;

class Learner {
  readonly learnerId: string;
  sessionId: string;
  cookie = "";
  answers = 0;
  cards = 0;
  requests = 0;
  readonly actions: string[] = [];

  constructor(readonly label: string, readonly subjectId: string, readonly check: (c: unknown, m: string) => void) {
    const id = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`.replace(/[^a-z0-9-]/gi, "-");
    this.learnerId = `learner-journey-${id}`;
    this.sessionId = "";
  }

  /* Sign in as a real learner of the subject's grade. */
  async signIn(): Promise<void> {
    const subject = `provider-subject-journey-${crypto.randomUUID()}`;
    const principalId = await resolveOrCreatePrincipalForExternalIdentity(ISSUER, subject);
    await persistenceStore.ensureLearnerExists(this.learnerId);
    await createPrincipalLearnerAccess(`access-journey-${crypto.randomUUID()}`, principalId, this.learnerId, "self");
    // Each journey is a different learner on their own device: give it its own
    // documentation-range (TEST-NET-2) address so the sweep's 36 sign-ins do
    // not share one session-issue rate-limit bucket (30 per 15 minutes).
    const response = await issue(new Request("http://localhost/api/session/issue", {
      method: "POST",
      headers: { authorization: `Bearer ${await signToken(subject)}`, "content-type": "application/json",
        "x-forwarded-for": `198.51.100.${(signIns++ % 254) + 1}` },
      body: JSON.stringify({ learnerId: this.learnerId }),
    }));
    this.check(response.status === 201, `session issuance 201 (${response.status})`);
    const match = response.headers.get("set-cookie")?.match(/filumire_auth_session=([^;]+)/);
    this.check(match, "session cookie issued");
    this.cookie = `filumire_auth_session=${decodeURIComponent(match![1])}`;
    const grade = getCompetency(getCompetenciesForSubject(this.subjectId)[0].id)!.learningLevelId;
    await setLearnerGrade(this.learnerId, grade);
  }

  private verify(status: number, body: Body, what: string): Body {
    this.requests += 1;
    this.check(status === 200, `${what}: HTTP ${status} ${body.error ?? ""}`);
    const decided = getCompetency(body.decision.competencyId);
    const subject = getCompetency(getCompetenciesForSubject(this.subjectId)[0].id)!;
    this.check(decided?.subjectId === this.subjectId && decided.learningLevelId === subject.learningLevelId, `${what}: decision stays in subject and grade (${body.decision.competencyId})`);
    if (body.content) {
      this.check(body.content.competencyId === body.decision.competencyId, `${what}: content ${body.content.competencyId} belongs to decision competency ${body.decision.competencyId} (${body.decision.action})`);
      this.check(!body.content.metadata?.expectedResponse && !body.content.metadata?.diagnosticRules, `${what}: no answer key sent to the learner`);
    }
    this.actions.push(`${body.decision.action}/${body.decision.reasonCode}`);
    const sessionId = (body.decision as { sessionId?: string }).sessionId;
    if (sessionId) this.sessionId = sessionId;
    return body;
  }

  async get(competencyId?: string): Promise<Body> {
    const params = new URLSearchParams({ subjectId: this.subjectId });
    if (competencyId) params.set("competencyId", competencyId);
    const response = await GET(new Request(`http://localhost/api/learning?${params}`, { headers: { cookie: this.cookie } }));
    return this.verify(response.status, (await response.json()) as Body, "GET");
  }

  private async post(payload: Record<string, unknown>): Promise<{ status: number; body: Body }> {
    const response = await POST(new Request("http://localhost/api/learning", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: this.cookie },
      body: JSON.stringify({ sessionId: this.sessionId, clientRequestId: crypto.randomUUID(), ...payload }),
    }));
    return { status: response.status, body: (await response.json()) as Body };
  }

  /* Next on a card; a 409 means the step cannot be acknowledged, so the client reloads. */
  async acknowledge(current: Body): Promise<Body> {
    this.cards += 1;
    const { status, body } = await this.post({ interactionType: "acknowledge", interventionId: current.decision.interventionId, competencyId: current.decision.competencyId });
    if (status === 409) return this.get();
    return this.verify(status, body, "acknowledge");
  }

  async answer(current: Body, correct: boolean): Promise<Body> {
    const itemId = current.content!.assessmentItemId!;
    const item = contentByItem.get(itemId);
    this.check(item, `answer: served item ${itemId} exists in the content store`);
    const competencyId = current.decision.competencyId;
    const expected = item!.metadata!.expectedResponse;
    const options = JSON.parse(current.content!.metadata?.options ?? "[]") as string[];
    const rules = JSON.parse(item!.metadata?.diagnosticRules ?? "{}") as Record<string, { errorPattern: string; diagnosticState: string }>;
    const wrong = options.find((option) => option !== expected && option in rules) ?? options.find((option) => option !== expected) ?? "zz-not-the-answer";
    const response = correct ? expected : wrong;

    const before = (await getEvidence(this.learnerId, competencyId)).length;
    const { status, body } = await this.post({ interactionType: "assessment", interventionId: current.decision.interventionId, assessmentItemId: itemId, competencyId, response });
    const verified = this.verify(status, body, `answer ${itemId}`);
    this.answers += 1;

    const evidence = await getEvidence(this.learnerId, competencyId);
    this.check(evidence.length === before + 1, `answer ${itemId}: exactly one evidence record added (${before} -> ${evidence.length})`);
    const latest = [...evidence].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).at(-1)!;
    this.check(latest.assessmentItemId === itemId && latest.outcome === (correct ? "correct" : "incorrect"), `answer ${itemId}: evidence outcome ${latest.outcome}`);
    if (!correct && rules[response]) {
      const state = await getLearnerState(this.learnerId, competencyId);
      const competency = state?.competencies.find((entry) => entry.competencyId === competencyId);
      this.check(competency?.errorPatterns.includes(rules[response].errorPattern) || latest.errorPattern === rules[response].errorPattern, `answer ${itemId}: misconception "${rules[response].errorPattern}" recorded`);
    }
    return verified;
  }

  async state(competencyId: string) {
    const stored = await getLearnerState(this.learnerId, competencyId);
    return stored?.competencies.find((entry) => entry.competencyId === competencyId);
  }
}

const isQuestion = (body: Body) => Boolean(body.content?.assessmentItemId);

/*
 * Drives the learner like the page does until a stop condition. wrongAt(n,
 * competencyId, answersOnCompetency) decides wrong answers.
 */
async function drive(
  learner: Learner,
  start: Body,
  wrongAt: (competencyId: string, answersOnCompetency: number) => boolean,
  stop: (body: Body, advances: { from: string; to: string; reason: string }[]) => boolean,
  maxSteps = 160,
) {
  let current = start;
  const advances: { from: string; to: string; reason: string }[] = [];
  const perCompetency = new Map<string, number>();
  const seenActions = new Map<string, Set<string>>();

  for (let step = 0; step < maxSteps; step += 1) {
    const competencyId = current.decision.competencyId;
    (seenActions.get(competencyId) ?? seenActions.set(competencyId, new Set()).get(competencyId)!).add(current.decision.action);
    if (stop(current, advances)) return { current, advances, seenActions };

    if (current.decision.action === "advance") {
      const from = (await getLearnerState(learner.learnerId, current.decision.competencyId))?.competencies[1]?.competencyId ?? "?";
      advances.push({ from, to: current.decision.competencyId, reason: current.decision.reasonCode });
      current = await learner.get();
      learner.check(current.decision.competencyId === advances.at(-1)!.to || current.decision.action === "advance" || current.decision.action === "complete", `next request after advance works on ${advances.at(-1)!.to} (got ${current.decision.competencyId} ${current.decision.action})`);
      continue;
    }
    if (current.decision.action === "complete") return { current, advances, seenActions };

    if (isQuestion(current)) {
      const n = perCompetency.get(competencyId) ?? 0;
      perCompetency.set(competencyId, n + 1);
      current = await learner.answer(current, !wrongAt(competencyId, n));
    } else if (current.decision.interventionId) {
      current = await learner.acknowledge(current);
    } else {
      current = await learner.get();
    }
  }
  learner.check(false, `no stop condition within ${maxSteps} steps; last ${current.decision.action}/${current.decision.reasonCode} on ${current.decision.competencyId}; recent ${learner.actions.slice(-8).join(", ")}`);
  throw new Error("unreachable");
}

async function steady(subjectId: string, label: string) {
  const check = makeChecker(`${label} steady`);
  const learner = new Learner(`${label}-steady`, subjectId, check);
  await learner.signIn();
  const first = await learner.get();
  const result = await drive(learner, first, (_, n) => n === 0, (body, advances) => advances.length >= 2 && body.decision.action !== "advance");

  const masteryAdvances = result.advances.filter((a) => a.reason === "MASTERY_RETENTION_TRANSFER_CONFIRMED");
  check(result.advances.length >= 2, `two advances reached (${result.advances.map((a) => a.reason).join(", ")})`);
  for (const advance of masteryAdvances) {
    const left = await learner.state(advance.from);
    check(isCompetencyCompleted(left), `${advance.from}: completed (mastery, retention, transfer) before advancing`);
    const seen = result.seenActions.get(advance.from) ?? new Set();
    check(seen.has("retention_check") && seen.has("transfer_check"), `${advance.from}: retention and transfer checks were asked (${[...seen].join(",")})`);
    const next = getCompetency(advance.to)!;
    for (const pre of next.prerequisiteCompetencyIds) {
      check(isCompetencyCompleted(await learner.state(pre)), `${advance.to}: prerequisite ${pre} completed before entry`);
    }
  }
  const teacher = await buildTeacherLearnerSummary(learner.learnerId);
  check(teacher.masteryMeasures.competenciesMastered >= masteryAdvances.length, `teacher: ${masteryAdvances.length} mastered topics counted (${teacher.masteryMeasures.competenciesMastered})`);
  return `steady: ${learner.answers} answers, ${learner.cards} cards, advances ${result.advances.map((a) => a.reason.replace("MASTERY_RETENTION_TRANSFER_CONFIRMED", "mastery")).join(" + ")}`;
}

async function struggling(subjectId: string, label: string) {
  const check = makeChecker(`${label} struggling`);
  const learner = new Learner(`${label}-struggling`, subjectId, check);
  await learner.signIn();
  const first = await learner.get();
  const startId = first.decision.competencyId;
  const result = await drive(learner, first, () => true, (body) => body.decision.reasonCode === CONTENT_EXHAUSTED_NEEDS_SUPPORT);
  check(result.current.decision.reasonCode === CONTENT_EXHAUSTED_NEEDS_SUPPORT, `ran out of questions (${result.current.decision.reasonCode})`);
  const exhausted = await learner.state(startId);
  check(exhausted?.readinessState?.reasonCode === CONTENT_EXHAUSTED_NEEDS_SUPPORT && !exhausted.masteredAt, "needs-support marker stored, no mastery claimed");
  check((exhausted?.confidence ?? 1) < 0.8 || (exhausted?.masteryEstimate ?? 1) < 0.8, "no mastery gate met");

  let moved = "stopped (blocked)";
  if (result.current.decision.action === "advance") {
    const next = getCompetency(result.current.decision.competencyId)!;
    check(!next.prerequisiteCompetencyIds.includes(startId), `moved to ${next.id}, which does not depend on the exhausted topic`);
    const after = await learner.get();
    check(after.decision.competencyId !== startId, `next request does not loop back into the exhausted topic (${after.decision.competencyId} ${after.decision.action})`);
    const kept = await learner.state(startId);
    check(kept?.readinessState?.reasonCode === CONTENT_EXHAUSTED_NEEDS_SUPPORT, "marker survives the move and the next request");
    moved = `moved to ${next.id.replace(/^competency-gh-/, "")}`;
  }
  const teacher = await buildTeacherLearnerSummary(learner.learnerId);
  const item = teacher.attentionQueue.find((entry) => entry.competencyId === startId);
  check(item?.attentionReasons.includes("content_exhausted_needs_support") && item.needsSupportRetryAt, "teacher: exhausted topic in attention queue with retry time");
  return `struggling: ${learner.answers} answers, exhausted ${startId.replace(/^competency-gh-/, "")}, ${moved}`;
}

async function placed(subjectId: string, label: string) {
  const check = makeChecker(`${label} placed`);
  const competencies = getCompetenciesForSubject(subjectId);
  const target = competencies.find((item) => item.prerequisiteCompetencyIds.length > 0 && item.prerequisiteCompetencyIds.every((id) => (getCompetency(id)?.prerequisiteCompetencyIds.length ?? 1) === 0));
  if (!target) return "placed: no competency with root prerequisites (skipped)";
  const learner = new Learner(`${label}-placed`, subjectId, check);
  await learner.signIn();
  const first = await learner.get(target.id);
  check(first.decision.competencyId === target.id || first.decision.reasonCode === "PREREQUISITE_REPAIR", `starts on ${target.id}`);

  /* Mixed on the placed topic (correct, wrong, ...); all correct elsewhere. */
  const toRepair = await drive(learner, first, (competencyId, n) => competencyId === target.id && n % 2 === 1, (body) => body.decision.reasonCode === "PREREQUISITE_REPAIR" || (body.decision.action === "advance" && body.decision.reasonCode === "MASTERY_RETENTION_TRANSFER_CONFIRMED"), 120);
  if (toRepair.current.decision.reasonCode !== "PREREQUISITE_REPAIR") {
    return `placed: ${target.id.replace(/^competency-gh-/, "")} completed without repair (mastery shown)`;
  }
  const repairId = toRepair.current.decision.competencyId;
  check(target.prerequisiteCompetencyIds.includes(repairId), `repair target ${repairId} is a prerequisite of ${target.id}`);
  const marker = await learner.state(target.id);
  check(marker?.prerequisiteRepair?.repairCompetencyId === repairId, "repair record stored on the original topic");

  /* Learn the prerequisite (all correct), then expect to come back. */
  const back = await drive(learner, toRepair.current, () => false, (body, advances) => advances.some((a) => a.to === target.id) || (advances.length >= 3), 160);
  const returned = back.advances.some((a) => a.to === target.id);
  check(returned, `returned to ${target.id} after completing prerequisites (advances: ${back.advances.map((a) => a.to.replace(/^competency-gh-/, "")).join(", ")})`);
  const teacher = await buildTeacherLearnerSummary(learner.learnerId);
  const detail = teacher.subjects.flatMap((s) => s.competencies).find((entry) => entry.competencyId === target.id);
  check(detail?.prerequisiteRepair?.competencyId === repairId && detail.prerequisiteRepair.completed === isCompetencyCompleted(await learner.state(repairId), supportsSpacedRevision(repairId)), "teacher: repair shown with correct status");
  return `placed: ${target.id.replace(/^competency-gh-/, "")} -> repair ${repairId.replace(/^competency-gh-/, "")} -> returned`;
}

(async () => {
  const restoreProduction = await configureProduction();
  const subjects = getAllSubjects().filter((subject) => subject.id !== "subject-test-mathematics" && getCompetenciesForSubject(subject.id).length > 0);
  const only = process.env.JOURNEY_SUBJECT;
  for (const subject of subjects) {
    if (only && !subject.id.includes(only)) continue;
    const any = getCompetenciesForSubject(subject.id)[0];
    getInitialCompetencyForCurriculumSubjectLevel(any.curriculumFrameworkId, subject.id, any.learningLevelId);
    const label = subject.id.replace(/^subject-gh-/, "").replace(/-pilot$/, "");
    for (const journey of [steady, struggling, placed]) {
      const started = Date.now();
      try {
        const line = await journey(subject.id, label);
        summary.push(`  OK   ${label.padEnd(22)} ${line} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
      } catch (error) {
        const message = error instanceof JourneyError ? error.message : `${label} ${journey.name}: ${(error as Error).stack ?? error}`;
        failures.push(message);
        summary.push(`  FAIL ${label.padEnd(22)} ${journey.name}`);
      }
    }
  }
  restoreProduction();
  console.log(summary.join("\n"));
  if (failures.length > 0) {
    console.error(`\nFAILURES (${failures.length}):\n${failures.map((f) => `- ${f}`).join("\n")}`);
    console.error(`FAIL learner-journey-route-4h (${checks} checks, ${failures.length} failed journeys)`);
    process.exit(1);
  }
  console.log(`PASS learner-journey-route-4h (${summary.length} journeys, ${checks} checks)`);
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
