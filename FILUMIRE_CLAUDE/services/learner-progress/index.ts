import {
  getCompetenciesForSubject,
  getCompetency,
} from "../../packages/curriculum";
import {
  getFrameworkGrade,
  type FrameworkSubject,
} from "../../packages/curriculum-framework";
import {
  getAvailableSubjectsForContext,
  type LearnerLearningContextRecord,
} from "../learner-context";
import { getLearnerStates } from "../learner-state-store";
import { classifyProgress } from "./reporting";

/*
 * One read-only roll-up of a learner's progress, shared by the
 * learner's own screens and the parent summary so they never
 * disagree. Three different things are measured and kept apart:
 *
 * - activity: how much the learner has done (answers recorded),
 *   which says nothing on its own about understanding;
 * - mastery: competencies FILUMIRE's adaptive engine has judged
 *   ready to move on from (readinessState.readyForAdvancement),
 *   versus those started but not yet mastered;
 * - curriculum: mastered competencies out of every competency
 *   FILUMIRE offers for the learner's class, per subject.
 *
 * Nothing here computes or changes mastery; it only counts the
 * engine's own decisions.
 *
 * Basic 7-9 Step 0: a topic whose indicator FILUMIRE assesses for
 * understanding only (assessmentScope) is counted apart, never as a
 * mastered competency. A topic acquired but not yet confirmed by
 * retention (masteredAt without readiness) is provisional progress.
 */

export interface CompetencyProgressRow {
  evidenceCount: number;
  mastered: boolean;
  masteryEstimate: number;
  /* Mastery gate met, retention not yet confirmed. */
  provisional?: boolean;
}

export interface SubjectProgress {
  subjectId: string;
  name: string;
  discipline: string;
  totalCompetencies: number;
  masteredCompetencies: number;
  /* Readiness confirmed, but only the understanding part is assessed. */
  understandingMasteredCompetencies: number;
  /* Started; includes provisionalCompetencies. */
  inProgressCompetencies: number;
  provisionalCompetencies: number;
  answersRecorded: number;
}

export interface LearnerProgress {
  gradeId: string;
  gradeName: string;
  lastActiveAt?: string;
  activity: {
    answersRecorded: number;
  };
  mastery: {
    masteredCompetencies: number;
    understandingMasteredCompetencies: number;
    inProgressCompetencies: number;
    provisionalCompetencies: number;
  };
  curriculum: {
    masteredCompetencies: number;
    totalCompetencies: number;
    percent: number;
  };
  subjects: SubjectProgress[];
}

/*
 * The best-known row per competency across all of the learner's
 * stored states: the one with the most evidence, and mastered if
 * any state says so.
 */
export async function getCompetencyProgressRows(
  learnerId: string,
): Promise<{ rows: Map<string, CompetencyProgressRow>; lastActiveAt?: string }> {
  const states = await getLearnerStates(learnerId);
  const rows = new Map<string, CompetencyProgressRow>();
  let lastActiveAt: string | undefined;

  for (const state of states) {
    if (state.updatedAt && (!lastActiveAt || state.updatedAt > lastActiveAt)) {
      lastActiveAt = state.updatedAt;
    }

    for (const competency of state.competencies) {
      const known = rows.get(competency.competencyId);
      const evidenceCount = competency.evidenceCount ?? 0;
      const mastered = Boolean(competency.readinessState?.readyForAdvancement);
      const provisional = !mastered && Boolean(competency.masteredAt);

      if (
        !known ||
        evidenceCount > known.evidenceCount ||
        (mastered && !known.mastered)
      ) {
        rows.set(competency.competencyId, {
          evidenceCount: Math.max(evidenceCount, known?.evidenceCount ?? 0),
          mastered: mastered || Boolean(known?.mastered),
          masteryEstimate: competency.masteryEstimate ?? 0,
          provisional: !(mastered || known?.mastered) && (provisional || Boolean(known?.provisional)),
        });
      }
    }
  }

  return { rows, lastActiveAt };
}

export function summariseSubjects(
  availableSubjects: FrameworkSubject[],
  rows: Map<string, CompetencyProgressRow>,
): SubjectProgress[] {
  return availableSubjects.map((subject) => {
    const progress: SubjectProgress = {
      subjectId: subject.id,
      name: subject.name,
      discipline: subject.discipline,
      totalCompetencies: getCompetenciesForSubject(subject.id).length,
      masteredCompetencies: 0,
      understandingMasteredCompetencies: 0,
      inProgressCompetencies: 0,
      provisionalCompetencies: 0,
      answersRecorded: 0,
    };

    rows.forEach((row, competencyId) => {
      const competency = getCompetency(competencyId);
      if (competency?.subjectId !== subject.id) return;

      progress.answersRecorded += row.evidenceCount;

      const status = classifyProgress(row, competency.assessmentScope);
      if (status === "understanding_only") {
        progress.understandingMasteredCompetencies += 1;
      } else if (status === "mastered") {
        progress.masteredCompetencies += 1;
      } else if (row.evidenceCount > 0) {
        progress.inProgressCompetencies += 1;
        if (row.provisional) progress.provisionalCompetencies += 1;
      }
    });

    return progress;
  });
}

export async function buildLearnerProgress(
  learnerId: string,
  context: LearnerLearningContextRecord,
): Promise<LearnerProgress> {
  const { rows, lastActiveAt } = await getCompetencyProgressRows(learnerId);
  const subjects = summariseSubjects(
    getAvailableSubjectsForContext(context),
    rows,
  );

  const sum = (pick: (subject: SubjectProgress) => number) =>
    subjects.reduce((total, subject) => total + pick(subject), 0);

  const masteredCompetencies = sum((subject) => subject.masteredCompetencies);
  let answersRecorded = 0;
  rows.forEach((row) => {
    answersRecorded += row.evidenceCount;
  });
  const totalCompetencies = sum((subject) => subject.totalCompetencies);

  return {
    gradeId: context.gradeId,
    gradeName: getFrameworkGrade(context.gradeId)?.name ?? "",
    lastActiveAt,
    // All answers, including any from an earlier class.
    activity: {
      answersRecorded,
    },
    mastery: {
      masteredCompetencies,
      understandingMasteredCompetencies: sum((subject) => subject.understandingMasteredCompetencies),
      inProgressCompetencies: sum((subject) => subject.inProgressCompetencies),
      provisionalCompetencies: sum((subject) => subject.provisionalCompetencies),
    },
    curriculum: {
      masteredCompetencies,
      totalCompetencies,
      percent:
        totalCompetencies > 0
          ? Math.round((masteredCompetencies / totalCompetencies) * 100)
          : 0,
    },
    subjects,
  };
}
