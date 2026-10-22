import fs from 'node:fs';
import assert from 'node:assert/strict';
const dir = 'docs/jhs-development/';
const json = file => JSON.parse(fs.readFileSync(dir + file, 'utf8'));
const log = file => { const bytes = fs.readFileSync(dir + file); return bytes[0] === 255 && bytes[1] === 254 ? bytes.toString('utf16le').replace(/^\uFEFF/, '') : bytes.toString('utf8').replace(/^\uFEFF/, ''); };
const suites = [...log('preview-validation-final.log').matchAll(/^PASS ([a-z0-9-]+) \(/gm)].map(m => m[1]);
assert.equal(new Set(suites).size, 17); assert(log('preview-validation-final.log').includes('PASS: all 17 offline suites'));
const journeys = json('representative-journeys.json'), legacy = json('batch01-journeys.json'), browser = json('representative-browser/results.json');
assert.equal(journeys.length, 56); assert(journeys.every(r => r.passed));
assert.equal(legacy.length, 12); assert(legacy.every(r => r.passed));
assert.equal(browser.length, 56); assert(browser.every(r => r.status === 'PASS'));
assert.equal(new Set(browser.map(r => `${r.competencyId}:${r.language}:${r.width}`)).size, 56);
assert.equal(new Set(journeys.map(r => `${r.competencyId}:${r.language}:${r.retentionOutcome}`)).size, 56);
assert.equal(new Set(journeys.map(r => `${r.gradeId}:${r.subjectId}`)).size, 12);
assert.equal(log('typescript-final-approved.log').trim(), '');
const build = log('production-build-final.log'); assert(build.includes('Compiled successfully')); assert(build.includes('/placement')); assert(!build.includes('Build error occurred')); assert(build.includes('prerendered as static content'));
const matrix = json('preview-competency-matrix.json').rows;
assert.equal(matrix.length, 625); assert.equal(matrix.filter(r => r.authoredDraft).length, 14);
assert.equal(matrix.filter(r => r.apiValidated && r.browserValidated).length, 14); assert(matrix.every(r => !r.releaseApproved && !r.publicActive));
const sources = json('preview-source-review/results.json'); assert.equal(sources.length, 14); assert(sources.every(r => r.printedCodeVerified));
assert(json('preview-serve-smoke.json').passed);
const result = { capturedAt: new Date().toISOString(), suites: { passed: 17, failed: 0, names: suites },
  representativeApiCases: { passed: 56, failed: 0, indicators: 14, gradeSubjectCombinations: 12, languages: ['en', 'fr'], retentionOutcomes: ['correct', 'incorrect'], teacherDecisions: 'fictional test fixtures; not educational approval' },
  legacyMaterialsApiCases: { passed: 12, failed: 0 }, browserCases: { passed: 56, failed: 0, widths: [390, 1280], scope: 'test harness with existing components and real signed-session APIs; not production /learn' },
  typescript: { passed: true, exitCode: 0 }, productionBuild: { passed: true, exitCode: 0, fontConfigurationChanged: false, intermittentFontRootCause: 'not reproduced/captured; cold-cache recurrence not excluded' },
  curriculum: { mapped: 625, authoredDraft: 14, isolatedApiAndBrowserValidated: 14, remainingAuthoring: 611, releaseApproved: 0 },
  sourceProof: { pinnedDocuments: 4, leadingIndicatorPagesRendered: 13, indicatorCodesVerified: 14, educationalApproval: 'pending' },
  compatibility: 'All 12 Basic 4–6 fingerprints passed: definitions, hierarchy, mappings, bilingual navigation/content; no reauthoring',
  limitations: ['Source authenticity/assessment-reference and existing mapping flags unresolved', 'Educator and French review pending', 'Real PostgreSQL and cold-start service-worker JHS offline flow unverified', 'Production JHS learner/parent/teacher interface integration remains inactive', 'Six missing payment suites are a separate inherited branch dependency', 'Original intermittent font URL parse failure has no proven permanent fix'],
};
fs.writeFileSync(dir + 'preview-validation-summary.json', JSON.stringify(result, null, 2) + '\n');
console.log('PASS validated summary: 17 suites, 56 representative API cases, 12 legacy API cases, 56 browser cases, TypeScript and production build; 14 drafts, 611 not authored, 0 release-approved.');
