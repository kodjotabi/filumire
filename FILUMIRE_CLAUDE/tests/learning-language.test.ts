import { GET as learningGet } from "../apps/learner/app/api/learning/route";
import { getLearnerStates } from "../services/learner-state-store";
import { persistenceStore } from "../services/persistence-provider";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

type LearningBody = {
  content?: { id: string; language?: string; title: string };
  instruction?: { structured?: { elements: Array<{ type: string; text: string }> } };
  learnerState: { language: string; competencies: Array<{ competencyId: string; masteryEstimate: number; evidenceCount: number }> };
};

/*
 * The interface language chooses the lesson language: French gives
 * the French content and French engine guidance, English switches
 * back, and changing language never touches mastery or evidence.
 */
async function main(): Promise<void> {
  const learnerId = `language-${crypto.randomUUID()}`;
  const sessionId = `session-${crypto.randomUUID()}`;
  await persistenceStore.ensureLearnerExists(learnerId);

  const get = async (language: "en" | "fr") => {
    const response = await learningGet(
      new Request(`http://localhost/api/learning?sessionId=${sessionId}`, {
        headers: {
          "x-filumire-learner-id": learnerId,
          "x-filumire-language": language,
        },
      }),
    );
    assert(response.status === 200, `learning GET (${language}) returned ${response.status}`);
    return (await response.json()) as LearningBody;
  };

  const french = await get("fr");
  assert(french.learnerState.language === "fr", "learner state switches to French");
  assert(french.content, "French learner receives content");
  assert(french.content.language === "fr" || french.content.id.endsWith("-fr"), `content is French (got ${french.content.id})`);
  const englishEngineSentences = /\b(Choose the best answer|Let us check|Practice will strengthen|Study .* carefully)\b/;
  const frenchText = (french.instruction?.structured?.elements ?? []).map((element) => element.text).join(" ");
  assert(!englishEngineSentences.test(frenchText), `engine guidance is not English in French mode: ${frenchText.slice(0, 160)}`);
  console.log({ test: "French interface gives French lessons and guidance", result: "PASS" });

  const before = french.learnerState.competencies.map((c) => [c.competencyId, c.masteryEstimate, c.evidenceCount]);

  const english = await get("en");
  assert(english.learnerState.language === "en", "learner state switches back to English");
  assert(english.content && (english.content.language === "en" || !english.content.id.endsWith("-fr")), "content is English again");

  const stored = await getLearnerStates(learnerId);
  const after = stored.flatMap((state) => state.competencies).map((c) => [c.competencyId, c.masteryEstimate, c.evidenceCount]);
  for (const entry of before) {
    assert(after.some((other) => JSON.stringify(other) === JSON.stringify(entry)), "mastery and evidence unchanged by a language switch");
  }
  console.log({ test: "switching language keeps mastery and evidence", result: "PASS" });

  console.log({ learningLanguageTest: "PASS", persistence: process.env.FILUMIRE_PERSISTENCE ?? "memory" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
