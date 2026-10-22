import { getCompetency, registerPrivateJhsCompetency, type CompetencyDefinition } from '../../packages/curriculum';
import type { LearningContent } from '../../packages/content';
import { isPrivateJhsEnabled, PRIVATE_JHS_SCOPE } from '../../packages/curriculum/jhs-private-policy';
import { JHS_PREVIEW_COMPETENCIES, JHS_REPRESENTATIVE_CONTENT } from './jhs-representative-preview';
import { JHS_COMPLETION_BATCHES } from './jhs-completion-batches';
import { jhsValidationFingerprint } from './jhs-validation-fingerprint';
import { saveContent } from './index';

// Set only after one fully successful verification in this module instance; the
// pinned sources are static, so later seeds re-register and re-save without re-hashing.
let verified: { selected: CompetencyDefinition[]; records: LearningContent[] } | undefined;

export function seedPrivateJhsContent(): void {
  if (!isPrivateJhsEnabled()) return;
  if (verified) {
    for (const competency of verified.selected) registerPrivateJhsCompetency(competency);
    for (const content of verified.records) saveContent(content);
    return;
  }
  const definitions = [...JHS_PREVIEW_COMPETENCIES, ...JHS_COMPLETION_BATCHES.flatMap(batch => batch.competencies)];
  const records = [...JHS_REPRESENTATIVE_CONTENT, ...JHS_COMPLETION_BATCHES.flatMap(batch => batch.content)];
  // Verify the entire scope before changing runtime availability. New drafts are excluded.
  const selected = PRIVATE_JHS_SCOPE.map(row => {
    const competency = definitions.find(item => item.id === row.competencyId);
    if (!competency || jhsValidationFingerprint(competency, records) !== row.contentFingerprint) {
      throw new Error(`Private JHS validation fingerprint mismatch: ${row.competencyId}`);
    }
    const existing = getCompetency(competency.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(competency)) throw new Error('Conflicting private JHS definition');
    return competency;
  });
  for (const competency of selected) registerPrivateJhsCompetency(competency);
  const ids = new Set(selected.map(item => item.id));
  const scoped = records.filter(content => ids.has(content.competencyId));
  for (const content of scoped) saveContent(content);
  verified = { selected, records: scoped };
}
