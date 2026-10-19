import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { LearningContent } from "../../packages/content";
import type { LessonClosure } from "../../packages/contracts/lesson-closure";
import { getCompetency, getCompetenciesForSubject } from "../../packages/curriculum";
import { getContent, getContentForCompetency } from "../content-store";
import { seedContent } from "../content-store/seed";
import { getIntervention, getLearnerInterventions, isAwaitingInstructionCheck, INSTRUCTIONAL_INTERVENTION_TYPES } from "../intervention-store";
import { getLearnerState, getLearnerStates } from "../learner-state-store";
import { getEvidence } from "../evidence-store";
import { buildLearnerPath } from "../learner-path";
import { selectVerifiedReflectionVisuals } from "../outline-visuals";
import { loadConversationContext } from "../edututor/conversation-context";
import { getPilotMeasurementEvents } from "../pilot-measurement";

const TTL = 7 * 24 * 60 * 60 * 1000;
const localKey = randomBytes(32);
interface Receipt { owner: string; interventionId: string; contentId: string; hash: string; issuedAt: number; expiresAt: number }
export class LessonClosureError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}
function key(): Buffer {
  const secret = process.env.FILUMIRE_AUTH_JWT_SECRET;
  if (secret && secret.length >= 32) return createHash("sha256").update(`filumire-lesson-receipt:${secret}`).digest();
  if (process.env.NODE_ENV === "production") throw new LessonClosureError("configuration_unavailable", 503);
  return localKey;
}
function owner(learnerId: string) { return createHash("sha256").update(`lesson-owner:${learnerId}`).digest("hex"); }
function contentHash(content: LearningContent) {
  return createHash("sha256").update(JSON.stringify([content.id, content.competencyId, content.language, content.type, content.title, content.body, content.version])).digest("hex");
}
function instructional(content: LearningContent | undefined): content is LearningContent {
  return Boolean(content && !content.assessmentItemId && ["lesson", "example", "scaffold", "remediation"].includes(content.type));
}
/** Identifies content delivered by the existing learning API, not evidence of learning. */
export async function issueLessonReceipt(learnerId: string, interventionId: string | undefined, content: LearningContent | undefined): Promise<string | undefined> {
  if (!interventionId || !instructional(content)) return undefined;
  const intervention = await getIntervention(interventionId);
  if (!intervention || intervention.learnerId !== learnerId || intervention.competencyId !== content.competencyId ||
    intervention.status !== "active" || !INSTRUCTIONAL_INTERVENTION_TYPES.includes(intervention.type)) return undefined;
  const receipt: Receipt = { owner: owner(learnerId), interventionId, contentId: content.id, hash: contentHash(content), issuedAt: Date.now(), expiresAt: Date.now() + TTL };
  const payload = Buffer.from(JSON.stringify(receipt)).toString("base64url");
  return `${payload}.${createHmac("sha256", key()).update(payload).digest("base64url")}`;
}
function decode(token: string, learnerId: string): Receipt {
  if (typeof token !== "string" || token.length > 4096) throw new LessonClosureError("invalid_receipt", 400);
  const [payload, signature, extra] = token.split(".");
  const expected = createHmac("sha256", key()).update(payload ?? "").digest();
  const actual = Buffer.from(signature ?? "", "base64url");
  if (extra || actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new LessonClosureError("invalid_receipt", 404);
  let receipt: Receipt;
  try { receipt = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); }
  catch { throw new LessonClosureError("invalid_receipt", 404); }
  if (!receipt || receipt.owner !== owner(learnerId) || !Number.isFinite(receipt.issuedAt) || !Number.isFinite(receipt.expiresAt) || receipt.expiresAt <= Date.now()) throw new LessonClosureError("invalid_receipt", 404);
  return receipt;
}
/** Exact, complete authored sentences: no model, paraphrase or mathematical truncation. */
export function authoredExcerpts(body: string): string[] {
  const sentences = body.trim().split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý])/u);
  const selected: string[] = [];
  let length = 0;
  for (const sentence of sentences) {
    if (!sentence || selected.length === 3 || length + sentence.length > 850) break;
    selected.push(sentence); length += sentence.length;
  }
  return selected;
}

/** Read-only closure verification. Merely viewing it cannot acknowledge or assess anything. */
export async function getLessonClosure(learnerId: string, token: string, language: "en" | "fr"): Promise<LessonClosure> {
  const receipt = decode(token, learnerId);
  seedContent();
  const source = getContent(receipt.contentId);
  const intervention = await getIntervention(receipt.interventionId);
  if (!instructional(source) || contentHash(source) !== receipt.hash || !intervention || intervention.learnerId !== learnerId ||
    intervention.competencyId !== source.competencyId || !INSTRUCTIONAL_INTERVENTION_TYPES.includes(intervention.type)) throw new LessonClosureError("lesson_unavailable", 404);
  if (intervention.status !== "completed" || !intervention.completedAt || !Number.isFinite(Date.parse(intervention.completedAt)) || Date.parse(intervention.completedAt) < receipt.issuedAt) throw new LessonClosureError("lesson_not_completed", 409);
  const competency = getCompetency(source.competencyId);
  if (!competency) throw new LessonClosureError("lesson_unavailable", 404);
  const [state, evidence, states] = await Promise.all([
    getLearnerState(learnerId, source.competencyId), getEvidence(learnerId, source.competencyId), getLearnerStates(learnerId),
  ]);
  const profile = state?.competencies.find((item) => item.competencyId === source.competencyId);
  const allProfiles = states.flatMap((item) => item.competencies);
  const path = buildLearnerPath({ states: allProfiles, curriculum: {
    listCompetencyIds: () => getCompetenciesForSubject(competency.subjectId).map((item) => item.id),
    getPrerequisites: (id) => getCompetency(id)?.prerequisiteCompetencyIds,
  } });
  const pathEntry = path.entries.find((item) => item.competencyId === source.competencyId);
  const canonical = source.translationOfContentId ?? source.id;
  const translated = source.language === language ? source : getContentForCompetency(source.competencyId, language).find((item) =>
    instructional(item) && item.type === source.type && (item.translationOfContentId ?? item.id) === canonical,
  );
  const excerpts = translated ? authoredExcerpts(translated.body) : [];
  const attempts = evidence.filter((item) => ["correct", "incorrect", "partial"].includes(item.outcome)).sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));
  let consecutiveErrors = 0;
  for (const item of [...attempts].reverse()) { if (item.outcome !== "incorrect") break; consecutiveErrors++; }
  const firstRecorded = attempts[0]?.timestamp;
  const elapsed = firstRecorded && profile?.masteredAt ? Date.parse(profile.masteredAt) - Date.parse(firstRecorded) : undefined;
  // A verified old receipt must not become a diagram lookup during a scored
  // activity. Reuse the existing read-only assessment boundary; ambiguity denies.
  const reflectionCandidates = translated && excerpts.length ? selectVerifiedReflectionVisuals(translated, language) : [];
  let reflectionVisualsAllowed = false;
  if (reflectionCandidates.length) try {
    const [interventions, deliveries] = await Promise.all([getLearnerInterventions(learnerId), getPilotMeasurementEvents(learnerId)]);
    const awaitingCheck = interventions.some(i => isAwaitingInstructionCheck(i) && deliveries.some(e =>
      e.eventType === "learning_presented" && e.competencyId === i.competencyId && e.createdAt >= i.startedAt &&
      e.metadata.source === "assessment-delivery-v1" && e.metadata.interventionId === i.interventionId && Boolean(e.metadata.assessmentItemId)));
    reflectionVisualsAllowed = !awaitingCheck && !(await loadConversationContext(learnerId, language)).assessmentProtected;
  } catch { /* Fail closed. */ }
  return {
    interventionId: intervention.interventionId, competencyId: source.competencyId, subjectId: competency.subjectId,
    completedAt: intervention.completedAt, language,
    summary: { available: Boolean(translated && excerpts.length), title: translated?.title,
      concepts: source.type === "example" ? [] : excerpts, examples: source.type === "example" ? excerpts : [], narration: excerpts.join("\n\n"),
      visuals: reflectionVisualsAllowed ? reflectionCandidates : [] },
    evidence: {
      attempts: attempts.length, correct: attempts.filter((item) => item.outcome === "correct").length,
      partial: attempts.filter((item) => item.outcome === "partial").length, incorrect: attempts.filter((item) => item.outcome === "incorrect").length,
      consecutiveErrors, hasIdentifiedDifficulties: Boolean(profile?.errorPatterns.length),
      acquisition: pathEntry?.acquisition ?? "none", retention: pathEntry?.retention ?? "untested", retentionDueAt: pathEntry?.retentionDueAt,
      elapsedToFirstMasteryMs: elapsed !== undefined && Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : undefined,
    },
  };
}
