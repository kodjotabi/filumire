// Audit artefacts only. Reads the inventory produced by audit-basic4-6.ts.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const out = 'docs/audits/basic4-6-completion';
const read = name => JSON.parse(fs.readFileSync(`${out}/${name}`, 'utf8'));
const write = (name, data) => fs.writeFileSync(`${out}/${name}`, JSON.stringify(data, null, 2) + '\n');
const csv = rows => {
  const keys = [...new Set(rows.flatMap(Object.keys))];
  return [keys, ...rows.map(row => keys.map(k => typeof row[k] === 'object' ? JSON.stringify(row[k]) : row[k] ?? ''))]
    .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n') + '\n';
};
const matrix = read('coverage-matrix.json'), rows = matrix.rows, content = read('seeded-content.json');
const journeys = read('journey-results.json');
journeys.results = journeys.results.map(r => ({ ...r, scenario: r.scenario ?? 'repeated_mistakes' }));
write('journey-results.json', journeys);
const questions = content.filter(c => c.assessmentItemId);
const shared = new Map();
for (const row of rows) for (const link of row.mapping_links) {
  const key = `${row.grade}|${row.subject}|${link.code}`;
  const node = shared.get(key) ?? { grade: row.grade, subject: row.subject, code: link.code, node_id: link.nodeId,
    title: link.title, hierarchy: link.hierarchy, source_claim: link.source, official_pdf_page: null,
    source_status: 'repository_reference_only_official_pdf_page_unverified', competency_links: [] };
  node.competency_links.push({ competency_id: row.competency_id, relationship: link.relationship });
  shared.set(key, node);
}
const performance = {
  english: /\b(perform|recite|compose|write|handwriting|role.play|retell|tell|speak|read aloud|oral|aloud|listen|sing|present|debate|conversation)\b/i,
  mathematics: /\b(model|modelling|draw|construct|measure|measuring|investigate)\b/i,
  science: /\b(investigate|observe|classify|classifying|record|experiment|measure|conduct|design)\b/i,
  computing: /\b(use|create|insert|print|printing|format|draw|type|edit|enter|open|manage|apply|program|develop|design|copy|cut|paste|calculate|organise|upload|download|search|browse|present)\b/i,
};
const reviewQueue = [];
for (const row of rows) {
  const items = content.filter(c => c.competencyId === row.competency_id);
  row.missing_subskill_tags = row.expected_subskills.filter(s => !row.assessment_covered_subskills.includes(s));
  row.practical_or_productive_review_candidate = performance[row.discipline].test(row.title);
  row.review_flags = row.review_flags.filter(flag => flag !== 'placeholder_marker');
  row.review_flags = row.review_flags.filter(flag => !['explicit_placeholder_marker', 'declared_subskills_without_question_tags', 'productive_skill_assessment_review_candidate_not_official_requirement_verification', 'shared_official_code_preserve_legacy_ids_review_overlap'].includes(flag));
  if (items.some(c => /\bTODO\b|\bTBD\b|lorem ipsum|^coming soon$|\[placeholder\]/im.test(c.body))) row.review_flags.push('explicit_placeholder_marker');
  if (row.missing_subskill_tags.length) row.review_flags.push('declared_subskills_without_question_tags');
  if (row.practical_or_productive_review_candidate) row.review_flags.push('productive_skill_assessment_review_candidate_not_official_requirement_verification');
  const sharedCodes = row.mapping_links.filter(link => shared.get(`${row.grade}|${row.subject}|${link.code}`).competency_links.length > 1).map(link => link.code);
  row.shared_indicator_codes = sharedCodes;
  if (sharedCodes.length) row.review_flags.push('shared_official_code_preserve_legacy_ids_review_overlap');
  row.assessment_quality_status = 'partial_selected_response_present_productive_evidence_and_representation_review_required';
  row.authorship_status = row.authored_source_files.length ? 'explicit_authored_module_human_translation_approval_unverified' : 'generated_or_unverified';
  row.official_source_page = null;
  row.functional_status = 'implemented_structure_only';
  row.overall_completion_status = 'partially_implemented_pending_source_and_educational_verification';
  row.database_journey = 'unverified';
  row.browser_offline_journey = 'unverified_per_competency';
  row.sampled_journey_results = journeys.results.filter(j => j.competencyId === row.competency_id)
    .map(j => ({ scenario: j.scenario, language: j.language, checks: j.checks, error: j.error ?? null }));
  if (row.sampled_journey_results.length) {
    row.mastery_journey = 'verified_sampled_in_memory_paths_only';
    row.retention_journey = 'verified_sampled_due_delivery_and_correct_scoring_only';
    row.transfer_journey = 'verified_sampled_in_memory_paths_only';
  }
  reviewQueue.push({ grade: row.grade, subject: row.subject, competency_id: row.competency_id, title: row.title,
    source_reconciliation_required: true, educational_and_translation_review_required: true,
    missing_subskill_tags: row.missing_subskill_tags, productive_review_candidate: row.practical_or_productive_review_candidate,
    shared_codes: sharedCodes, source_files: row.authored_source_files });
}
const summaries = read('summary.json').map(s => {
  const group = rows.filter(r => r.grade === s.grade && r.subject === s.subject);
  return { ...s, source_reconciliation_pending: group.length, educator_review_pending: group.length,
    translation_review_pending: group.length, competencies_with_missing_subskill_tags: group.filter(r => r.missing_subskill_tags.length).length,
    productive_assessment_review_candidates: group.filter(r => r.practical_or_productive_review_candidate).length,
    sampled_api_competencies: group.filter(r => r.sampled_journey_results.length).length,
    remaining_unsampled_api_competencies: group.filter(r => !r.sampled_journey_results.length).length };
});
const invalid = [], translations = [], repetitions = [], encoding = [];
const seenQuestions = new Map();
for (const q of questions) {
  let options = []; try { options = JSON.parse(q.metadata?.options ?? '[]'); } catch { invalid.push({ id: q.id, reason: 'invalid_options_json' }); }
  if (q.assessmentStrategy === 'multiple_choice' && (options.length < 2 || new Set(options).size !== options.length || !options.includes(q.metadata?.expectedResponse))) invalid.push({ id: q.id, reason: 'options_or_expected_answer' });
  if (q.language === 'fr' && q.translationOfContentId) {
    const original = content.find(c => c.id === q.translationOfContentId);
    if (original) {
      const originalOptions = JSON.parse(original.metadata?.options ?? '[]');
      if (options.length !== originalOptions.length || options.indexOf(q.metadata?.expectedResponse) !== originalOptions.indexOf(original.metadata?.expectedResponse)) translations.push(q.id);
    }
  }
  const key = `${q.competencyId}|${q.language}|${q.body.trim()}|${q.metadata?.expectedResponse}`;
  if (seenQuestions.has(key)) repetitions.push({ id: q.id, previous: seenQuestions.get(key) });
  else seenQuestions.set(key, q.id);
}
for (const c of content) if (/\uFFFD|Ã©|Ã¨|â€™|â€œ/.test(c.body)) encoding.push(c.id);
const duplicates = [...shared.values()].filter(n => n.competency_links.length > 1);
write('indicator-matrix.json', [...shared.values()]);
fs.writeFileSync(`${out}/indicator-matrix.csv`, csv([...shared.values()]));
write('review-queue.json', reviewQueue);
write('summary.json', summaries);
write('coverage-matrix.json', matrix);
fs.writeFileSync(`${out}/coverage-matrix.csv`, csv(rows));
write('question-integrity.json', { invalid, translationAnswerIndexMismatches: translations, exactRepeatedQuestions: repetitions, encodingSuspects: encoding });
const samples = [];
for (const summary of summaries) {
  const group = rows.filter(r => r.grade === summary.grade && r.subject === summary.subject);
  for (const row of [group[0], group[Math.floor(group.length / 2)]]) samples.push({ grade: row.grade, subject: row.subject,
    competency_id: row.competency_id, title: row.title, scope: 'desk-review sample; not educator sign-off or official page reconciliation',
    cards: content.filter(c => c.competencyId === row.competency_id && ['lesson', 'example', 'remediation', 'practice'].includes(c.type)) });
}
write('quality-samples.json', samples);
const strategies = Object.fromEntries([...new Set(questions.map(q => q.assessmentStrategy))].map(s => [s, questions.filter(q => q.assessmentStrategy === s).length]));
const baseline = read('baseline.json');
const changedInheritedFiles = baseline.inheritedFiles.filter(f => crypto.createHash('sha256').update(fs.readFileSync(f.path)).digest('hex') !== f.sha256).map(f => f.path);
const authoritativeText = fs.readFileSync('docs/curriculum-sources/ghana/2019/ENGLISH-B4-indicators-authoritative.txt', 'utf8');
const textCodes = [...new Set(authoritativeText.match(/B4\.\d+\.\d+\.\d+\.\d+/g) ?? [])];
const mappedEnglish4 = rows.filter(r => r.grade === 4 && r.discipline === 'english').flatMap(r => r.official_codes_claimed);
const stats = { competencies: rows.length, catalogue_competencies: summaries.reduce((n, s) => n + s.catalogue_competencies, 0),
  framework_indicator_nodes: shared.size, content_records: content.length, questions: questions.length, strategies,
  seeded_trusted_rubric_questions: questions.filter(q => q.metadata?.evaluationMethod === 'trusted_rubric_evaluation').length,
  missing_representation_metadata_questions: questions.filter(q => !q.metadata?.evidenceRepresentation).length,
  missing_subskill_tag_competencies: rows.filter(r => r.missing_subskill_tags.length).length,
  productive_review_candidates_heuristic_only: rows.filter(r => r.practical_or_productive_review_candidate).length,
  shared_indicator_codes: duplicates, placeholders_found: rows.filter(r => r.review_flags.includes('explicit_placeholder_marker')).length,
  source_verified: false, official_denominator: null, bilingual_human_review_status: 'unverified',
  english_b4_existing_text_crosscheck: { unique_codes: textCodes.length, text_codes_without_mapping: textCodes.filter(c => !mappedEnglish4.includes(c)), mapped_codes_absent_from_text: mappedEnglish4.filter(c => !textCodes.includes(c)), limitation: 'existing text is not a verified PDF with page references' },
  sampled_api_competencies: new Set(journeys.results.map(r => r.competencyId)).size,
  api_cases: journeys.results.length, api_cases_without_failed_checks: journeys.results.filter(r => !r.error && Object.values(r.checks).every(s => s === 'verified')).length,
  inherited_files_verified_unchanged: baseline.inheritedFiles.length - changedInheritedFiles.length, changedInheritedFiles };
write('audit-statistics.json', stats);
assert.equal(new Set(rows.map(r => r.competency_id)).size, rows.length);
assert.equal(changedInheritedFiles.length, 0);
assert.equal(rows.filter(r => r.gaps.length).length, 0);
console.log(JSON.stringify({ competencies: rows.length, indicators: shared.size, strategies, missingSubskillTags: stats.missing_subskill_tag_competencies,
  productiveCandidates: stats.productive_review_candidates_heuristic_only, apiCases: stats.api_cases, apiPassed: stats.api_cases_without_failed_checks, changedInheritedFiles, summaries }, null, 2));
