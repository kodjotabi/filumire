import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as f from '../packages/curriculum-framework';
import * as c from '../packages/curriculum';
import { GHANA_CCP_RUNTIME_ID, GHANA_CCP_EDUCATION_SYSTEM_ID } from '../packages/curriculum/ghana-ccp-runtime';
import generated from '../packages/curriculum-framework/ghana-b89-ccp-data.json';
import { getOrCreateLearnerLearningContext, requireSupportedGrade, getLearnerLearningContext } from '../services/learner-context';

const version = f.CURRICULUM_VERSION_GHANA_CCP_2020_ID;
assert.equal(f.getCurriculumVersion(version)?.runtimeFrameworkId, GHANA_CCP_RUNTIME_ID);
assert.notEqual(GHANA_CCP_RUNTIME_ID, c.GHANA_MATH_PILOT_CURRICULUM_ID);
assert.equal(c.getEducationSystem(GHANA_CCP_EDUCATION_SYSTEM_ID)?.curriculumFrameworkId, GHANA_CCP_RUNTIME_ID);
for (const [file, sha] of Object.entries(generated.inputHashes)) assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), sha);
const ids = new Set<string>();
let duplicates = 0;
for (const grade of [7, 8, 9]) {
  const gradeId = `level-gh-basic-${grade}-ccp`;
  assert.equal(c.getLearningLevel(gradeId)?.educationSystemId, GHANA_CCP_EDUCATION_SYSTEM_ID);
  assert.equal(f.getFrameworkGrade(gradeId)?.learnerVisibility, 'hidden');
  assert.deepEqual(f.getAvailableSubjectsForGrade(version, gradeId), []);
  const mapping = JSON.parse(readFileSync(`docs/curriculum-sources/ghana/ccp-b7-b9/basic${grade}-filumire-mapping.json`, 'utf8'));
  for (const subject of mapping.subjects) {
    const subjectId = subject.proposed_subject_id;
    assert(f.resolveCurriculumContext(version, gradeId, subjectId));
    assert.equal(f.resolveCurriculumContext(f.CURRICULUM_VERSION_GHANA_PILOT_V1_ID, gradeId, subjectId), undefined);
    assert.equal(c.getSubject(subjectId)?.learningLevelId, gradeId);
    assert.equal(f.getSubjectCapability(subjectId)?.status, 'unsupported');
    const codes = new Set<string>();
    for (const row of subject.entries) {
      const registration = f.getFrameworkCompetencyRegistration(row.proposed_competency_id)!;
      assert(registration);
      assert(!ids.has(registration.id)); ids.add(registration.id);
      assert.equal(registration.officialCode, row.source.original_printed_code);
      if (codes.has(registration.officialCode)) duplicates++;
      codes.add(registration.officialCode);
      assert.deepEqual(registration.sourceIssueIds, row.source_issue_ids);
      assert.deepEqual(registration.source.pdfPages, row.source.continuation_pdf_pages);
      assert.equal(registration.source.sha256, row.source.sha256);
      assert.equal(registration.gradeId, gradeId);
      assert.equal(registration.subjectId, subjectId);
      const indicator = f.getCurriculumNode(registration.curriculumNodeId)!;
      assert.equal(indicator.code, registration.officialCode);
      assert.equal(indicator.parentNodeId, registration.hierarchy.contentStandardId);
      for (const nodeId of Object.values(registration.hierarchy)) assert.equal(f.getCurriculumNode(nodeId)?.subjectId, subjectId);
      assert.equal(c.getCompetency(registration.id), undefined, 'Mapping alone cannot become teachable content');
      if (grade > 7) {
        assert.deepEqual(generated.competencies.find(r => r.id === registration.id)?.originalMapping, row, 'No source-specific flags lost');
        for (const issueId of registration.globalSourceIssueIds) assert(f.getCurriculumSourceIssue(issueId));
      }
    }
  }
}
assert.equal(ids.size, 625);
assert(duplicates > 0, 'Printed duplicates remain separately registered');
assert.deepEqual(f.getSupportedGradesForCurriculumVersion(version), []);
const before = await getOrCreateLearnerLearningContext('jhs-foundation-unchanged');
for (const grade of [7, 8, 9]) await assert.rejects(requireSupportedGrade(before.learnerId, `level-gh-basic-${grade}-ccp`));
assert.deepEqual(await getLearnerLearningContext(before.learnerId), before);
console.log(`PASS 625 source registrations, 12 subject placements, hidden grades, literal duplicates, lossless reviews and unchanged learner context`);
