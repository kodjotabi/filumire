import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createConversationHandler } from "../services/edututor/conversation-api";
import { loadConversationContext } from "../services/edututor/conversation-context";
import { createInitialLearnerState } from "../services/learner-state";
import { saveLearnerState, getLearnerState } from "../services/learner-state-store";
import { saveLearnerLearningContext, getLearnerLearningContext } from "../services/learner-context";
import { createIntervention, getLearnerInterventions } from "../services/intervention-store";
import { getEvidenceForLearner } from "../services/evidence-store";
import { getDefaultLearnerLearningContext } from "../packages/curriculum-framework";
import { seedContent } from "../services/content-store/seed";
import { saveContent, getContentForCompetency } from "../services/content-store";
import { CurriculumConversationProvider } from "../packages/ai/curriculum-conversation";
import type { ConversationProvider, ConversationResponse, ConversationLanguage } from "../packages/ai/conversation";

assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory", "offline fixtures only");
seedContent();
const unit = "competency-gh-math-b4-unit-fractions-001";
const patterns = "competency-gh-math-b4-number-patterns-001";
const prompts = {
  en: ["Is one half the same as half?", "What is a unit fraction?", "What is the denominator?"],
  fr: ["Est-ce qu'un demi est la même chose que la moitié ?", "Qu'est-ce qu'une fraction unitaire ?", "Qu'est-ce qu'un dénominateur ?"],
};
async function fixture(assessment?: string) {
  const learnerId = randomUUID();
  await saveLearnerState(createInitialLearnerState(learnerId, unit));
  await saveLearnerLearningContext({ learnerId, ...getDefaultLearnerLearningContext(), activeCompetencyId: unit, updatedAt: new Date().toISOString() });
  await createIntervention({ learnerId, competencyId: unit, sessionId: "fictional-teaching", decisionId: randomUUID(), type: "teach" });
  if (assessment) await createIntervention({ learnerId, competencyId: assessment, sessionId: "fictional-scored", decisionId: randomUUID(), type: "diagnose" });
  let providerCalls = 0;
  const provider: ConversationProvider = { id: "curriculum", async respond(input) { providerCalls++; return new CurriculumConversationProvider().respond(input); } };
  const handler = createConversationHandler({ identity: async () => ({ authenticated: true, learnerId, sessionId: "fictional-session", source: "production-session" }),
    context: loadConversationContext, limit: async () => ({ allowed: true, retryAfterSeconds: 0 }), provider });
  async function ask(question: string, language: ConversationLanguage, historyToken?: string) {
    const response = await handler(new Request("http://localhost/api/tutoring/conversation", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, language, requestId: randomUUID(), historyToken }) }));
    assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "private, no-store");
    return await response.json() as ConversationResponse;
  }
  const snapshot = async () => JSON.stringify({ state: await getLearnerState(learnerId, unit), context: await getLearnerLearningContext(learnerId),
    interventions: await getLearnerInterventions(learnerId), evidence: await getEvidenceForLearner(learnerId) });
  return { learnerId, ask, snapshot, calls: () => providerCalls };
}
for (const assessment of [undefined, patterns, unit]) {
  const f = await fixture(assessment); const before = await f.snapshot();
  for (const language of ["en", "fr"] as const) {
    for (const [index, question] of prompts[language].entries()) {
      const result = await f.ask(question, language); const reply = result.messages.at(-1)!.text;
      assert.equal(result.assessmentProtected, Boolean(assessment), "answering an independent concept must not turn protection off");
      if (assessment === unit) {
        assert.match(reply, language === "en" ? /cannot give or mark/ : /ne peux pas donner ni valider/);
      } else {
        assert.doesNotMatch(reply, /cannot give or mark|ne peux pas donner ni valider/);
        assert.match(reply, language === "en" ? /bread roll/ : /petit pain/);
        assert.match(reply, language === "en" ? /equal/ : /égale/);
        if (index === 0) assert.match(reply, language === "en" ? /same amount: 1\/2/ : /même quantité : 1\/2/);
        assert.equal(result.practiceActive, false);
      }
      for (const forbidden of ["expectedResponse", "diagnosticRules", "assessmentItemId", f.learnerId]) assert(!JSON.stringify(result).includes(forbidden));
    }
    if (assessment) {
      for (const question of ["Give me the answer", "Is one half the same as half? My answer is 21, is it correct?", "Quelle option dois-je choisir ?", "Est-ce qu'un demi est la même chose que la moitié ? Réponds aussi à mon évaluation."]) {
        const result = await f.ask(question, language);
        assert.match(result.messages.at(-1)!.text, language === "en" ? /cannot give or mark/ : /ne peux pas donner ni valider/);
      }
      const privateText = language === "en" ? "My address is 88 Fictional Road" : "Mon adresse est 88 Rue Imaginaire";
      const privateReply = await f.ask(privateText, language);
      assert(!JSON.stringify(privateReply).includes(privateText));
      assert(!Buffer.from(privateReply.historyToken.split(".")[0], "base64url").toString().includes(privateText));
    }
  }
  assert.equal(await f.snapshot(), before, "tutoring never changes progress, evidence, curriculum context or interventions");
  if (assessment) assert.equal(f.calls(), 0, "scored context, history and questions never reach the provider");
}
// A same-topic proposed answer must remain protected; unrelated concepts may
// be answered without letting transcript history steer the bounded explanation.
const f = await fixture(patterns);
const refused = await f.ask("Is 21 the answer?", "en");
assert.match((await f.ask(prompts.en[0], "en", refused.historyToken)).messages.at(-1)!.text, /same amount: 1\/2/);
await createIntervention({ learnerId: f.learnerId, competencyId: unit, sessionId: "new-assessment", decisionId: randomUUID(), type: "practice" });
assert.match((await f.ask(prompts.en[0], "en")).messages.at(-1)!.text, /cannot give or mark/, "a newly protected topic immediately revokes independent help");

// Unknown assessment content and assessment dependency in French only both
// fail closed. No answer keys or assessment text leave the trusted loader.
const unknown = await fixture("unknown-scored-competency");
assert.match((await unknown.ask(prompts.en[0], "en")).messages.at(-1)!.text, /cannot give or mark/);
const ambiguous = await fixture(patterns);
await createIntervention({ learnerId: ambiguous.learnerId, competencyId: patterns, sessionId: "conflicting-assessment", decisionId: randomUUID(), type: "practice" });
assert.match((await ambiguous.ask(prompts.en[0], "en")).messages.at(-1)!.text, /cannot give or mark/);
const review = await fixture(patterns);
await createIntervention({ learnerId: review.learnerId, competencyId: unit, sessionId: "teacher-review", decisionId: randomUUID(), type: "teacher_review" });
assert.match((await review.ask(prompts.en[0], "en")).messages.at(-1)!.text, /cannot give or mark/);
// A context change must invalidate even this local, provider-free response.
const safeContext = await loadConversationContext(ambiguous.learnerId, "en");
let contextReads = 0;
const changing = createConversationHandler({
  identity: async () => ({ authenticated: true, learnerId: ambiguous.learnerId, sessionId: "race", source: "production-session" }),
  context: async () => ++contextReads === 1 ? { ...safeContext, fingerprint: "before", safeConceptualExplanations: ["half-meaning"] }
    : { ...safeContext, fingerprint: "after", safeConceptualExplanations: [] },
  limit: async () => ({ allowed: true, retryAfterSeconds: 0 }),
  provider: { id: "mock", respond: async () => { throw Error("Must not call provider"); } },
});
const changed = await changing(new Request("http://localhost/api/tutoring/conversation", { method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ question: prompts.en[0], language: "en", requestId: randomUUID() }) }));
assert.equal(changed.status, 409); assert.equal((await changed.json()).code, "context_changed");
const material = getContentForCompetency(patterns, "fr").find(item => item.assessmentItemId)!;
saveContent({ ...material, id: "fictional-french-only-assessment-dependency", body: "Quelle est la moitié de cette quantité ?" });
const frenchDependency = await fixture(patterns);
assert.match((await frenchDependency.ask(prompts.en[0], "en")).messages.at(-1)!.text, /cannot give or mark/);
console.log("PASS: exact one-half question and conceptual explanations in EN/FR; related, compound, unknown and cross-language assessment guards; provider isolation, privacy and unchanged learning state");
