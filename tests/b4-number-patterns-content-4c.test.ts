import { seedContent } from "../services/content-store/seed";
import { getContentForCompetency } from "../services/content-store/index";
import { acknowledgeIntervention } from "../services/intervention-store/index";
import { CONTENT_EXHAUSTED_REASON_CODE } from "../services/adaptive-engine/index";
import { GHANA_B4_NUMBER_PATTERNS_AUTHORED_COMPETENCY_IDS } from "../services/content-store/ghana-b4-mathematics-authored-number-patterns";
import { createInitialLearnerState } from "../services/learner-state/index";
import { getCompetency } from "../packages/curriculum/index";
import type { LearnerCompetencyState } from "../packages/domain";
import { assert, newLearner, decide, answer, wrongOption, competencyState, isQuestion } from "./repro-4a-helpers";

/*
 * TRANCHE 4C: B4 Maths number-pattern topics (001/002/003) have enough
 * content to be mastered: >= 5 mastery questions, retention and transfer
 * questions, English and French, answers among the options, every wrong
 * option mapped to a diagnostic rule. Real-engine learners (all correct,
 * one early error) complete each topic without content exhaustion.
 *
 * Run: npx tsx --env-file=.env.local tests/b4-number-patterns-content-4c.test.ts
 */

seedContent();

let passed = 0;
function check(condition: unknown, message: string): void {
  assert(condition, message);
  passed += 1;
}

function structure(): void {
  for (const competencyId of GHANA_B4_NUMBER_PATTERNS_AUTHORED_COMPETENCY_IDS) {
    for (const language of ["en", "fr"] as const) {
      const items = getContentForCompetency(competencyId).filter((item) => item.language === language && item.assessmentItemId);
      const purpose = (item: (typeof items)[number]) => item.metadata?.assessmentPurpose;
      const mastery = items.filter((item) => purpose(item) !== "retention" && purpose(item) !== "transfer");
      check(mastery.length >= 5, `${competencyId} ${language}: >= 5 mastery questions (${mastery.length})`);
      check(items.filter((item) => purpose(item) === "retention").length >= 2, `${competencyId} ${language}: retention questions`);
      check(items.filter((item) => purpose(item) === "transfer").length >= 2, `${competencyId} ${language}: transfer questions`);
      for (const item of items) {
        const options = JSON.parse(item.metadata?.options ?? "[]") as string[];
        check(options.includes(item.metadata!.expectedResponse), `${item.id}: answer is an option`);
        check(new Set(options).size === options.length, `${item.id}: options distinct`);
        if (item.metadata?.diagnosticRules) {
          const rules = JSON.parse(item.metadata.diagnosticRules) as Record<string, unknown>;
          check(options.filter((option) => option !== item.metadata!.expectedResponse).every((option) => option in rules), `${item.id}: every wrong option has a diagnostic rule`);
        }
      }
    }
    const en = getContentForCompetency(competencyId).filter((item) => item.language === "en" && item.id.startsWith("content-gh-b4-number-patterns"));
    const fr = getContentForCompetency(competencyId).filter((item) => item.language === "fr");
    check(en.every((item) => fr.some((other) => other.translationOfContentId === item.id)), `${competencyId}: every authored English item has a French version`);
  }
}

async function learner(competencyId: string, tag: string, wrongAt: (n: number) => boolean) {
  let { learnerId, state } = await newLearner(`np4c-${tag}`, competencyId);
  /* As on the real path (Tranche 4B step 4): prerequisites are completed before a topic opens. */
  const now = new Date().toISOString();
  const completedPrerequisites = (getCompetency(competencyId)?.prerequisiteCompetencyIds ?? []).flatMap((id) => [id, ...(getCompetency(id)?.prerequisiteCompetencyIds ?? [])]).map((id): LearnerCompetencyState => ({
    ...createInitialLearnerState(learnerId, id).competencies[0],
    masteryEstimate: 0.95, confidence: 0.9, evidenceCount: 8, diagnosticState: "probable_mastery", masteredAt: now,
    retentionState: { status: "retained", confidence: 0.9 } as LearnerCompetencyState["retentionState"],
    transferState: { status: "demonstrated", confidence: 0.9 } as LearnerCompetencyState["transferState"],
    readinessState: { readyForAdvancement: true, confidence: 0.9, reasonCode: "MASTERY_RETENTION_TRANSFER_CONFIRMED", evaluatedAt: now },
  }));
  state = { ...state, competencies: [...state.competencies, ...completedPrerequisites] };
  let n = 0;
  for (let i = 0; i < 40; i++) {
    const d = await decide(learnerId, state);
    if (d.decision.action === "advance" || d.decision.action === "complete") return { d, state, answers: n };
    if (!isQuestion(d.content)) {
      await acknowledgeIntervention({ interventionId: d.decision.interventionId!, learnerId, competencyId });
      continue;
    }
    const wrong = wrongAt(n++);
    state = (await answer(learnerId, state, competencyId, d.content!, wrong ? wrongOption(d.content!) : d.content!.metadata!.expectedResponse, d.decision.interventionId)).state;
  }
  return { d: undefined, state, answers: n };
}

async function engine(): Promise<void> {
  for (const competencyId of GHANA_B4_NUMBER_PATTERNS_AUTHORED_COMPETENCY_IDS) {
    for (const [tag, wrongAt] of [["perfect", () => false], ["one-error", (n: number) => n === 0]] as const) {
      const result = await learner(competencyId, `${tag}-${competencyId.slice(-3)}`, wrongAt);
      const reason = result.d?.decision.reasonCode;
      check(reason !== CONTENT_EXHAUSTED_REASON_CODE, `${competencyId} ${tag}: no content exhaustion (${reason})`);
      check(reason === "MASTERY_RETENTION_TRANSFER_CONFIRMED" || reason === "LEARNING_PATH_COMPLETE", `${competencyId} ${tag}: completes the topic (${reason}, ${result.answers} answers)`);
      const c = competencyState(result.state, competencyId);
      check(c.masteryEstimate >= 0.8 && c.confidence >= 0.8 && c.retentionState?.status === "retained" && c.transferState?.status === "demonstrated", `${competencyId} ${tag}: gate met honestly`);
    }
  }
}

(async () => {
  structure();
  await engine();
  console.log(`PASS b4-number-patterns-content-4c (${passed} checks)`);
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
