import { createHash } from "node:crypto";
import type { LearningEvidence } from "../../packages/domain";

/*
 * Immediate correction (owner request 2026-10-20): after a wrong
 * multiple-choice answer FILU explains the mistake with the topic's
 * authored "check your thinking" (error analysis) text, re-teaches the
 * key idea from the topic's lesson and offers one retry of the same
 * question before the learner moves on.
 *
 * The retry is guided practice, never independent evidence: it is
 * recorded as attempt 2 after a worked explanation, which caps it at
 * "guided" (see resolveEvidenceIndependence). The answer key never
 * leaves the server; only the learner's own choice is echoed back.
 */

const RETRY_PREFIX = "corrective-retry-";

type TeachingContent = { type: string; language?: string; title: string; body: string };
/** `short` is what a child reads first; `body` stays available as "Read more". */
export interface CorrectionPassage { title: string; body: string; short: string }
export interface Correction {
  assessmentItemId: string;
  chosen: string;
  explanation?: CorrectionPassage;
  concept?: CorrectionPassage;
  /** True only on the first wrong answer, before its one retry is used. */
  retryAvailable: boolean;
  /** Present on the retry's own result. */
  retryOutcome?: "correct" | "incorrect";
}

/**
 * One stable retry key per wrong answer: repeating it is idempotent, never a third attempt.
 * Must fit the 64-character client request id limit, or it would get a random evidence id.
 */
export function correctiveRetryKey(learnerId: string, evidenceId: string): string {
  return RETRY_PREFIX + createHash("sha256").update(`${learnerId}:${evidenceId}`).digest("hex").slice(0, 40);
}

export function isCorrectiveRetryEvidence(evidence: Pick<LearningEvidence, "id">): boolean {
  return evidence.id.startsWith(`ev-${RETRY_PREFIX}`);
}

/** The learner's latest wrong first attempt at this item in this session, if any. */
export function retryableEvidence(evidence: readonly LearningEvidence[], assessmentItemId: string, sessionId: string): LearningEvidence | undefined {
  return evidence
    .filter((item) => item.assessmentItemId === assessmentItemId && item.sessionId === sessionId &&
      item.outcome === "incorrect" && !isCorrectiveRetryEvidence(item))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
}

const SHORT_SENTENCES = 2;
const words = (text: string) => new Set((text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]{4,}/g) ?? []));

/**
 * Keeps at most two sentences, chosen for what this learner did: the ones
 * sharing the most words with their answer and the question, in reading
 * order. With no overlap the opening sentences are kept.
 */
export function shortPassage(body: string, focus: string): string {
  const sentences = body.trim().split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý«"“])/);
  if (sentences.length <= SHORT_SENTENCES) return body.trim();
  const target = words(focus);
  const scored = sentences.map((text, index) => ({ index, score: [...words(text)].filter((w) => target.has(w)).length }));
  const relevant = scored.filter((s) => s.score > 0);
  const chosen = relevant.length
    ? relevant.sort((a, b) => b.score - a.score || a.index - b.index).slice(0, SHORT_SENTENCES).sort((a, b) => a.index - b.index)
    : scored.slice(0, SHORT_SENTENCES);
  return chosen.map((s) => sentences[s.index]).join(" ");
}

function passage(content: TeachingContent | undefined, focus: string): CorrectionPassage | undefined {
  return content && content.title.trim() && content.body.trim() ? { title: content.title, body: content.body, short: shortPassage(content.body, focus) } : undefined;
}

/** Learner-safe correction built only from teaching content in the learner's language. */
export function buildCorrection(input: {
  assessmentItemId: string;
  chosen: string;
  /** The question's own title and text, used only to pick relevant sentences. */
  question?: string;
  language?: string;
  topicContent: readonly TeachingContent[];
  retryAvailable: boolean;
  retryOutcome?: "correct" | "incorrect";
}): Correction {
  const inLanguage = input.topicContent.filter((item) => !input.language || item.language === input.language);
  // "Why" follows the learner's own choice; the key idea follows the question.
  const explanation = passage(inLanguage.find((item) => item.type === "remediation"), `${input.chosen} ${input.question ?? ""}`);
  const concept = passage(inLanguage.find((item) => item.type === "lesson"), input.question ?? input.chosen);
  return {
    assessmentItemId: input.assessmentItemId,
    chosen: input.chosen,
    explanation,
    concept,
    retryAvailable: input.retryAvailable,
    ...(input.retryOutcome ? { retryOutcome: input.retryOutcome } : {}),
  };
}
