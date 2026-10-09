import type { LearnerLearningContextRecord } from "../persistence";
import { persistenceStore } from "../persistence-provider";
import {
  getAvailableSubjectsForGrade,
  getDefaultLearnerLearningContext,
  getFrameworkSubject,
  isSupportedGrade,
  type FrameworkSubject,
} from "../../packages/curriculum-framework";
import { getCompetency } from "../../packages/curriculum";

export type { LearnerLearningContextRecord };

/*
 * Raised when a requested grade, subject or competency does not
 * fit the learner's learning context. The context is never
 * changed when this is thrown.
 */
export class LearnerContextValidationError extends Error {}

export async function getLearnerLearningContext(
  learnerId: string,
): Promise<LearnerLearningContextRecord | undefined> {
  return persistenceStore.getLearnerLearningContext(
    learnerId,
  );
}

export async function saveLearnerLearningContext(
  context: LearnerLearningContextRecord,
): Promise<void> {
  await persistenceStore.saveLearnerLearningContext(
    context,
  );
}

/*
 * Returns the learner's persisted learning context, lazily
 * creating a default one (currently the Ghana Mathematics
 * pilot) for learners who have never had one established.
 * This is the explicit, application-layer compatibility path
 * for existing Ghana Mathematics pilot learners.
 */
export async function getOrCreateLearnerLearningContext(
  learnerId: string,
): Promise<LearnerLearningContextRecord> {
  const existing = await getLearnerLearningContext(
    learnerId,
  );

  if (existing) {
    return existing;
  }

  const defaults = getDefaultLearnerLearningContext();

  const created: LearnerLearningContextRecord = {
    learnerId,
    curriculumVersionId: defaults.curriculumVersionId,
    gradeId: defaults.gradeId,
    activeSubjectId: defaults.activeSubjectId,
    updatedAt: new Date().toISOString(),
  };

  await saveLearnerLearningContext(created);

  return created;
}

/*
 * The subjects the learner can learn in their current grade,
 * as decided by the curriculum framework.
 */
export function getAvailableSubjectsForContext(
  context: LearnerLearningContextRecord,
): FrameworkSubject[] {
  return getAvailableSubjectsForGrade(
    context.curriculumVersionId,
    context.gradeId,
  );
}

function findAvailableSubject(
  context: LearnerLearningContextRecord,
  subjectId: string,
): FrameworkSubject | undefined {
  return getAvailableSubjectsForContext(context).find(
    (subject) => subject.id === subjectId,
  );
}

/*
 * Sets the learner's grade. The grade must be a supported
 * level of the learner's curriculum version. The active subject
 * moves to the same discipline in the new grade when that grade
 * offers it, otherwise to the grade's first available subject;
 * the active competency is cleared so no pointer from the old
 * grade survives. Learner state and evidence are not touched.
 */
export async function setLearnerGrade(
  learnerId: string,
  gradeId: string,
): Promise<LearnerLearningContextRecord> {
  const context = await getOrCreateLearnerLearningContext(
    learnerId,
  );

  if (
    !isSupportedGrade(
      context.curriculumVersionId,
      gradeId,
    )
  ) {
    throw new LearnerContextValidationError(
      "Unsupported grade.",
    );
  }

  if (
    context.gradeId === gradeId &&
    findAvailableSubject(context, context.activeSubjectId)
  ) {
    return context;
  }

  const available = getAvailableSubjectsForGrade(
    context.curriculumVersionId,
    gradeId,
  );
  const previousDiscipline = getFrameworkSubject(
    context.activeSubjectId,
  )?.discipline;
  const activeSubject =
    available.find(
      (subject) =>
        subject.discipline === previousDiscipline,
    ) ?? available[0];

  const updated: LearnerLearningContextRecord = {
    learnerId,
    curriculumVersionId: context.curriculumVersionId,
    gradeId,
    activeSubjectId: activeSubject.id,
    updatedAt: new Date().toISOString(),
  };

  await saveLearnerLearningContext(updated);

  return updated;
}

/*
 * Makes a subject of the learner's grade the active subject.
 * A subject from another grade (or an unknown subject) is
 * rejected. The active competency is kept only when it belongs
 * to the new subject.
 */
export async function setActiveSubject(
  learnerId: string,
  subjectId: string,
): Promise<LearnerLearningContextRecord> {
  const context = await getOrCreateLearnerLearningContext(
    learnerId,
  );

  if (!findAvailableSubject(context, subjectId)) {
    throw new LearnerContextValidationError(
      "Subject is not available for the learner's grade.",
    );
  }

  if (context.activeSubjectId === subjectId) {
    return context;
  }

  const activeCompetencyId =
    context.activeCompetencyId &&
    getCompetency(context.activeCompetencyId)
      ?.subjectId === subjectId
      ? context.activeCompetencyId
      : undefined;

  const updated: LearnerLearningContextRecord = {
    ...context,
    activeSubjectId: subjectId,
    activeCompetencyId,
    updatedAt: new Date().toISOString(),
  };

  await saveLearnerLearningContext(updated);

  return updated;
}

/*
 * Records the learner's current active competency and, with
 * it, the competency's subject as the active subject. The
 * competency must belong to a subject available in the
 * learner's grade; curriculum version and grade never change
 * here, and learner-state/evidence are not touched.
 */
export async function updateActiveCompetency(
  learnerId: string,
  competencyId: string,
): Promise<void> {
  const context = await getOrCreateLearnerLearningContext(
    learnerId,
  );

  const competency = getCompetency(competencyId);

  if (
    !competency ||
    !findAvailableSubject(context, competency.subjectId)
  ) {
    throw new LearnerContextValidationError(
      "Competency is not available for the learner's grade.",
    );
  }

  if (
    context.activeCompetencyId === competencyId &&
    context.activeSubjectId === competency.subjectId
  ) {
    return;
  }

  await saveLearnerLearningContext({
    ...context,
    activeSubjectId: competency.subjectId,
    activeCompetencyId: competencyId,
    updatedAt: new Date().toISOString(),
  });
}
