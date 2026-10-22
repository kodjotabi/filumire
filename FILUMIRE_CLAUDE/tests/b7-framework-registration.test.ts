import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ccpSourcePath } from "./fixtures/ccp-source";
import { createHash } from "node:crypto";
import * as framework from "../packages/curriculum-framework";
import { getCompetency, getCompetenciesForSubject } from "../packages/curriculum";
import { LEARNER_GRADES } from "../apps/learner/components/filumire/grades";
import { subjectTopics, topicPlacementById } from "../services/curriculum-navigation";
import { getContentForCompetency } from "../services/content-store";
import {
  getOrCreateLearnerLearningContext, getLearnerLearningContext, requireSupportedGrade,
  setLearnerGrade, setActiveSubject, updateActiveCompetency, getCurrentCompetencyForSubject,
  LearnerContextValidationError,
} from "../services/learner-context";
import { buildLearningOverview } from "../apps/learner/app/api/learning/overview-data";

const directory = "docs/curriculum-sources/ghana/ccp-b7-b9";
const mapping = JSON.parse(readFileSync(`${directory}/basic7-filumire-mapping.json`, "utf8"));
const original = JSON.parse(readFileSync(`${directory}/basic7-curriculum-structure.json`, "utf8"));
const issues = JSON.parse(readFileSync(`${directory}/basic7-mapping-source-issues.json`, "utf8")).issues;
const version = framework.CURRICULUM_VERSION_GHANA_CCP_2020_ID;
const gradeId = framework.GRADE_GHANA_BASIC_7_CCP_ID;
const expected: Record<string, number> = { english: 53, mathematics: 74, computing: 55, science: 53 };
const ids = new Set<string>(), nodeIds = new Set<string>();
let duplicates = 0;
for (const subject of mapping.subjects) {
  const subjectId = subject.proposed_subject_id;
  const registrations = framework.getFrameworkCompetencyRegistrationsForSubject(subjectId);
  assert.equal(registrations.length, expected[subject.id]);
  assert.equal(framework.getSubjectCapability(subjectId)?.status, "unsupported");
  const resolved = framework.resolveCurriculumContext(version, gradeId, subjectId);
  assert(resolved, "Tooling can resolve the separate CCP structural context");
  assert.equal(framework.resolveCurriculumContext(framework.CURRICULUM_VERSION_GHANA_PILOT_V1_ID, gradeId, subjectId), undefined);
  assert.equal(framework.resolveCurriculumContext(version, framework.GRADE_GHANA_BASIC_4_ID, framework.SUBJECT_GHANA_BASIC4_MATH_ID), undefined);
  assert.equal(framework.getInitialCompetencyIdForResolvedContext(resolved), undefined);
  assert.deepEqual(getCompetenciesForSubject(subjectId), [], "Source registration must not become runtime teaching content");
  const nodes = framework.getCurriculumNodesForSubject(subjectId);
  for (const node of nodes) {
    assert(!nodeIds.has(node.id)); nodeIds.add(node.id);
    if (node.parentNodeId) assert.equal(framework.getCurriculumNode(node.parentNodeId)?.subjectId, subjectId);
    assert(node.sourceReference?.includes("sha256="));
    assert(node.source?.url.startsWith("https://nacca.gov.gh/"));
  }
  const byCode = new Map<string, string[]>();
  for (const row of subject.entries) {
    const registration = framework.getFrameworkCompetencyRegistration(row.proposed_competency_id);
    assert(registration);
    assert(!ids.has(registration.id)); ids.add(registration.id);
    assert.equal(registration.registrationStatus, "proposed");
    assert.equal(registration.learnerVisibility, "hidden");
    assert.equal(registration.curriculumVersionId, version);
    assert.equal(registration.gradeId, gradeId);
    assert.equal(registration.subjectId, subjectId);
    assert.equal(registration.officialCode, row.source.original_printed_code, "Exact printed code, including spaces and punctuation");
    assert.equal(registration.title, row.learning_indicator.statement);
    assert.equal(registration.sourceEntryId, row.entry_id);
    assert.equal(registration.source.localPath, row.source.path);
    assert.equal(registration.source.url, row.source.url);
    assert.equal(registration.source.sha256, row.source.sha256);
    assert.equal(createHash("sha256").update(readFileSync(ccpSourcePath(registration.source.localPath))).digest("hex"), registration.source.sha256);
    assert.deepEqual(registration.source.pdfPages, row.source.continuation_pdf_pages);
    assert.equal(registration.source.printedPage, row.source.printed_page);
    assert.deepEqual(registration.numbering, row.numbering);
    assert.equal(registration.mappingStatus, row.mapping_status);
    assert.deepEqual(registration.sourceIssueIds, row.source_issue_ids);
    assert.deepEqual(registration.review, row.review);
    assert.deepEqual(registration.phase8aReviewFlags, original.subjects.find((s: any) => s.id === subject.id).indicators.find((r: any) => r.entry_id === row.entry_id).flags);
    assert.deepEqual(registration.assessmentRequirements, row.assessment_requirements);
    const applicableGlobalIssues = issues.filter((i: any) => i.status === "unresolved" && i.affected_entries.length === 0 && (i.subject === "all" || i.subject === subject.id)).map((i: any) => i.id);
    assert.deepEqual(registration.globalSourceIssueIds, applicableGlobalIssues);
    for (const id of [...registration.sourceIssueIds, ...registration.globalSourceIssueIds]) assert.deepEqual(framework.getCurriculumSourceIssue(id), issues.find((i: any) => i.id === id));
    const indicator = framework.getCurriculumNode(registration.curriculumNodeId)!;
    assert.equal(indicator.code, row.source.original_printed_code);
    assert.equal(indicator.nodeType, "learning_indicator");
    assert.equal(indicator.parentNodeId, row.content_standard.proposed_node_id);
    assert(indicator.parentNodeId, "indicator has a content-standard parent");
    const standard = framework.getCurriculumNode(indicator.parentNodeId)!;
    assert.equal(standard.code, row.content_standard.official_code);
    assert.equal(standard.parentNodeId, row.sub_strand.proposed_node_id);
    assert(standard.parentNodeId, "standard has a sub-strand parent");
    const sub = framework.getCurriculumNode(standard.parentNodeId)!;
    assert.equal(sub.parentNodeId, row.strand.proposed_node_id);
    assert.equal(sub.officialTitle, row.sub_strand.title);
    const links = framework.getCompetencyMappingsForCompetency(registration.id);
    assert.equal(links.length, 1); assert.equal(links[0].curriculumNodeId, indicator.id);
    assert.deepEqual(framework.getCompetencyMappingsForNode(indicator.id), links);
    assert.deepEqual(framework.getCurriculumNodesForCompetency(registration.id).map(n => n.id), [indicator.id]);
    assert.equal(getCompetency(registration.id), undefined, "No unreviewed runtime difficulty, prerequisites or mastery requirements fabricated");
    assert.deepEqual(getContentForCompetency(registration.id), []);
    assert.equal(topicPlacementById(registration.id), undefined);
    const sameCode = byCode.get(registration.officialCode) ?? [];
    sameCode.push(registration.id); byCode.set(registration.officialCode, sameCode);
  }
  for (const group of byCode.values()) if (group.length > 1) { duplicates++; assert.equal(new Set(group).size, group.length); }
  for (const language of ["en", "fr"] as const) assert.deepEqual(subjectTopics(subjectId, language), []);
}
assert.equal(ids.size, 235); assert.equal(nodeIds.size, 400); assert.equal(duplicates, 3);
const missingTitle = [...nodeIds].map(id => framework.getCurriculumNode(id)!).filter(n => n.officialTitle === null);
assert.equal(missingTitle.length, 1); assert(missingTitle[0].reviewFlags?.includes("missing_official_sub_strand_title"));
assert.equal(framework.getFrameworkCompetencyRegistration("unknown"), undefined);
assert.deepEqual(framework.getFrameworkCompetencyRegistrationsForSubject("unknown"), []);
assert.equal(framework.getCurriculumVersion(version)?.isActive, false);
assert.equal(framework.getFrameworkGrade(gradeId)?.learnerVisibility, "hidden");
assert.equal(framework.getFrameworkGrade(gradeId)?.supportStatus, "unsupported");
assert(!LEARNER_GRADES.some(g => String(g.id) === gradeId));
for (const candidateVersion of [version, framework.CURRICULUM_VERSION_GHANA_PILOT_V1_ID, "unknown"]) {
  assert.equal(framework.isSupportedGrade(candidateVersion, gradeId), false);
  assert.deepEqual(framework.getAvailableSubjectsForGrade(candidateVersion, gradeId), []);
  assert(!framework.getSupportedGradesForCurriculumVersion(candidateVersion).some(g => g.id === gradeId));
}
// Defence in depth: activating only the version, or only changing grade visibility, cannot expose B7.
const v = framework.getCurriculumVersion(version)!, g = framework.getFrameworkGrade(gradeId)!;
try {
  v.isActive = true;
  assert.deepEqual(framework.getAvailableSubjectsForGrade(version, gradeId), []);
  g.learnerVisibility = "visible";
  assert.deepEqual(framework.getAvailableSubjectsForGrade(version, gradeId), []);
  assert.equal(framework.getInitialCompetencyIdForResolvedContext(framework.resolveCurriculumContext(version, gradeId, mapping.subjects[0].proposed_subject_id)!), undefined);
} finally { v.isActive = false; g.learnerVisibility = "hidden"; }

assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
const learnerId = "learner-b7-framework-isolation";
const before = await getOrCreateLearnerLearningContext(learnerId);
await assert.rejects(requireSupportedGrade(undefined, gradeId), LearnerContextValidationError);
await assert.rejects(requireSupportedGrade(learnerId, gradeId), LearnerContextValidationError);
await assert.rejects(setLearnerGrade(learnerId, gradeId, "guardian"), LearnerContextValidationError);
for (const subject of mapping.subjects) await assert.rejects(setActiveSubject(learnerId, subject.proposed_subject_id), LearnerContextValidationError);
await assert.rejects(updateActiveCompetency(learnerId, [...ids][0]), LearnerContextValidationError);
assert.deepEqual(await getLearnerLearningContext(learnerId), before, "Rejected placement/subject/topic choices leave existing context unchanged");
const forged = { ...before, curriculumVersionId: version, gradeId, activeSubjectId: mapping.subjects[0].proposed_subject_id };
assert.equal(getCurrentCompetencyForSubject(forged, forged.activeSubjectId), undefined);
for (const language of ["en", "fr"] as const) {
  const view = await buildLearningOverview(learnerId, before.activeSubjectId, language);
  assert(!JSON.stringify(view).includes(gradeId));
  assert(!view.availableSubjects.some(s => mapping.subjects.some((b7: any) => b7.proposed_subject_id === s.id)));
}
console.log("PASS Basic 7: 235 source registrations, 400 nodes, all source flags, duplicate codes and EN/FR visibility/placement restrictions");
