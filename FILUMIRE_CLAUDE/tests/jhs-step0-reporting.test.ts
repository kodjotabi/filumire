import assert from 'node:assert/strict';
import { PRIVATE_JHS_SCOPE } from '../packages/curriculum/jhs-private-policy';
import { getCompetency } from '../packages/curriculum';
import { getFrameworkCompetencyRegistration } from '../packages/curriculum-framework';
import { seedContent } from '../services/content-store/seed';
import { persistenceStore } from '../services/persistence-provider';
import { createInitialLearnerState, saveLearnerState } from '../services/learner-state';
import { saveLearnerLearningContext } from '../services/learner-context';
import { buildLearnerProgress } from '../services/learner-progress';
import { buildLearningOverview } from '../apps/learner/app/api/learning/overview-data';
import { buildAdultLearnerSummary } from '../services/adult-summary';
import { buildTeacherLearnerSummary } from '../services/teacher-summary';
import { getLearnerStates } from '../services/learner-state-store';
import { getEvidenceForLearner } from '../services/evidence-store';
import { getLearnerLearningContext } from '../services/learner-context';
import { GET as learningGET } from '../apps/learner/app/api/learning/route';
import { classifyProgress, PROGRESS_TEXT } from '../services/learner-progress/reporting';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

assert.equal(process.env.FILUMIRE_PERSISTENCE, 'memory');
process.env.FILUMIRE_JHS_MODE = 'private-presentation';
seedContent();
const definition = PRIVATE_JHS_SCOPE.map(row => getCompetency(row.competencyId)!)
  .find(c => c.assessmentScope === 'understanding_only')!;
const source = getFrameworkCompetencyRegistration(definition.id)!;
const learnerId = `fictional-jhs-reporting-${crypto.randomUUID()}`;
await persistenceStore.ensureLearnerExists(learnerId);
const state = createInitialLearnerState(learnerId, definition.id);
Object.assign(state.competencies[0], { evidenceCount: 9, masteryEstimate: .9, confidence: .9,
  readinessState: { readyForAdvancement: true, confidence: .9, reasonCode: 'MASTERY_RETENTION_TRANSFER_CONFIRMED', evaluatedAt: new Date().toISOString() } });
await saveLearnerState(state);
const context = { learnerId, curriculumVersionId: source.curriculumVersionId, gradeId: source.gradeId,
  activeSubjectId: definition.subjectId, activeCompetencyId: definition.id, updatedAt: new Date().toISOString() };
await saveLearnerLearningContext(context);
const progress = await buildLearnerProgress(learnerId, context);
assert.equal(progress.mastery.understandingMasteredCompetencies, 1);
assert.equal(progress.mastery.masteredCompetencies, 0);
for (const language of ['en', 'fr'] as const) {
  const overview = await buildLearningOverview(learnerId, definition.subjectId, language);
  assert.equal(overview.subjects[definition.subjectId].completed, progress.mastery.masteredCompetencies,
    'Step 0: learner overview must not present understanding-only success as full mastery; parent and learner totals must agree');
}
Object.assign(globalThis, { React });
const { ProgressPage } = await import('../apps/learner/components/filumire/ProgressPage');
const { ParentProgress } = await import('../apps/learner/components/filumire/ParentProgress');
const { SubjectPage } = await import('../apps/learner/components/filumire/SubjectPage');
const { ProgressStatus, ProgressBreakdown } = await import('../apps/learner/components/filumire/ProgressStatus');
const { toFilumireSubjects } = await import('../apps/learner/components/filumire/subjects');
const definitions = PRIVATE_JHS_SCOPE.map(row => getCompetency(row.competencyId)!);
let understandingTopicsChecked = 0;
for (const gradeId of new Set(definitions.map(c => c.learningLevelId))) {
  const topics = definitions.filter(c => c.learningLevelId === gradeId);
  const understanding = topics.filter(c => c.assessmentScope === 'understanding_only');
  const full = topics.filter(c => c.assessmentScope !== 'understanding_only');
  assert(understanding.length && full.length >= 2);
  understandingTopicsChecked += understanding.length;
  const learnerId = `fictional-jhs-reporting-${gradeId}-${crypto.randomUUID()}`;
  await persistenceStore.ensureLearnerExists(learnerId);
  const composite = createInitialLearnerState(learnerId, full[0].id);
  composite.competencies = topics.map(c => {
    const row = createInitialLearnerState(learnerId, c.id).competencies[0];
    if (c.assessmentScope === 'understanding_only' || c.id === full[0].id) Object.assign(row, {
      masteryEstimate: .9, confidence: .9, evidenceCount: 9,
      readinessState: { readyForAdvancement: true, confidence: .9, reasonCode: 'MASTERY_RETENTION_TRANSFER_CONFIRMED', evaluatedAt: new Date().toISOString() },
    });
    else if (c.id === full[1].id) Object.assign(row, {
      masteryEstimate: .95, confidence: .95, evidenceCount: 6, masteredAt: '2026-10-01T09:00:00.000Z',
      readinessState: { readyForAdvancement: false, confidence: .5, reasonCode: 'ACQUIRED_RETENTION_PENDING_MOVE_ON', evaluatedAt: new Date().toISOString() },
    });
    else if (c.id === full[2]?.id) Object.assign(row, { masteryEstimate: .99, confidence: .99, evidenceCount: 4 });
    return row;
  });
  // Put another topic first to exercise read-only current-topic selection.
  composite.competencies.sort((a, b) => Number(b.competencyId === full[0].id) - Number(a.competencyId === full[0].id));
  const source = getFrameworkCompetencyRegistration(understanding[0].id)!;
  const context = { learnerId, curriculumVersionId: source.curriculumVersionId, gradeId,
    activeSubjectId: understanding[0].subjectId, activeCompetencyId: understanding[0].id, updatedAt: new Date().toISOString() };
  await saveLearnerLearningContext(context);
  const snapshot = async () => structuredClone({
    states: await getLearnerStates(learnerId), evidence: await getEvidenceForLearner(learnerId),
    pending: await persistenceStore.getPendingTeacherReviews(learnerId), context: await getLearnerLearningContext(learnerId),
  });
  for (const scenario of ['confirmed', 'provisional'] as const) {
    const active = composite.competencies.find(c => c.competencyId === understanding[0].id)!;
    if (scenario === 'provisional') {
      active.readinessState!.readyForAdvancement = false;
      active.masteredAt = '2026-10-01T09:00:00.000Z';
    }
    await saveLearnerState(composite);
    const before = await snapshot();
    const rollup = await buildLearnerProgress(learnerId, context);
    const expectedUnderstanding = understanding.length - Number(scenario === 'provisional');
    assert.equal(rollup.mastery.masteredCompetencies, 1);
    assert.equal(rollup.mastery.understandingMasteredCompetencies, expectedUnderstanding);
    assert.equal(rollup.mastery.provisionalCompetencies, scenario === 'confirmed' ? 1 : 2);
    const teacher = await buildTeacherLearnerSummary(learnerId);
    assert.deepEqual(teacher.progress, rollup);
    const teacherTopics = teacher.subjects.flatMap(s => s.competencies);
    for (const topic of topics) {
      const row = composite.competencies.find(c => c.competencyId === topic.id)!;
      const expected = classifyProgress({ mastered: Boolean(row.readinessState?.readyForAdvancement),
        provisional: Boolean(row.masteredAt), evidenceCount: row.evidenceCount }, topic.assessmentScope);
      assert.equal(teacherTopics.find(c => c.competencyId === topic.id)?.progressStatus, expected);
    }
    for (const language of ['en', 'fr'] as const) {
      const text = PROGRESS_TEXT[language];
      const parent = await buildAdultLearnerSummary(learnerId, language);
      assert.equal(parent.progressStatus, scenario === 'confirmed' ? 'understanding_only' : 'provisional');
      assert.deepEqual(parent.progress, rollup);
      assert(parent.assessmentScopeNote);
      const overview = await buildLearningOverview(learnerId, context.activeSubjectId, language);
      for (const subject of rollup.subjects) {
        assert.equal(overview.subjects[subject.subjectId].completed, subject.masteredCompetencies);
        assert.equal(overview.subjects[subject.subjectId].understandingOnly, subject.understandingMasteredCompetencies);
        assert.equal(overview.subjects[subject.subjectId].provisional, subject.provisionalCompetencies);
      }
      for (const area of overview.areas) {
        assert.equal(area.status === 'completed', area.progressStatus === 'mastered');
      }
      const response = await learningGET(new Request('http://localhost/api/learning?dashboard=1', {
        headers: { 'x-filumire-learner-id': learnerId, 'x-filumire-language': language },
      }));
      assert.equal(response.status, 200);
      const dashboard = (await response.json()).progress;
      assert.equal(dashboard.activeCompetencyId, understanding[0].id);
      assert.equal(dashboard.progressStatus, parent.progressStatus);
      assert.equal(dashboard.readiness, scenario === 'confirmed', 'raw engine readiness is preserved');
      assert.equal(dashboard.completedCompetencies, 1);
      assert.equal(dashboard.understandingOnlyCompetencies, expectedUnderstanding);
      assert.equal(dashboard.provisionalCompetencies, rollup.mastery.provisionalCompetencies);
      const uiSnapshot = structuredClone({ overview, rollup, teacher });
      const learnerHtml = renderToStaticMarkup(React.createElement(ProgressPage, {
        language, overview, renderIcon: () => null, band: 'junior-high',
        current: { subjectName: '', title: 'Fictional topic', mastery: .9, confidence: .9, evidenceCount: 9,
          readiness: dashboard.readiness, progressStatus: dashboard.progressStatus, assessmentScope: dashboard.assessmentScope, learnHref: '/learn' },
      }));
      const parentHtml = renderToStaticMarkup(React.createElement(ParentProgress, { language, progress: rollup, gradeLabel: gradeId }));
      const teacherHtml = renderToStaticMarkup(React.createElement(React.Fragment, null,
        React.createElement(ProgressBreakdown, { language, full: teacher.progress!.mastery.masteredCompetencies,
          understandingOnly: teacher.progress!.mastery.understandingMasteredCompetencies, provisional: teacher.progress!.mastery.provisionalCompetencies }),
        React.createElement(ProgressStatus, { language, status: parent.progressStatus! })));
      for (const html of [learnerHtml, parentHtml, teacherHtml]) {
        assert(html.includes(text.mastered) && html.includes(text.understanding_only) && html.includes(text.provisional));
        assert(html.includes(`${text.mastered}: <strong>1</strong>`), 'rendered full mastery count is scope-aware');
      }
      assert(learnerHtml.includes(`data-progress-status="${parent.progressStatus}"`));
      const subjectHtml = renderToStaticMarkup(React.createElement(SubjectPage, {
        language, overview, subject: toFilumireSubjects(overview.availableSubjects).find(s => s.subjectId === context.activeSubjectId)!,
        currentTitle: '', learnHref: '/learn', icon: null, footer: null,
      }));
      assert(subjectHtml.includes(`data-progress-status="${parent.progressStatus}"`));
      assert.deepEqual({ overview, rollup, teacher }, uiSnapshot, 'rendering does not mutate server data');
    }
    assert.deepEqual(await snapshot(), before, 'all reporting reads preserve historical state, evidence, pending reviews and context');
  }
}
assert.equal(understandingTopicsChecked, 9);
assert.equal(classifyProgress({ mastered: false, evidenceCount: 20 }), 'in_progress', 'high activity never creates mastery');
console.log('PASS all nine understanding-only topics across Basic 7–9; EN/FR learner, parent and teacher counts/status/rendering; full/provisional/high-score controls; reporting reads preserve records');
