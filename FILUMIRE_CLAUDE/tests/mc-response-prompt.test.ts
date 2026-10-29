// The response prompt matches the delivered item: a free-response mode chosen
// by the engine never says "in your own words" above answer options.
import assert from "node:assert/strict";
import { DeterministicGovernedInstructionalEngine, type GovernedInstructionalRequest } from "../packages/ai";

const engine = new DeterministicGovernedInstructionalEngine();

function request(responseMode: string, presentsOptions: boolean | undefined, language: "en" | "fr" = "en"): GovernedInstructionalRequest {
  return {
    learnerId: "learner-mc-prompt",
    sessionId: "session-mc-prompt",
    competency: { id: "competency-mc-prompt", title: "Register", description: "Use register", prerequisiteCompetencyIds: [], misconceptions: [] },
    decision: { id: "decision-mc-prompt", action: "diagnose", reasonCode: "INSUFFICIENT_EVIDENCE", competencyId: "competency-mc-prompt", responseMode },
    learnerProfile: { masteryEstimate: 0, confidence: 0, diagnosticState: "unknown", diagnosticConfidence: 0, errorPatterns: [] },
    content: { id: "content-mc-prompt", competencyId: "competency-mc-prompt", type: "assessment", title: "Check", body: "Which request suits this formal setting?", presentsOptions },
    instructionalContext: "mc prompt test",
    language,
  };
}

async function prompt(...args: Parameters<typeof request>): Promise<string | undefined> {
  const response = await engine.generate(request(...args));
  return response.structured?.elements.find(element => element.type === "next_prompt")?.text;
}

assert.equal(await prompt("short_answer", true), "Choose the best answer.");
assert.equal(await prompt("short_answer", true, "fr"), "Choisis la meilleure réponse.");
assert.equal(await prompt("oral_response", true), "Choose the best answer.");
// Free-text items keep the engine's chosen mode.
assert.equal(await prompt("short_answer", false), "Write a short answer in your own words.");
assert.equal(await prompt("short_answer", undefined), "Write a short answer in your own words.");
// Authored option-based modes keep their own wording.
assert.equal(await prompt("classification", true), "Put each item in the right group.");
assert.equal(await prompt("multiple_choice", true), "Choose the best answer.");
console.log("PASS mc-response-prompt: option items are asked to choose; other modes unchanged");
