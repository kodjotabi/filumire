import assert from "node:assert/strict";
import {
  buildLearnerPath,
  recommendNext,
} from "../services/learner-path";
import { createPathCurriculum } from "../services/learner-path/curriculum";

const curriculum = createPathCurriculum();
const ids = curriculum.listCompetencyIds();
assert.ok(ids.length > 0, "the real curriculum must list competencies");

const path = buildLearnerPath({ states: [], curriculum, now: new Date() });
assert.equal(path.entries.length, ids.length);
assert.ok(path.entries.every((e) => e.status === "not_started"));

const recs = recommendNext({ path, curriculum });
assert.equal(recs[0].kind, "start_next");
const first = recs[0].competencyId!;
const prereqs = curriculum.getPrerequisites(first) ?? [];
assert.equal(prereqs.length, 0, "a fresh learner must start at a competency with no prerequisites");

console.log("LEARNER PATH CURRICULUM TEST PASS");
