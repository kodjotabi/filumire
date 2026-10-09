import { GET } from "../apps/learner/app/api/learning/route";
import { seedContent } from "../services/content-store/seed";
import { getAllContent, getContentForCompetency } from "../services/content-store/index";
import { orderOptionsForLearner, prepareLearnerContent } from "../services/assessment/learner-content";
import { getCompetency } from "../packages/curriculum/index";

/*
 * TRANCHE 4E: multiple-choice options reach the learner shuffled.
 * Audit of 7 October: the correct answer is the FIRST authored option in
 * about 99% of questions (e.g. 1206/1206 B5 English, 882/882 B6
 * Computing), and nothing shuffled them, so always tapping the first
 * option passed almost everything. Now:
 * - answer keys never reach the device;
 * - options are shuffled, stable per learner and item, different
 *   between learners;
 * - across the real question bank the correct answer is first about as
 *   often as chance allows, never ~99%;
 * - marking is unaffected (answers are matched by text).
 *
 * Run: npx tsx --env-file=.env.local tests/option-order-4e.test.ts
 */

seedContent();

let passed = 0;
function check(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed += 1;
}

const questions = getAllContent().filter((item) => item.assessmentItemId && item.metadata?.options && item.metadata.expectedResponse && getCompetency(item.competencyId)?.subjectId !== "subject-test-mathematics");

function unit(): void {
  const sample = questions[0];
  const prepared = prepareLearnerContent(sample, "learner-a");
  const options = JSON.parse(sample.metadata!.options) as string[];
  const shown = JSON.parse(prepared.metadata!.options) as string[];
  check(!("expectedResponse" in prepared.metadata!) && !("diagnosticRules" in prepared.metadata!), "answer key and diagnostic rules removed");
  check(shown.length === options.length && [...shown].sort().join("|") === [...options].sort().join("|"), "same options, reordered only");
  check(JSON.stringify(prepareLearnerContent(sample, "learner-a").metadata!.options) === JSON.stringify(prepared.metadata!.options), "stable for the same learner and item (reload shows the same order)");
  check(sample.metadata!.expectedResponse !== undefined && "expectedResponse" in sample.metadata!, "stored content is not modified");

  const orders = new Set(Array.from({ length: 40 }, (_, i) => orderOptionsForLearner(["a", "b", "c", "d"], `learner-${i}`, "item-x").join("")));
  check(orders.size >= 8, `different learners see different orders (${orders.size} distinct of 40)`);
}

function distribution(): void {
  for (const learnerId of ["learner-dist-1", "learner-dist-2"]) {
    let first = 0;
    let expected = 0;
    for (const item of questions) {
      const shown = JSON.parse(prepareLearnerContent(item, learnerId).metadata!.options) as string[];
      if (shown[0] === item.metadata!.expectedResponse) first += 1;
      expected += 1 / shown.length;
    }
    const share = first / questions.length;
    const chance = expected / questions.length;
    check(Math.abs(share - chance) < 0.03, `${learnerId}: correct answer first ${(share * 100).toFixed(1)}% vs chance ${(chance * 100).toFixed(1)}% over ${questions.length} questions`);
  }

  const authoredFirst = questions.filter((item) => (JSON.parse(item.metadata!.options) as string[])[0] === item.metadata!.expectedResponse).length / questions.length;
  console.log(`  authored order: correct answer first in ${(authoredFirst * 100).toFixed(1)}% of ${questions.length} questions`);
}

async function route(): Promise<void> {
  const learnerId = `learner-option-order-${Date.now()}`;
  const response = await GET(new Request(`http://localhost/api/learning?sessionId=session-option-order-${Date.now()}`, { headers: { "x-filumire-learner-id": learnerId } }));
  check(response.status === 200, `route GET 200 (${response.status})`);
  const body = (await response.json()) as { content?: { assessmentItemId?: string; competencyId: string; metadata?: Record<string, string> } };
  const served = body.content;
  if (served?.assessmentItemId && served.metadata?.options) {
    const stored = getContentForCompetency(served.competencyId).find((item) => item.assessmentItemId === served.assessmentItemId)!;
    check(!served.metadata.expectedResponse && !served.metadata.diagnosticRules, "route: no answer key sent");
    check(served.metadata.options === prepareLearnerContent(stored, learnerId).metadata!.options, "route: options sent in the learner's shuffled order");
  } else {
    check(true, "route: first step is not a question (nothing to order)");
  }
}

(async () => {
  unit();
  distribution();
  await route();
  console.log(`PASS option-order-4e (${passed} checks)`);
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
