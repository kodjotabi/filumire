import assert from "node:assert/strict";
import { learnerErrorText, translateLearnerError, lessonLanguageNotice } from "../apps/learner/services/learner-interface";
import { LearningNetworkError, LearningRequestError } from "../apps/learner/services/learning-client";
import { withLang } from "../apps/learner/components/filumire/language";
for (const status of [401, 403, 409, 429, 500]) {
  const error = new LearningRequestError("Fictional internal diagnostic — never show this", status);
  const english = learnerErrorText(error, "en"), french = learnerErrorText(error, "fr");
  assert.notEqual(english, french); assert(!english.includes("internal") && !french.includes("internal"));
  assert.equal(translateLearnerError(english, "fr"), french);
  assert.equal(translateLearnerError(french, "en"), english);
  assert.equal(error.status, status, "UI error wording must not reclassify server errors");
}
assert.match(learnerErrorText(new LearningNetworkError("fixture"), "fr"), /connexion/);
assert.match(learnerErrorText(new Error("fixture"), "en"), /could not be confirmed/);
assert.equal(lessonLanguageNotice("fr", "fr"), undefined);
assert.equal(lessonLanguageNotice(undefined, "fr"), undefined, "unknown curriculum language must not be invented");
assert.match(lessonLanguageNotice("en", "fr")!, /version française validée/);
assert.match(lessonLanguageNotice("fr", "en")!, /trusted English version/);
const target = new URL(withLang("/dashboard?view=learning&subjectId=fictional-math&lang=en", "fr"), "http://fixture.local");
assert.equal(target.searchParams.get("subjectId"), "fictional-math"); assert.equal(target.searchParams.get("view"), "learning"); assert.equal(target.searchParams.getAll("lang").length, 1); assert.equal(target.searchParams.get("lang"), "fr");
console.log("PASS: safe bilingual errors, switching after errors, honest curriculum fallback and language-preserving subject navigation");
