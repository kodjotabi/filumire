import {
  selectResponseMode,
} from "../packages/pedagogy";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const effective = selectResponseMode(
  "practice",
  [
    {
      responseMode: "worked_solution",
      evidenceCount: 4,
      successfulEvidenceCount: 4,
      confidence: 1,
    },
  ],
);

assert(
  effective.responseMode === "worked_solution",
  "effective response mode must be preferred",
);

const failed = selectResponseMode(
  "practice",
  [
    {
      responseMode: "short_answer",
      evidenceCount: 3,
      successfulEvidenceCount: 0,
      confidence: 1,
    },
  ],
);

assert(
  failed.responseMode !== "short_answer",
  "ineffective response mode must not be repeated while alternatives exist",
);

assert(
  failed.reasonCode === "ALTERNATIVE_RESPONSE_MODE_SELECTION",
  "ineffective response mode must trigger alternative selection",
);

console.log({
  responseModeAdaptationTest: "PASS",
  effectiveMode: effective.responseMode,
  alternativeMode: failed.responseMode,
});
