import assert from "node:assert/strict";
import { evaluateAssessment } from "../services/assessment";
import { evaluateMastery } from "../services/mastery";

const base = { learnerId:"l", sessionId:"s", competencyId:"c", assessmentItemId:"i", response:"a" };
const meta = (extra:any={}) => ({
  expectedResponse:"a", assessmentPurpose:"reassessment",
  contextTags: JSON.stringify(["school"]),
  diagnosticRules: JSON.stringify({ b:{ errorPattern:"larger_denominator_larger", diagnosticState:"misconception", diagnosticConfidence:0.8 }}),
  ...extra });
async function ev(type:string|undefined, assistance?:any, extra:any={}, response="a") {
  const r = await evaluateAssessment({...base, response, assistance} as any, "a", "ct", meta({ ...(type ? { interventionType: type } : {}), ...extra }));
  return r.evidence;
}
// purpose
assert.equal((await ev("practice")).purpose, "mastery");
assert.equal((await ev("practice",undefined,{assessmentPurpose:"transfer"})).purpose, "transfer");
assert.equal((await ev("practice",undefined,{assessmentPurpose:"diagnostic"})).purpose, "diagnostic");
// independence
assert.equal((await ev("practice")).independence, "independent");
assert.equal((await ev("scaffold")).independence, "guided");
assert.equal((await ev(undefined)).independence, "unknown");
assert.equal((await ev("practice",{hintsUsed:1})).independence, "light_support");
assert.equal((await ev("practice",{hintsUsed:2})).independence, "guided");
assert.equal((await ev("practice",{workedExampleViewed:true})).independence, "guided");
assert.equal((await ev("practice",{filuAnswerRevealed:true})).independence, "fully_supported");
assert.equal((await ev("practice",{filuAnswerRevealed:true})).strength, "weak");
assert.equal((await ev("practice",{attemptNumber:2})).independence, "light_support");
assert.equal((await ev("scaffold",{hintsUsed:1})).independence, "guided"); // never raises
assert.equal((await ev("practice")).supportLevel, 0);
assert.equal((await ev("practice")).strength, "moderate");
assert.equal((await ev("practice")).difficulty, "standard");
assert.equal((await ev("practice",undefined,{assessmentPurpose:"transfer"})).difficulty, "challenging");
// explicit metadata still wins
assert.equal((await ev("practice",undefined,{evidenceIndependence:"guided"})).independence, "guided");
// misconception id
const wrong = await ev("practice",undefined,{},"b");
assert.equal(wrong.outcome,"incorrect");
assert.equal(wrong.misconceptionId,"larger_denominator_larger");
assert.equal((await ev("practice")).misconceptionId, undefined);
assert.deepEqual((await ev("practice")).contextTags, ["school"]);
// mastery now reachable with authored-style evidence (Tranche 4B: five DIFFERENT items, first exposure)
const hist:any[] = [];
for (let i=0;i<5;i++){ const e:any = await ev("practice"); e.id="e"+i; e.assessmentItemId="i"+i; e.exposureCount=1; e.timestamp=new Date(2026,9,1,0,i).toISOString(); hist.push(e); }
const m = evaluateMastery(hist);
console.log("5 independent authored-style answers:", m.masteryEstimate.toFixed(2), m.confidence.toFixed(2), m.reasonCode);
assert.equal(m.reasonCode,"STRONG_MASTERY_EVIDENCE");
// supported-only still cannot reach mastery
const sup:any[] = [];
for (let i=0;i<8;i++){ const e:any = await ev("practice",{workedExampleViewed:true}); e.id="s"+i; e.timestamp=new Date(2026,9,1,0,i).toISOString(); sup.push(e); }
const ms = evaluateMastery(sup);
console.log("8 worked-example-supported answers:", ms.masteryEstimate.toFixed(2), ms.confidence.toFixed(2), ms.reasonCode);
assert.notEqual(ms.reasonCode,"STRONG_MASTERY_EVIDENCE");
console.log("STEP A TESTS PASS");
