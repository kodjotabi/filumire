import {
  getAllCompetencies,
  getCompetency,
} from "../../packages/curriculum";

import type { PathCurriculum } from "./index";

/*
 * Connects the learner path to the real curriculum graph.
 * Pass a subject id to limit the path to one subject, and a
 * learning level id to limit it to one grade (Tranche 4B).
 */
export function createPathCurriculum(
  subjectId?: string,
  learningLevelId?: string,
): PathCurriculum {
  return {
    listCompetencyIds: () =>
      getAllCompetencies()
        .filter(
          (competency) =>
            (!subjectId || competency.subjectId === subjectId) &&
            (!learningLevelId ||
              competency.learningLevelId === learningLevelId),
        )
        .map((competency) => competency.id),

    getPrerequisites: (competencyId) =>
      getCompetency(competencyId)?.prerequisiteCompetencyIds,
  };
}
