import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createConversationHandler } from "../services/edututor/conversation-api";
import { loadConversationContext } from "../services/edututor/conversation-context";
import { createInitialLearnerState } from "../services/learner-state";
import { saveLearnerState } from "../services/learner-state-store";
import { saveLearnerLearningContext } from "../services/learner-context";
import { createIntervention } from "../services/intervention-store";
import { getDefaultLearnerLearningContext } from "../packages/curriculum-framework";
import { getCompetency } from "../packages/curriculum";
import { seedContent } from "../services/content-store/seed";
import type { ConversationLanguage, ConversationResponse } from "../packages/ai/conversation";

// Ask FILU answers must be whole, understandable teaching from the learner's
// own lesson: real questions, real authored content, the answer text checked.
assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory", "offline fixtures only");
seedContent();

async function learnerOn(competencyId: string) {
  const learnerId = randomUUID();
  const competency = getCompetency(competencyId)!;
  await saveLearnerState(createInitialLearnerState(learnerId, competencyId));
  await saveLearnerLearningContext({ learnerId, ...getDefaultLearnerLearningContext(), activeSubjectId: competency.subjectId,
    activeCompetencyId: competencyId, updatedAt: new Date().toISOString() });
  await createIntervention({ learnerId, competencyId, sessionId: "fictional-quality", decisionId: randomUUID(), type: "teach" });
  const handler = createConversationHandler({ identity: async () => ({ authenticated: true, learnerId, sessionId: "fictional-quality", source: "development-header" }),
    context: (id, language) => loadConversationContext(id, language, true), limit: async () => ({ allowed: true, retryAfterSeconds: 0 }) });
  let historyToken: string | undefined;
  return async (question: string, language: ConversationLanguage = "en") => {
    const response = await handler(new Request("http://localhost/api/tutoring/conversation", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, language, requestId: randomUUID(), historyToken }) }));
    assert.equal(response.status, 200);
    const body = await response.json() as ConversationResponse;
    historyToken = body.historyToken;
    const reply = body.messages.at(-1)!.text;
    assert.doesNotMatch(reply, /What is the first thing you would do|Quelle serait ta première étape/, "no unrelated closing question");
    // The teaching part (between the introduction and the closing offer) never
    // opens on a pronoun whose meaning was left out.
    const parts = reply.split("\n\n");
    if (parts.length === 3) assert.doesNotMatch(parts[1], /^(?:It|This|That|They|Il|Elle|Cela)\b/, `self-contained answer: ${parts[1].slice(0, 60)}`);
    return reply;
  };
}

const placeValue = await learnerOn("competency-gh-math-b4-place-value-001");
let reply = await placeValue("What is place value?");
assert.match(reply, /“Every Digit Has a Place”/, "names the lesson it explains from");
assert.match(reply, /place of a digit tells you its value/);
assert.match(reply, /The digit 0 is a placeholder\. It keeps the other digits/, "the zero sentence comes with what it refers to");
assert.match(reply, /go step by step, or show you an example/, "a new learner is offered support first");
reply = await placeValue("Why is zero important?");
assert.match(reply, /zero|placeholder/i);
const before = reply;
reply = await placeValue("I don't understand");
assert.notEqual(reply, before); assert.match(reply, /step by step/); assert(reply.length > 200, "a real step-by-step block, not a fragment");
reply = await placeValue("Can you give me an example?");
assert.match(reply, /worked example/); assert.match(reply, /26,148/);
reply = await placeValue("Give me another example");
assert.match(reply, /only this one worked example/, "says honestly when the lesson has a single example");

const mouse = await learnerOn("competency-gh-computing-b5-1-1-1-4");
assert.match(await mouse("what is dragging?"), /To drag an object/, "dragging matches drag");
assert.match(await mouse("What does the right button do?"), /right button opens a menu/);
assert.match(await mouse("Explain quantum teleportation"), /could not find that topic in your current lesson “Using the Mouse”/);

const fractions = await learnerOn("competency-gh-math-b4-unit-fractions-001");
assert.match(await fractions("Qu'est-ce qu'une fraction unitaire ?", "fr"), /fraction unitaire/);
assert.match(await fractions("Je ne comprends pas", "fr"), /Étape 1/);
assert.match(await fractions("Donne-moi un exemple", "fr"), /exemple résolu de ta leçon/);

console.log("PASS: Ask FILU answers whole, titled, self-contained teaching; follow-ups move on; honest single-example and not-found replies; EN/FR");
