import { getAllEvidence } from "../services/evidence-store/index";
import { getLearnerStates } from "../services/learner-state-store/index";
import { mergeCompetencyStates } from "../services/learner-path/progression";
import { getCompetency } from "../packages/curriculum/index";
import { computeMasteryPilotMeasures, type PilotCompetencyRecord } from "../services/pilot-measures/index";

/*
 * Tranche 4C: report the Option B mastery pilot measures from the
 * configured store (read only).
 *
 * Run: npx tsx --env-file=.env.local scripts/pilot-measures.ts [subjectId]
 */
const subjectId = process.argv[2];

const evidence = (await getAllEvidence()).filter(
  (item) => !subjectId || getCompetency(item.competencyId)?.subjectId === subjectId,
);

const records: PilotCompetencyRecord[] = [];

for (const learnerId of new Set(evidence.map((item) => item.learnerId))) {
  const states = mergeCompetencyStates(
    ...(await getLearnerStates(learnerId)).map((state) => state.competencies),
  );

  for (const state of states) {
    if (!subjectId || getCompetency(state.competencyId)?.subjectId === subjectId) {
      records.push({ learnerId, state });
    }
  }
}

console.log(JSON.stringify({ subjectId: subjectId ?? "all", ...computeMasteryPilotMeasures({ records, evidence }) }, null, 2));
process.exit(0);
