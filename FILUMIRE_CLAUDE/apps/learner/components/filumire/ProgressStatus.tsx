import { PROGRESS_TEXT, type LearningProgressStatus } from '../../../../services/learner-progress/reporting';

/** Shared labels keep learner, parent and teacher reporting consistent. */
export function ProgressStatus({ status, language }: { status: LearningProgressStatus; language: 'en' | 'fr' }) {
  return <span data-progress-status={status}>{PROGRESS_TEXT[language][status]}</span>;
}

export function ProgressBreakdown({ full, understandingOnly = 0, provisional = 0, language }: {
  full: number; understandingOnly?: number; provisional?: number; language: 'en' | 'fr';
}) {
  const text = PROGRESS_TEXT[language];
  return <div className="progressBreakdown">
    <div>{text.mastered}: <strong>{full}</strong></div>
    <div>{text.understanding_only}: <strong>{understandingOnly}</strong></div>
    <div>{text.provisional}: <strong>{provisional}</strong></div>
  </div>;
}
