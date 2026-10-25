import type { LearnerCompetencyState } from '../../packages/domain';

export type LearningProgressStatus = 'mastered' | 'understanding_only' | 'provisional' | 'in_progress' | 'not_started';
type Scope = 'full' | 'understanding_only';

/** Read-only presentation of the engine's decisions; never infers mastery from a score. */
export function classifyProgress(
  row: { mastered: boolean; provisional?: boolean; evidenceCount: number } | undefined,
  scope?: Scope,
): LearningProgressStatus {
  if (row?.mastered) return scope === 'understanding_only' ? 'understanding_only' : 'mastered';
  if (row?.provisional) return 'provisional';
  return row && row.evidenceCount > 0 ? 'in_progress' : 'not_started';
}

export function progressForState(state: LearnerCompetencyState | undefined, scope?: Scope): LearningProgressStatus {
  return classifyProgress(state && {
    mastered: Boolean(state.readinessState?.readyForAdvancement),
    provisional: Boolean(state.masteredAt),
    evidenceCount: state.evidenceCount,
  }, scope);
}

export const PROGRESS_TEXT = {
  en: {
    mastered: 'Full mastery',
    understanding_only: 'Understanding mastered; practical or spoken performance not observed',
    provisional: 'Provisional progress; still to confirm',
    in_progress: 'In progress',
    not_started: 'Not started',
    scopeNote: 'Only understanding is assessed here. Practical or spoken performance has not been observed.',
  },
  fr: {
    mastered: 'Maîtrise complète',
    understanding_only: 'Compréhension maîtrisée ; performance pratique ou orale non observée',
    provisional: 'Progression provisoire ; à confirmer',
    in_progress: 'En cours',
    not_started: 'Pas commencé',
    scopeNote: 'Seule la compréhension est évaluée ici. La performance pratique ou orale n’a pas été observée.',
  },
} as const;
