import { getCompetency, getCompetenciesForSubject } from '../../packages/curriculum';
import { isPrivateJhsEnabled, PRIVATE_JHS_SCOPE } from '../../packages/curriculum/jhs-private-policy';
import type { LearnerCompetencyState } from '../../packages/domain';
import type { LearnerLearningContextRecord } from '../persistence';
import { getLearnerStates } from '../learner-state-store';
import { getLearnerLearningContext } from '../learner-context';

/** A path extension is available only to an opted-in JHS learner, never a primary class. */
function assigned(context: LearnerLearningContextRecord) {
  return isPrivateJhsEnabled() && PRIVATE_JHS_SCOPE.some(row => row.gradeId === context.gradeId && row.subjectId === context.activeSubjectId);
}
function ancestor(origin: string, target: string, visited = new Set<string>()): boolean {
  if (visited.has(origin)) return false;
  visited.add(origin);
  return (getCompetency(origin)?.prerequisiteCompetencyIds ?? []).some(id => id === target || ancestor(id, target, visited));
}
/** Curriculum-only check; callers authorising a request must also require the saved repair marker. */
export function isRepairCandidate(context: LearnerLearningContextRecord, target: string): boolean {
  return Boolean(assigned(context) && getCompetency(target) &&
    getCompetenciesForSubject(context.activeSubjectId).some(c => c.learningLevelId === context.gradeId && ancestor(c.id, target)));
}
function markedTargets(context: LearnerLearningContextRecord, states: LearnerCompetencyState[]): Set<string> {
  const allowed = new Set<string>();
  const foundations = (id: string) => {
    for (const parent of getCompetency(id)?.prerequisiteCompetencyIds ?? []) if (!allowed.has(parent) && getCompetency(parent)) {
      allowed.add(parent);
      foundations(parent);
    }
  };
  const visit = (origin: string) => {
    for (const state of states.filter(row => row.competencyId === origin)) {
      if (state.readinessState?.readyForAdvancement) continue;
      const repair = state.prerequisiteRepair?.repairCompetencyId;
      if (repair && !allowed.has(repair) && ancestor(origin, repair)) {
        allowed.add(repair);
        // Due reviews of genuine foundations must remain available during a
        // repair; unrelated topics of the earlier class remain inaccessible.
        foundations(repair);
        visit(repair);
      }
    }
  };
  if (assigned(context)) for (const c of getCompetenciesForSubject(context.activeSubjectId)) {
    if (c.learningLevelId === context.gradeId) visit(c.id);
  }
  return allowed;
}
export async function isAuthorisedRepair(context: LearnerLearningContextRecord, target: string): Promise<boolean> {
  if (!isRepairCandidate(context, target)) return false;
  const states = (await getLearnerStates(context.learnerId)).flatMap(s => s.competencies);
  return markedTargets(context, states).has(target);
}
/** Return to the recorded requesting competency, not an unrelated topic of the earlier class. */
export async function prerequisiteReturnTargets(learnerId: string, current: string, states: LearnerCompetencyState[]): Promise<string[]> {
  if (!isPrivateJhsEnabled()) return [];
  const context = await getLearnerLearningContext(learnerId);
  if (!context || !assigned(context)) return [];
  const allowed = markedTargets(context, states);
  if (!allowed.has(current)) return [];
  const direct = [...new Set(states.filter(state => state.prerequisiteRepair?.repairCompetencyId === current &&
    ancestor(state.competencyId, current) &&
    (allowed.has(state.competencyId) || getCompetency(state.competencyId)?.subjectId === context.activeSubjectId))
    .map(state => state.competencyId))];
  if (direct.length) return direct;
  // A due review inside the repair's own foundation chain returns to that
  // repair, rather than opening an unrelated topic of the earlier class.
  return [...new Set(states.map(state => state.prerequisiteRepair?.repairCompetencyId)
    .filter((id): id is string => Boolean(id && id !== current && allowed.has(id) && ancestor(id, current))))];
}
