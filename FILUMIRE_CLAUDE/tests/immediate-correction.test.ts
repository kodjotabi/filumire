import assert from "node:assert/strict";
import { GET, POST } from "../apps/learner/app/api/learning/route";
import { createSession } from "../services/session";
import { createInitialLearnerState, getLearnerState, saveLearnerState } from "../services/learner-state";
import { getEvidence } from "../services/evidence-store";
import { getContentForCompetency } from "../services/content-store";
import { correctionFor } from "../apps/learner/services/learning-presentation";
import { shortPassage } from "../services/assessment/corrective-feedback";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AnswerCorrectionPanel } from "../apps/learner/components/filumire/AnswerCorrectionPanel";
import { getAllSubjects, getCompetenciesForSubject } from "../packages/curriculum";
import { setActiveSubject, setLearnerGrade, updateActiveCompetency } from "../services/learner-context";
import { getApiHeaders, type LearningResponse } from "../apps/learner/services/learning-client";
import { readLanguage, setLanguagePreference } from "../apps/learner/components/filumire/language";
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
  const negativeHeading = language === "fr" ? "Pas encore tout à fait. Corrigeons ensemble." : "Not quite yet. Let’s fix it together.";
  const correctedHeading = language === "fr" ? "Tu as corrigé ton erreur." : "You corrected your mistake.";
  assert(done.includes(`<h2 id="answer-correction-title" tabindex="-1">${correctedHeading}</h2>`), "successful retry has a success heading");
  assert(!done.includes(negativeHeading), "successful retry no longer says the answer is wrong");
  assert(explain.includes(negativeHeading) && retry.includes(negativeHeading), "the original correction heading stays until the retry succeeds");
  const stillWrong = renderToStaticMarkup(React.createElement(AnswerCorrectionPanel, { correction: { ...value, retryAvailable: false, retryOutcome: "incorrect" }, phase: "done", language, busy: false, onRetry: noop, onContinue: noop }));
  assert(stillWrong.includes(negativeHeading) && !stillWrong.includes(correctedHeading), "an incorrect retry must not claim success");
  const used = renderToStaticMarkup(React.createElement(AnswerCorrectionPanel, { correction: { ...value, retryAvailable: false }, phase: "explain", language, busy: false, onRetry: noop, onContinue: noop }));
  assert(!used.includes(language === "fr" ? "Réessayer la question" : "Try the question again"), "no second retry");
}

console.log("PASS: wrong answers get an explanation, the key idea and one guided retry on the same question (EN/FR); answer key stays on the server; retries are idempotent and never independent evidence");

// Phase 4: the same delivered-question correction journey for all 12 Ghana
// subject/grade pairs in both languages. No fabricated questions or evidence.
// As on /learn, switching the interface language keeps the delivered question
// (and its content language) until Continue; it does not request a new question.
assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory", "run through the offline test infrastructure");
const cases = getAllSubjects().filter((subject) =>
  /^subject-gh-/.test(subject.id) && /basic-?[456]-/.test(subject.id) &&
  /(?:english|mathematics|computing|science)/.test(subject.id),
);
assert.equal(cases.length, 12, "four subjects across Basic 4, 5 and 6");

// Use the real preference setter and API-header builder with the minimal
// browser environment used by the existing client tests. Restore it afterwards.
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
const storage = new Map<string, string>();
let pageUrl = new URL("http://localhost/learn?lang=en");
let languageEvents = 0;
Object.defineProperty(globalThis, "window", { configurable: true, value: {
  localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) },
  location: { get href() { return pageUrl.href; }, get search() { return pageUrl.search; } },
  history: { state: null, replaceState: (_state: unknown, _unused: string, url: URL) => { pageUrl = new URL(url); } },
  dispatchEvent: (event: CustomEvent) => { assert.equal(event.type, "filumire-language"); languageEvents += 1; return true; },
} });
Object.defineProperty(globalThis, "document", { configurable: true, value: { cookie: "", documentElement: { lang: "en" } } });

async function correctionJourney(subject: (typeof cases)[number], language: "en" | "fr") {
  const grade = subject.learningLevelId;
  const label = `${subject.name} ${grade.match(/basic-(\d)/)![1]} ${language.toUpperCase()}`;
  const learnerId = `learner-correction-matrix-${crypto.randomUUID()}`;
  const sessionId = `session-${crypto.randomUUID()}`;
  const competency = getCompetenciesForSubject(subject.id)[0];
  assert(competency, `${label}: published competency`);
  await setLearnerGrade(learnerId, grade);
  await setActiveSubject(learnerId, subject.id);
  await updateActiveCompetency(learnerId, competency.id);
  await createSession(sessionId, learnerId);
  setLanguagePreference(language);

  const headers = () => ({ ...getApiHeaders(), "x-filumire-learner-id": learnerId, origin: "http://localhost" });
  async function read(response: Response) {
    const body = await response.json();
    assert.equal(response.status, 200, `${label}: API accepted request: ${JSON.stringify(body.error ?? "")}`);
    return body as LearningResponse;
  }
  const send = (body: Record<string, unknown>) => POST(new Request("http://localhost/api/learning", {
    method: "POST", headers: headers(), body: JSON.stringify({ sessionId, ...body }),
  })).then(read);
  const get = (query = "") => GET(new Request(
    `http://localhost/api/learning?sessionId=${sessionId}&subjectId=${subject.id}${query}`, { headers: headers() },
  )).then(read);
  async function nextQuestion(step: LearningResponse) {
    for (let cards = 0; !step.content?.assessmentItemId && cards < 8; cards += 1) {
      assert(step.content && step.decision.interventionId, `${label}: actionable teaching before practice`);
      step = await send({ interactionType: "acknowledge", competencyId: step.decision.competencyId, interventionId: step.decision.interventionId });
    }
    assert(step.content?.assessmentItemId, `${label}: learner receives a question`);
    assert.equal(step.decision.competencyId, competency.id, `${label}: stays on the chosen topic`);
    return step;
  }
  const question = await nextQuestion(await get(`&competencyId=${competency.id}`));
  const delivered = question.content!;
  assert.equal(delivered.language, language);
  const authored = getContentForCompetency(competency.id).find((content) => content.id === delivered.id)!;
  assert(authored?.metadata?.expectedResponse && authored.metadata.options, `${label}: real authored multiple-choice question`);
  assert.equal(delivered.metadata?.expectedResponse, undefined, "answer key stays on server");
  const incorrect = (JSON.parse(authored.metadata.options) as string[]).find((option) => option !== authored.metadata!.expectedResponse)!;
  assert(incorrect, `${label}: wrong option exists`);
  const identity = {
    competencyId: competency.id, assessmentItemId: delivered.assessmentItemId,
    interventionId: question.decision.interventionId,
  };
  const submit = (response: string, interactionType: "assessment" | "corrective_retry") =>
    send({ ...identity, interactionType, response, clientRequestId: crypto.randomUUID() });
  const wrong = await submit(incorrect, "assessment");
  assert.equal(wrong.assessment?.result.correct, false, `${label}: wrong answer is incorrect`);
  const correction = correctionFor(wrong, delivered.assessmentItemId!);
  assert(correction?.retryAvailable, `${label}: correction offers retry on the delivered question`);
  assert.equal(correction.assessmentItemId, delivered.assessmentItemId);
  assert.equal(correction.chosen, incorrect);
  for (const [passage, type] of [[correction.explanation, "remediation"], [correction.concept, "lesson"]] as const) {
    assert(passage, `${label}: ${type} corrective passage exists`);
    assert(passage.body.trim() && passage.short?.trim(), `${label}: substantive corrective teaching`);
    const source = getContentForCompetency(competency.id, language).find((item) => item.type === type && item.language === language)!;
    assert(source, `${label}: authored ${language} ${type}`);
    assert.equal(passage.title, source.title);
    assert.equal(passage.body, source.body, `${label}: correction teaches this topic in the delivered language`);
  }

  const beforeEvidence = structuredClone(await getEvidence(learnerId, competency.id));
  assert.equal(beforeEvidence.length, 1, `${label}: one wrong-answer record`);
  const beforeState = (await getLearnerState(learnerId, competency.id))!;
  const beforeCompetencies = structuredClone(beforeState.competencies);
  const beforeProgress = { ...wrong.progress };
  const otherLanguage = language === "en" ? "fr" : "en";
  const eventsBefore = languageEvents;
  setLanguagePreference(otherLanguage);
  assert.equal(languageEvents, eventsBefore + 1, "preference notifies mounted components");
  assert.equal(readLanguage(), otherLanguage);
  assert.equal(getApiHeaders()["x-filumire-language"], otherLanguage);
  assert.equal(document.documentElement.lang, otherLanguage);
  // Dashboard reads must not advance the pending activity or write evidence.
  const switched = await get("&dashboard=1");
  const progressValues = (progress: LearningResponse["progress"]) => ({
    mastery: progress.masteryEstimate, confidence: progress.confidence, evidence: progress.evidenceCount,
    completed: progress.completedCompetencies, readiness: progress.readiness, percent: progress.percent,
  });
  assert.deepEqual(progressValues(switched.progress), progressValues(beforeProgress), `${label}: language switch preserves progress`);
  assert.deepEqual((await getLearnerState(learnerId, competency.id))!.competencies, beforeCompetencies, `${label}: language switch preserves competency state`);
  assert.deepEqual(await getEvidence(learnerId, competency.id), beforeEvidence, `${label}: language switch preserves evidence`);
  // Exercise the real correction panel in the switched interface language.
  const panel = renderToStaticMarkup(React.createElement(AnswerCorrectionPanel, {
    correction, phase: "explain", language: otherLanguage, busy: false, onRetry: () => {}, onContinue: () => {},
  }));
  assert(panel.includes(otherLanguage === "fr" ? "Réessayer la question" : "Try the question again"));
  assert.equal(correctionFor(wrong, delivered.assessmentItemId!)?.assessmentItemId, identity.assessmentItemId);

  const retry = await submit(authored.metadata.expectedResponse, "corrective_retry");
  assert.equal(retry.assessment?.result.correct, true, `${label}: guided retry accepted after switching language`);
  assert.equal(retry.correction?.assessmentItemId, identity.assessmentItemId, `${label}: retry retains exact question identity`);
  assert.equal(retry.correction?.retryOutcome, "correct");
  assert.equal(retry.correction?.retryAvailable, false);
  const afterEvidence = await getEvidence(learnerId, competency.id);
  assert.equal(afterEvidence.length, beforeEvidence.length + 1);
  const guided = afterEvidence.find((evidence) => evidence.id.startsWith("ev-corrective-retry-"))!;
  assert(guided, `${label}: retry persisted`);
  assert.equal(guided.assessmentItemId, identity.assessmentItemId);
  assert.equal(guided.outcome, "correct");
  assert.equal(guided.independence, "guided", `${label}: corrected response is never independent mastery`);
  assert.equal(afterEvidence.filter((evidence) => evidence.independence === "independent").length,
    beforeEvidence.filter((evidence) => evidence.independence === "independent").length);
  const state = (await getLearnerState(learnerId, competency.id))!.competencies.find((item) => item.competencyId === competency.id)!;
  assert(!state.masteredAt && !state.readinessState?.readyForAdvancement, `${label}: one guided success does not master the topic`);
  assert.equal(retry.progress.completedCompetencies, beforeProgress.completedCompetencies);

  // A repeated retry cannot earn additional evidence even after a language change.
  const duplicate = await submit(authored.metadata.expectedResponse, "corrective_retry");
  assert.equal(duplicate.assessment?.result.duplicate, true);
  assert.equal((await getEvidence(learnerId, competency.id)).length, afterEvidence.length);
  const continued = await nextQuestion(retry);
  assert.equal(continued.content?.language, otherLanguage, `${label}: continued learning follows the new language`);
  assert.notEqual(continued.content?.assessmentItemId, delivered.assessmentItemId, `${label}: Continue reaches a subsequent question`);
  const nextAuthored = getContentForCompetency(competency.id).find((content) => content.id === continued.content!.id)!;
  assert(nextAuthored.metadata?.expectedResponse);
  const nextAnswer = await send({ interactionType: "assessment", competencyId: competency.id,
    interventionId: continued.decision.interventionId, assessmentItemId: continued.content!.assessmentItemId,
    response: nextAuthored.metadata.expectedResponse, clientRequestId: crypto.randomUUID() });
  assert.equal(nextAnswer.assessment?.result.correct, true, `${label}: learner can answer after correction`);
  assert.equal(nextAnswer.correction, undefined);
  return label;
}

const passedCombinations: string[] = [];
const failedCombinations: string[] = [];
try {
  for (const subject of cases) {
    for (const language of ["en", "fr"] as const) {
      const label = `${subject.name} ${subject.learningLevelId.match(/basic-(\d)/)![1]} ${language.toUpperCase()}`;
      try {
        await correctionJourney(subject, language);
        passedCombinations.push(label);
        console.log(`PASS matrix: ${label} — question, teaching, guided retry, mastery guard, continuation, language switch`);
      } catch (error) {
        failedCombinations.push(label);
        console.error(`FAIL matrix: ${label}`, error);
      }
    }
  }
} finally {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
  if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
  else Reflect.deleteProperty(globalThis, "document");
}
console.log(`Correction matrix: ${passedCombinations.length}/24 passed; ${failedCombinations.length} failed${failedCombinations.length ? ": " + failedCombinations.join(", ") : ""}`);
if (failedCombinations.length) process.exitCode = 1;
