import { mkdirSync } from 'node:fs';
import { PRIVATE_JHS_SCOPE } from '../packages/curriculum/jhs-private-policy';
import { seedContent } from '../services/content-store/seed';
import { getCompetency } from '../packages/curriculum';
import { getFrameworkCompetencyRegistration } from '../packages/curriculum-framework';
import { runJhsJourneys } from './fixtures/jhs-journey-runner';

process.env.FILUMIRE_JHS_MODE = 'private-presentation';
seedContent();
mkdirSync('docs/jhs-development/integration', { recursive: true });
await runJhsJourneys({
  competencies: PRIVATE_JHS_SCOPE.map(row => getCompetency(row.competencyId)!),
  sources: PRIVATE_JHS_SCOPE.map(row => getFrameworkCompetencyRegistration(row.competencyId)!),
  install: seedContent,
  output: 'docs/jhs-development/integration/journeys.json',
});
