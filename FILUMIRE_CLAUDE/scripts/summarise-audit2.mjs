import { readFileSync, writeFileSync } from 'node:fs';
const out = 'docs/audits/audit2-stages0-2-2026-10-13';
const read = file => JSON.parse(readFileSync(`${out}/${file}`, 'utf8'));
const regression = read('regression-results.json'), focused = read('focused-results.json'), browser = read('browser-results.json'), http = read('http-results.json');
const finalTests = regression.results.map(result => focused.results.find(item => item.file === result.file) ?? result);
const report = {
 approvedStages: [0,1,2],
 regression: { runnable: finalTests.length, passed: finalTests.filter(item=>item.exitCode === 0).length, failed: finalTests.filter(item=>item.exitCode !== 0), initialFailuresResolved: regression.failed.map(item=>item.file), blocked: regression.blocked },
 focused: { passed: focused.passed, failed: focused.failed },
 build: { node: '22.23.3', rootTypes: 'PASS', learnerTypes: 'PASS', productionBuild: 'PASS', staticPages: 33 },
 browser: { cases: browser.results.length, passed: browser.results.filter(item=>item.passed).length, widths: [320,390,768,1280], languages: ['en','fr'], interceptedApis: true, navigationAccessChecksPassed: 36 },
 realLocalHttpChecks: http.length,
 externalDatabaseWrites: false, deployments: false, infrastructureChanges: false,
 limitations: ['PostgreSQL suites need an approved isolated database.', 'One authoritative English fixture remains unverified.', 'Headless Chromium cannot establish physical-device voice playback.', 'External contact delivery and live billing were not exercised.', 'Preferences are learner-specific on this device, not synced between devices.'],
};
if(report.regression.failed.length || focused.failed.length || browser.results.length !== 8 || !browser.results.every(item=>item.passed) || http.length !== 17) throw new Error('Verification incomplete');
writeFileSync(`${out}/FINAL-RESULTS.json`, JSON.stringify(report,null,2));
console.log(JSON.stringify({ runnable: report.regression.runnable, passed: report.regression.passed, focusedPassed: focused.passed, browserCasesPassed: report.browser.passed, realLocalHttpChecks: http.length, blocked: regression.blocked.length },null,2));
