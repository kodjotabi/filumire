import assert from 'node:assert/strict';
import {buildIntegrationPacket} from './fixtures/jhs-required-performance';
import {registerIsolatedJhsPreviewCompetency} from '../packages/curriculum';
import {saveContent} from '../services/content-store';
import {subjectSupportsSpacedRevision} from '../services/learner-path/revision';
// Fictional approval metadata in a non-deployed, test-only memory process is
// used to exercise scheduler compatibility; no review ledger/release is written.
Object.assign(process.env,{NODE_ENV:'test',FILUMIRE_PERSISTENCE:'memory',FILUMIRE_JHS_PREVIEW:'test-only',FILUMIRE_JHS_MODE:'private-presentation'});
const packet=buildIntegrationPacket();
for(const [grade,approved]of [[8,false],[9,true]] as const){
 const b=packet.bundles.find(b=>b.subjectId===`subject-gh-basic${grade}-english-ccp`)!;
 registerIsolatedJhsPreviewCompetency(b.competency);
 for(const record of b.content)saveContent(approved?{...record,metadata:{...record.metadata,educatorApproval:'approved',frenchApproval:'approved'}}:record);
 assert.equal(subjectSupportsSpacedRevision(b.subjectId,b.gradeId),approved,'Only reviewed required teacher banks can join automatic topics in spaced review');
}
console.log('PASS mixed automatic/trusted-review retention compatibility; pending teacher banks cannot unlock spaced review.');
