import { createHash } from 'node:crypto';
import type { CompetencyDefinition } from '../../packages/curriculum';
import type { LearningContent } from '../../packages/content';
/** Bind validation to the exact pedagogy/policy, excluding only generated timestamps. */
export function jhsValidationFingerprint(competency: CompetencyDefinition, content: LearningContent[]): string {
  const records = content.filter(c => c.competencyId === competency.id)
    .map(({ createdAt, updatedAt, ...record }) => record).sort((a, b) => a.id.localeCompare(b.id));
  return createHash('sha256').update(JSON.stringify({ competency, content: records })).digest('hex');
}
