import {
  selectInstructionalStrategy,
} from "../packages/pedagogy";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const effective = selectInstructionalStrategy(
  "teach",
  [
    {
      strategy: "worked_example",
      effectiveness: "effective",
      evidenceCount: 4,
      successfulEvidenceCount: 4,
      confidence: 1,
    },
  ],
);

assert(
  effective.instructionalStrategy === "worked_example",
  "effective strategy must be preferred",
);

const failed = selectInstructionalStrategy(
  "teach",
  [
    {
      strategy: "direct_explanation",
      effectiveness: "ineffective",
      evidenceCount: 3,
      successfulEvidenceCount: 0,
      confidence: 1,
    },
  ],
);

assert(
  failed.instructionalStrategy !== "direct_explanation",
  "ineffective strategy must not be repeated while alternatives exist",
);

assert(
  failed.reasonCode === "ALTERNATIVE_STRATEGY_SELECTION",
  "failed strategy must trigger alternative selection",
);

console.log({
  strategyAdaptationTest: "PASS",
  effectiveStrategy: effective.instructionalStrategy,
  alternativeStrategy: failed.instructionalStrategy,
});
