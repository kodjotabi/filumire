import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const profiles = {
  'batch02-b7-science-foundations': { indicators:13, suites:20, regressionLog:'regressions.log' },
  'batch03-b7-science-systems': { indicators:9, suites:11, regressionLog:'regressions.log' },
  'batch04-b7-science-energy': { indicators:6, suites:13, regressionLog:'regressions-final.log' },
};
const id = process.argv[2] ?? 'batch02-b7-science-foundations';
const profile = profiles[id]; assert(profile, 'Unknown batch validation profile');
const dir = `docs/jhs-development/completion/${id}/`, expectedCases=profile.indicators*4;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const log = file => { const bytes = fs.readFileSync(file); return bytes[0] === 255 && bytes[1] === 254 ? bytes.toString('utf16le').replace(/^\uFEFF/, '') : bytes.toString('utf8').replace(/^\uFEFF/, ''); };
const matrix = read('docs/jhs-development/completion/competency-matrix.json').rows;
assert.equal(matrix.length, 625); assert.equal(new Set(matrix.map(r => r.competencyId)).size, 625);
const rows = matrix.filter(r => r.batch === id); assert.equal(rows.length, profile.indicators); assert(rows.every(r => r.technicallyValidated && !r.releaseApproved && !r.publicActive));
const api = read(dir + 'journeys.json'), browser = read(dir + 'browser/results.json');
assert.equal(api.length, expectedCases); assert(api.every(r => r.passed));
assert.equal(browser.length, expectedCases); assert(browser.every(r => r.status === 'PASS'));
for (const row of rows) {
  assert.equal(api.filter(r => r.competencyId === row.competencyId && r.contentFingerprint === row.contentFingerprint).length, 4);
  assert.equal(browser.filter(r => r.competencyId === row.competencyId && r.contentFingerprint === row.contentFingerprint).length, 4);
}
const regressions=log(dir+profile.regressionLog);
assert(regressions.includes(`PASS: all ${profile.suites} offline suites`));
assert.equal(new Set([...regressions.matchAll(/^PASS ([a-z0-9-]+) \(/gm)].map(m=>m[1])).size,profile.suites);
assert(!/^FAIL /m.test(regressions));
assert.equal(log(dir + 'typescript.log').trim(), '');
const build = log(dir + 'production-build.log'); assert(build.includes('Compiled successfully')); assert(build.includes('prerendered as static content')); assert(!build.includes('Build error occurred'));
const sources = read(dir + 'source-review/results.json'); assert.equal(sources.length, profile.indicators); assert(sources.every(r => r.printedCodeVerified));
const lineage = read('docs/jhs-development/lineage-manifest.json');
const originChecks = lineage.records.map(r => ({path:r.path, sha256:r.sha256, unchanged:fs.existsSync(r.origin) && createHash('sha256').update(fs.readFileSync(r.origin)).digest('hex') === r.sha256}));
const backlog = matrix.filter(r => r.blockingSourceIssues.length).map(r => ({competencyId:r.competencyId,grade:r.grade,subject:r.subject,officialCodeAsPrinted:r.officialCodeAsPrinted,source:r.source,hierarchy:r.hierarchy,blockingSourceIssues:r.blockingSourceIssues,sourceIssueIds:r.sourceIssueIds,globalSourceIssueIds:r.globalSourceIssueIds}));
fs.writeFileSync('docs/jhs-development/completion/unresolved-source-rows.json', JSON.stringify(backlog,null,2)+'\n');
const result = { batch:id, sourceIndicators:profile.indicators, newBilingualRecords:profile.indicators*26, apiCasesPassed:expectedCases, apiCasesFailed:0, browserCasesPassed:expectedCases, browserCasesFailed:0,
  regressionSuitesPassed:profile.suites, regressionSuitesFailed:0, typescriptPassed:true, productionBuildPassed:true,
  aggregate:{mapped:625,authoredDraft:matrix.filter(r=>r.authoredDraft).length,technicallyValidated:matrix.filter(r=>r.technicallyValidated).length,remainingAuthoring:matrix.filter(r=>!r.authoredDraft).length,unresolvedSourceRows:backlog.length,releaseApproved:0},
  inheritedOrigins:originChecks, programmeComplete:false, fullClaudeIntegrationHandoverReady:false,
  limitations:['All content remains draft and hidden; educator/French approval not supplied','Fictional teacher decisions test mechanics, not real productive/practical competence','Real database, full service-worker offline flow, subject-wide sequencing and production JHS interfaces require later validation'] };
fs.writeFileSync(dir+'validation.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({ ...result, inheritedOrigins:`${originChecks.filter(r=>r.unchanged).length}/${originChecks.length} match their carried hashes` },null,2));
