import {getJhsCompletionBatch} from '../services/content-store/jhs-completion-batches';
import {installCompletionBatch} from './fixtures/jhs-completion-batch';
import {runJhsJourneys} from './fixtures/jhs-journey-runner';
const batch=getJhsCompletionBatch('batch04-b7-science-energy');
await runJhsJourneys({competencies:batch.competencies,sources:batch.sources,install:()=>installCompletionBatch(batch.id),output:`docs/jhs-development/completion/${batch.id}/journeys.json`});
