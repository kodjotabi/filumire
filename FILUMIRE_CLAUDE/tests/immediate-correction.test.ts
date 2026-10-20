import assert from "node:assert/strict";
import { POST } from "../apps/learner/app/api/learning/route";
import { createSession } from "../services/session";
import { createInitialLearnerState, saveLearnerState } from "../services/learner-state";
import { getEvidence } from "../services/evidence-store";
import { getContentForCompetency } from "../services/content-store";
import { correctionFor } from "../apps/learner/services/learning-presentation";
import { shortPassage } from "../services/assessment/corrective-feedback";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AnswerCorrectionPanel } from "../apps/learner/components/filumire/AnswerCorrectionPanel";
Object.assign(globalThis, { React });

// Immediate correction: a wrong answer gets FILU's explanation, the key idea and
// one retry of the same question, recorded as guided (never independent) evidence.
const competencyId = "competency-gh-computing-b4-computer-parts-001";
const items = getContentForCompetency(competencyId).filter((c) => c.type === "assessment" && c.metadata?.options && c.metadata?.expectedResponse);
const item = (language: "en" | "fr", index = 0) => items.filter((c) => c.language === language)[index];
const wrongOption = (c: NonNullable<ReturnType<typeof item>>) => (JSON.parse(c.metadata!.options!) as string[]).find((o) => o !== c.metadata!.expectedResponse)!;

async function post(learnerId: string, body: Record<string, unknown>) {
  const response = await POST(new Request("http://localhost/api/learning", {
    method: "POST", headers: { "content-type": "application/json", "x-filumire-learner-id": learnerId }, body: JSON.stringify({ learnerId, ...body }),
  }));
  return { status: response.status, json: await response.json() };
}
async function start(learnerId: string) {
  const sessionId = `session-${learnerId}-${Date.now()}`;
  await saveLearnerState(createInitialLearnerState(learnerId, competencyId));
  await createSession(sessionId, learnerId);
  return sessionId;
}

{
  const learnerId = "learner-immediate-correction-en";
  const sessionId = await start(learnerId);
  const question = item("en");
  const answer = (response: string, interactionType = "assessment", clientRequestId = `${interactionType}-${Math.random()}`) =>
    post(learnerId, { sessionId, competencyId, interactionType, assessmentItemId: question.assessmentItemId, response, clientRequestId });

  const wrong = await answer(wrongOption(question));
  assert.equal(wrong.status, 200);
  assert.equal(wrong.json.assessment.result.correct, false);
  const correction = correctionFor(wrong.json, question.assessmentItemId!);
  assert(correction, "a wrong multiple-choice answer carries FILU's correction");
  assert.equal(correction.chosen, wrongOption(question), "the learner's own choice is echoed back");
  assert.equal(correction.retryAvailable, true);
  assert.equal(correction.explanation?.title, "Check Your Thinking", "explains the mistake with the topic's error-analysis text");
  assert.equal(correction.concept?.title, "Computer Parts and Tools", "re-teaches the key idea from the topic's lesson");
  assert(!JSON.stringify(wrong.json.correction).includes(question.metadata!.expectedResponse!), "the answer key never reaches the device");
  // Short enough for a child: two sentences picked for this answer, full text kept as "Read more".
  for (const p of [correction.explanation!, correction.concept!]) {
    assert(p.short && p.short.length < p.body.length, "a shorter version is offered");
    assert((p.short.match(/[.!?](s|$)/g) ?? []).length <= 2, "at most two sentences");
    assert(p.body.includes(p.short.split(". ")[0]), "short text is the author's own sentences");
  }
  assert(/monitor/i.test(correction.explanation!.short!), "the explanation addresses the learner's own mistake (the monitor)");
  assert(!("expectedResponse" in (wrong.json.content?.metadata ?? {})));

  const retry = await answer(question.metadata!.expectedResponse!, "corrective_retry");
  assert.equal(retry.status, 200);
  assert.equal(retry.json.correction?.retryOutcome, "correct");
  assert.equal(retry.json.correction?.retryAvailable, false, "only one retry per mistake");
  const evidence = (await getEvidence(learnerId, competencyId)).filter((e) => e.assessmentItemId === question.assessmentItemId);
  const retried = evidence.find((e) => e.id.startsWith("ev-corrective-retry-"));
  assert(retried, "the retry is recorded");
  assert.equal(retried.outcome, "correct");
  assert.equal(retried.independence, "guided", "a corrected answer is guided practice, not independent mastery");

  const again = await answer(wrongOption(question), "corrective_retry");
  assert.equal(again.status, 200);
  assert.equal(again.json.assessment.result.duplicate, true, "a second retry of the same mistake is idempotent");
  assert.equal(again.json.correction?.retryOutcome, "correct", "the recorded retry outcome wins");
  assert.equal((await getEvidence(learnerId, competencyId)).filter((e) => e.assessmentItemId === question.assessmentItemId).length, evidence.length);

  const other = item("en", 1);
  const noMistake = await post(learnerId, { sessionId, competencyId, interactionType: "corrective_retry", assessmentItemId: other.assessmentItemId, response: other.metadata!.expectedResponse!, clientRequestId: "x" });
  assert.equal(noMistake.status, 409, "a retry needs a wrong first answer in this session");

  const right = await post(learnerId, { sessionId, competencyId, interactionType: "assessment", assessmentItemId: other.assessmentItemId, response: other.metadata!.expectedResponse!, clientRequestId: "right-1" });
  assert.equal(right.status, 200);
  assert.equal(right.json.correction, undefined, "a correct answer moves on without a correction");
}

{
  const learnerId = "learner-immediate-correction-fr";
  const sessionId = await start(learnerId);
  const question = item("fr");
  const wrong = await post(learnerId, { sessionId, competencyId, interactionType: "assessment", assessmentItemId: question.assessmentItemId, response: wrongOption(question), clientRequestId: "fr-1" });
  assert.equal(wrong.status, 200);
  const correction = correctionFor(wrong.json, question.assessmentItemId!);
  assert.equal(correction?.explanation?.title, "Vérifie ta réflexion", "French learners get the French explanation");
  assert.equal(correction?.concept?.title, "Les parties de l'ordinateur et les outils");
  const retry = await post(learnerId, { sessionId, competencyId, interactionType: "corrective_retry", assessmentItemId: question.assessmentItemId, response: wrongOption(question), clientRequestId: "fr-2" });
  assert.equal(retry.json.correction?.retryOutcome, "incorrect");
}

// Sentence choice follows the learner's answer, in reading order; no overlap keeps the opening.
const sample = "Three slips are common. Some call the monitor the computer. Some mix memory with the mouse. Each part has its own job.";
assert.equal(shortPassage(sample, "the mouse and memory"), "Some mix memory with the mouse.", "only sentences about this mistake are kept");
assert.equal(shortPassage(sample, "zzzz"), "Three slips are common. Some call the monitor the computer.");
assert.equal(shortPassage("One. Two.", "x"), "One. Two.", "two sentences or fewer stay whole");
assert.equal(shortPassage("L'écran montre la sortie. « Le clavier » sert à taper. La souris pointe.", "souris"), "La souris pointe.", "French sentences, including guillemets, split correctly");

// The panel on the question screen: explain + key idea + retry, then the result.
for (const language of ["en", "fr"] as const) {
  const value = { assessmentItemId: "i", chosen: "Fictional wrong choice", retryAvailable: true,
    explanation: { title: "Fictional slip", body: "Why the slip happens." }, concept: { title: "Fictional idea", body: "The idea itself." } };
  const noop = () => {};
  const explain = renderToStaticMarkup(React.createElement(AnswerCorrectionPanel, { correction: value, phase: "explain", language, busy: false, onRetry: noop, onContinue: noop }));
  assert(explain.includes("Fictional wrong choice") && explain.includes("Why the slip happens.") && explain.includes("The idea itself."));
  assert(explain.includes(language === "fr" ? "Réessayer la question" : "Try the question again"));
  assert(!explain.includes("<details"), "the explanation is open before the retry");
  const retry = renderToStaticMarkup(React.createElement(AnswerCorrectionPanel, { correction: value, phase: "retry", language, busy: false, onRetry: noop, onContinue: noop }));
  assert(retry.includes("<details") && !retry.includes("<button"), "during the retry the explanation folds away and the answers take over");
  const done = renderToStaticMarkup(React.createElement(AnswerCorrectionPanel, { correction: { ...value, retryAvailable: false, retryOutcome: "correct" }, phase: "done", language, busy: false, onRetry: noop, onContinue: noop }));
  assert(done.includes(language === "fr" ? "Oui, c’est juste" : "Yes, that’s right"));
  const used = renderToStaticMarkup(React.createElement(AnswerCorrectionPanel, { correction: { ...value, retryAvailable: false }, phase: "explain", language, busy: false, onRetry: noop, onContinue: noop }));
  assert(!used.includes(language === "fr" ? "Réessayer la question" : "Try the question again"), "no second retry");
}

console.log("PASS: wrong answers get an explanation, the key idea and one guided retry on the same question (EN/FR); answer key stays on the server; retries are idempotent and never independent evidence");
