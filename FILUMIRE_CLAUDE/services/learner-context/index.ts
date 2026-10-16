import type { GradeSetBy, LearnerLearningContextRecord } from "../persistence";
import { persistenceStore } from "../persistence-provider";
import {
  getAvailableSubjectsForGrade,
  getDefaultLearnerLearningContext,
  getFrameworkSubject,
  isSupportedGrade,
  type FrameworkSubject,
} from "../../packages/curriculum-framework";
import { getCompetency } from "../../packages/curriculum";

export type { GradeSetBy, LearnerLearningContextRecord };

/*
 * Raised when a requested grade, subject or competency does not
 * fit the learner's learning context. The context is never
 * changed when this is thrown.
 */
export class LearnerContextValidationError extends Error {}

/*
 * Checks a requested grade without changing anything, so callers
 * can reject a missing or unsupported grade before they write.
 * Uses the learner's curriculum version when a context exists,
 * otherwise the default one a new context would receive.
 */
export async function requireSupportedGrade(
  learnerId: string | undefined,
  gradeId: unknown,
): Promise<string> {
  if (typeof gradeId !== "string" || !gradeId.trim()) {
    throw new LearnerContextValidationError("Choose a class.");
  }

  const context = learnerId
    ? await getLearnerLearningContext(learnerId)
    : undefined;
  const curriculumVersionId =
    context?.curriculumVersionId ??
    getDefaultLearnerLearningContext().curriculumVersionId;

  if (!isSupportedGrade(curriculumVersionId, gradeId)) {
    throw new LearnerContextValidationError("Unsupported grade.");
  }

  return gradeId;
}

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
 * `setBy` records who chose the grade; a grade the guardian
 * chose is locked for the learner (see the profile route). Only
 * an explicit guardian choice (adding the learner with a class,
 * or the guardian sending a class) records "guardian"; reads,
 * learning activity and unattributed writes never do, so rows
 * from before migration 0023 stay unlocked.
 */
export async function setLearnerGrade(
  learnerId: string,
  gradeId: string,
  setBy?: GradeSetBy,
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
    if (!setBy || context.gradeSetBy === setBy) {
      return context;
    }

    // Same grade, newly confirmed by someone: record who, and
    // keep the learner's subject and competency as they are.
    const confirmed: LearnerLearningContextRecord = {
      ...context,
      gradeSetBy: setBy,
      updatedAt: new Date().toISOString(),
    };

    await saveLearnerLearningContext(confirmed);

    return confirmed;
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
    // Unattributed changes keep the existing attribution: they
    // neither create nor remove a guardian's lock.
    gradeSetBy: setBy ?? context.gradeSetBy,
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
