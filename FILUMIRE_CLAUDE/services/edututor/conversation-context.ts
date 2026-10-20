import { createHash } from "node:crypto";
import { getLearnerLearningContext } from "../learner-context";
import { getLearnerState } from "../learner-state-store";
import { getLearnerInterventions, isAwaitingInstructionCheck } from "../intervention-store";
import { getEvidenceForLearner } from "../evidence-store";
import { evaluateInterventionEvidence } from "../intervention";
import { readAssessmentRecovery } from "./assessment-recovery";
import { accountStore } from "../account/store";
import { getCompetency } from "../../packages/curriculum";
import { resolveCurriculumContext } from "../../packages/curriculum-framework";
import { getContentForCompetency } from "../content-store";
import { seedContent } from "../content-store/seed";
import { generateInstruction } from ".";
import type { ConversationLanguage, TutoringConversationContext } from "../../packages/ai/conversation";
import { independentConceptualExplanations } from "../../packages/ai/conceptual-explanations";

export interface TrustedConversationContext {
  fingerprint: string;
  assessmentProtected: boolean;
  providerContext: TutoringConversationContext;
  topicTitle?: string;
  // Server-only policy. Never sent to a provider or the client as assessment data.
  safeConceptualExplanations?: string[];
  // An unanswered scored activity exists only in unrelated topics. The current
  // topic is not protected, but built-in explanations still need clearing.
  otherTopicsOpen?: boolean;
}

/** Every competency reachable through prerequisite links from `competencyId`. */
function prerequisiteClosure(competencyId: string): Set<string> {
  const seen = new Set<string>();
  const pending = [competencyId];
  while (pending.length) {
    for (const id of getCompetency(pending.pop()!)?.prerequisiteCompetencyIds ?? []) {
      if (!seen.has(id)) { seen.add(id); pending.push(id); }
    }
  }
  return seen;
}

/** Reads existing authoritative state. Never generates an adaptive decision or acknowledges a lesson. */
export async function loadConversationContext(learnerId: string, language: ConversationLanguage, development = false): Promise<TrustedConversationContext> {
  const context = await getLearnerLearningContext(learnerId);
  const interventions = await getLearnerInterventions(learnerId);
  const evidence = await getEvidenceForLearner(learnerId);
  // Use the same completion rule as the adaptive engine, without rewriting
  // historical rows. An answered step can retain a stale active flag until
  // the next lesson request. Pending teacher reviews remain fail closed.
  const recovery = await readAssessmentRecovery(learnerId);
  const scoredDeliveries = new Set((await Promise.all(interventions.map(async item =>
    await recovery.scoredPresentation(item) ? item.interventionId : undefined))).filter(Boolean));
  const unanswered = interventions.filter(item => (item.status === "active" ||
    isAwaitingInstructionCheck(item) && scoredDeliveries.has(item.interventionId)) &&
    (item.type === "teacher_review" || !evidence.some(answer =>
      answer.learnerId === learnerId && answer.competencyId === item.competencyId &&
      answer.interventionId === item.interventionId &&
      evaluateInterventionEvidence(item, answer).outcome !== "not_yet_evaluated")));
  const protectedRows = await Promise.all(unanswered.map(async item => {
    if(item.type === "teacher_review" || !recovery.recovered(item)) return item;
    // A signed guardian recovery never overrides a live or newly presented
    // activity. Session expiry alone does not relax an unrecovered record.
    return await recovery.ended(item) && !await recovery.presented(item) ? undefined : item;
  }));
  const active = protectedRows.filter((item): item is NonNullable<typeof item> => Boolean(item));
  // The existing local fixture API does not persist a curriculum pointer.
  // Only its authenticated development identity may use a unique server-side
  // active intervention as the pointer. Production never uses this fallback.
  const localActive = development && !context?.activeCompetencyId
    ? active : [];
  // A verified learner can ask foundational questions before a lesson is
  // selected. Missing lesson state is not evidence of a scored activity.
  // This path exposes no teaching and cannot relax any active intervention.
  const resolvedIdle = context && resolveCurriculumContext(context.curriculumVersionId, context.gradeId, context.activeSubjectId);
  const registeredIdle = !context && active.length === 0
    ? await accountStore.getLearnerProfile(learnerId) : undefined;
  const generalOnly: TrustedConversationContext | undefined = active.length === 0 && (resolvedIdle || registeredIdle?.learnerId === learnerId) ? {
    fingerprint: createHash("sha256").update(JSON.stringify({ context, active, recovery: recovery.fingerprint, mode: "general-only" })).digest("hex"),
    assessmentProtected: recovery.pendingTeacherReview,
    providerContext: { language, subjectId: resolvedIdle?.subject.id ?? "", competencyId: "", prerequisiteIds: [],
      mastery: 0, confidence: 0, diagnosticState: "unknown", difficulties: [], recommendation: "teach", teaching: [] },
  } : undefined;
  const competencyId = context?.activeCompetencyId ?? (localActive.length === 1 ? localActive[0].competencyId : undefined);
  if (!competencyId) {
    if (generalOnly) return generalOnly;
    throw new Error("CONTEXT_UNAVAILABLE");
  }
  const state = await getLearnerState(learnerId, competencyId);
  const profile = state?.competencies.find((item) => item.competencyId === competencyId);
  const competency = getCompetency(competencyId);
  if (!state || !profile || !competency || profile.learnerId !== learnerId) {
    if (generalOnly) return generalOnly;
    throw new Error("CONTEXT_UNAVAILABLE");
  }
  if (!development) {
    const resolved = context && resolveCurriculumContext(context.curriculumVersionId, context.gradeId, context.activeSubjectId);
    if (!resolved || competency.subjectId !== resolved.subject.id) throw new Error("CONTEXT_UNAVAILABLE");
  }
  seedContent();
  const topicTitle = getContentForCompetency(competency.id, language)
    .find(item => !item.assessmentItemId && item.type === "lesson")?.title;
  // Ambiguity and all assessment-capable interventions fail closed. A pending
  // teacher review also remains protected. Client content IDs cannot relax this.
  const currentActive = active.filter((item) => item.competencyId === competencyId);
  const intervention = currentActive.length === 1 ? currentActive[0] : undefined;
  // Owner decision 2026-10-20: an unanswered activity protects the current topic
  // only when it is related: the same topic, or either topic is a prerequisite of
  // the other. Teacher reviews and unknown competencies always count as related.
  const prerequisites = prerequisiteClosure(competencyId);
  const related = (item: (typeof active)[number]) => item.type === "teacher_review" ||
    item.competencyId === competencyId || !getCompetency(item.competencyId) ||
    prerequisites.has(item.competencyId) || prerequisiteClosure(item.competencyId).has(competencyId);
  const relevant = active.filter(related);
  const scored = (item: (typeof active)[number]) => !["teach", "remediate"].includes(item.type) || scoredDeliveries.has(item.interventionId);
  const assessmentProtected = recovery.pendingTeacherReview || currentActive.length > 1 || (relevant.length > 0 && !intervention) ||
    relevant.some(scored);
  const otherTopicActivities = active.filter(item => !related(item) && scored(item));
  const otherTopicsOpen = !assessmentProtected && otherTopicActivities.length > 0;
  // Built-in explanations are cleared against whichever activities are open:
  // the protecting ones, or else those in unrelated topics.
  const protectedActivities = assessmentProtected ? relevant.filter(scored) : otherTopicActivities;
  // Unknown, conflicting or teacher-reviewed work remains fail closed. For a
  // known activity, inspect the entire authored assessment pool, including both
  // languages, so a missing/legacy delivery pointer cannot hide a related task.
  const assessmentPools = protectedActivities.map(item => getContentForCompetency(item.competencyId)
    .filter(content => content.assessmentItemId));
  const safeConceptualExplanations = (assessmentProtected || otherTopicsOpen) && !recovery.pendingTeacherReview &&
    protectedActivities.length > 0 && new Set(protectedActivities.map(item => item.competencyId)).size === protectedActivities.length &&
    assessmentPools.every(pool => pool.length > 0)
    ? independentConceptualExplanations(assessmentPools.flatMap(pool => pool.map(content =>
      JSON.stringify([content.title, content.body, content.metadata?.options, content.metadata?.expectedResponse,
        content.metadata?.targetSubskills, content.metadata?.successCriteria])))) : [];
  const teaching: Array<{ type: string; text: string }> = [];
  let teachingSource: { id: string; title: string } | undefined;
  if (!assessmentProtected) {
    seedContent();
    const materials = getContentForCompetency(competency.id, language).filter((item) =>
      !item.assessmentItemId && ["lesson", "remediation", "example", "scaffold"].includes(item.type),
    );
    const content = (intervention?.instructionalStrategy ? materials.find(item => item.teachingStrategy === intervention.instructionalStrategy) : undefined)
      ?? materials.find(item => item.type === (intervention?.type === "remediate" ? "remediation" : "lesson"));
    // No cross-language fallback and no assessment content or metadata.
    if (content) {
      teachingSource = { id: content.id, title: content.title };
      const instruction = await generateInstruction({
        learnerState: { ...state, language },
        decision: {
          id: intervention?.decisionId ?? "idle-tutor-context", learnerId, sessionId: intervention?.sessionId ?? "idle-tutor-context",
          action: intervention?.type ?? "teach", competencyId: competency.id, reasonCode: "TUTOR_CONTEXT_ONLY",
          evidenceIds: [], policyVersion: intervention?.policyVersion ?? "tutor-context-only", createdAt: intervention?.startedAt ?? state.updatedAt,
          instructionalStrategy: intervention?.instructionalStrategy, responseMode: intervention?.responseMode,
        },
        content: { ...content, metadata: undefined }, instructionalContext: "Ask FILU: explain without evaluating or advancing learning.",
      });
      teaching.push(...(instruction.structured?.elements ?? []).filter((item) =>
        ["explanation", "worked_example", "hint", "remediation", "next_prompt"].includes(item.type),
      ).map((item) => ({ type: item.type, text: item.text }))
        .filter((item, index, items) => items.findIndex((other) => other.text === item.text) === index));
    }
    // Reuse only authored teaching, never scored practice, options, keys or rubrics.
    // Different question intents can now select a real example or scaffold.
    for (const material of materials) {
      if (!teaching.some(item => item.text === material.body)) teaching.push({
        type: material.type === "example" ? "worked_example" : material.type === "scaffold" ? "hint" : material.type === "remediation" ? "remediation" : "explanation",
        text: material.body,
      });
    }
  }
  return {
    topicTitle,
    safeConceptualExplanations,
    otherTopicsOpen,
    fingerprint: createHash("sha256").update(JSON.stringify({ context, state, active, recovery: recovery.fingerprint, safeConceptualExplanations, otherTopicsOpen })).digest("hex"),
    assessmentProtected,
    providerContext: {
      language,
      subjectId: context?.activeSubjectId ?? competency.subjectId, competencyId: competency.id,
      prerequisiteIds: competency.prerequisiteCompetencyIds,
      mastery: profile.masteryEstimate, confidence: profile.confidence,
      diagnosticState: profile.diagnosticState, difficulties: [...profile.errorPatterns],
      recommendation: intervention?.type ?? "teach", strategy: intervention?.instructionalStrategy, teaching,
      activity: intervention ? { id: intervention.interventionId, type: intervention.type } : undefined,
      teachingSource,
      prerequisiteReadiness: profile.prerequisiteState ? { ...profile.prerequisiteState } : undefined,
      diagnosticHistory: profile.diagnosticHistory?.slice(-5).map((item) => ({ state: item.diagnosticState, confidence: item.confidence, difficulties: [...item.errorPatterns] })),
      misconceptionHistory: profile.misconceptionHistory?.slice(-5).map((item) => ({ state: item.diagnosticState, confidence: item.confidence, difficulties: [...item.errorPatterns] })),
    },
  };
}
