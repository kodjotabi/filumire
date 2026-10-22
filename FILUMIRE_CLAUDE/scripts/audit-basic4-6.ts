import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getAllCompetencies, getAllSubjects } from "../packages/curriculum";
import { getCurriculumNodesForSubject, getCompetencyMappingsForNode, getSubjectCapability } from "../packages/curriculum-framework";
import { seedContent } from "../services/content-store/seed";
import { getAllContent, getContentForCompetency } from "../services/content-store";
import { AUTHORED_COMPETENCY_IDS } from "../services/content-store/authored-index";

if (process.env.FILUMIRE_PERSISTENCE !== "memory") throw Error("Audit requires memory persistence");
seedContent();
const out = "docs/audits/basic4-6-completion";
const all = getAllCompetencies();
const summaries: any[] = [], rows: any[] = [], catalogues: any[] = [];
const sourceFiles = fs.readdirSync("services/content-store").filter((f) => f.includes("authored") && !f.includes("index") && f.endsWith(".ts")).map((file) => ({ file: `services/content-store/${file}`, text: fs.readFileSync(`services/content-store/${file}`, "utf8") }));
const csv = (data: any[]) => { const keys = [...new Set(data.flatMap(Object.keys))]; return [keys, ...data.map((row) => keys.map((key) => typeof row[key] === "object" ? JSON.stringify(row[key]) : row[key] ?? ""))].map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n") + "\n"; };
for (const grade of [4, 5, 6]) for (const discipline of ["english", "mathematics", "science", "computing"]) {
  const specPath = `packages/curriculum/ghana-b${grade}-${discipline}-${grade === 4 && discipline === "english" ? "production" : "adaptive"}.ts`;
  const mod = await import(pathToFileURL(path.resolve(specPath)).href);
  const specs = Object.entries(mod).find(([key]) => key.endsWith(grade === 4 && discipline === "english" ? "PRODUCTION_SPECS" : "ADAPTIVE_SPECS"))![1] as any[];
  const subject = getAllSubjects().find((s) => s.learningLevelId === `level-gh-basic-${grade}-pilot` && s.name.toLowerCase().replace(" language", "") === discipline)!;
  if (!subject) throw Error(`Missing subject ${grade} ${discipline}`);
  const runtime = all.filter((c) => c.subjectId === subject.id);
  const hierarchy = getCurriculumNodesForSubject(subject.id);
  const nodes = hierarchy.filter((n) => n.nodeType === "learning_indicator");
  const ancestry = (nodeId: string) => {
    const chain: any[] = [], visited = new Set<string>();
    let node = hierarchy.find((n) => n.id === nodeId);
    while (node && !visited.has(node.id)) {
      visited.add(node.id);
      chain.unshift({ id: node.id, type: node.nodeType, code: node.code, title: node.title, source: node.sourceReference });
      node = hierarchy.find((n) => n.id === node!.parentNodeId);
    }
    return chain;
  };
  const authored = grade === 4 ? new Set(AUTHORED_COMPETENCY_IDS) : new Set((await import(pathToFileURL(path.resolve(`services/content-store/authored-index-b${grade}-${discipline}.ts`)).href))[`AUTHORED_B${grade}_${discipline.toUpperCase()}_COMPETENCY_IDS`] as string[]);
  catalogues.push({ grade, discipline, specPath, specs });
  const expectedIds = new Set(specs.map((s) => s.competencyId));
  const subjectRows: any[] = [];
  for (const id of new Set([...expectedIds, ...runtime.map((c) => c.id)])) {
    const spec = specs.find((s) => s.competencyId === id), competency = runtime.find((c) => c.id === id);
    const content = getContentForCompetency(id);
    const links = nodes.flatMap((node) => getCompetencyMappingsForNode(node.id).filter((m) => m.competencyId === id).map((m) => ({ code: node.code, nodeId: node.id, title: node.title, relationship: m.relationship, source: node.sourceReference, hierarchy: ancestry(node.id) })));
    const expectedCodes = spec?.indicatorMappings?.map((m: any) => m.code) ?? (spec?.code ? [spec.code] : links.map((l) => l.code));
    const counts: any = {};
    for (const language of ["en", "fr"]) {
      const items = content.filter((c) => c.language === language);
      for (const type of ["lesson", "example", "practice", "scaffold", "remediation"]) counts[`${language}_${type}`] = items.filter((c) => c.type === type).length;
      counts[`${language}_guided_questions`] = items.filter((c) => c.type === "practice" && c.assessmentItemId && c.metadata?.expectedResponse !== undefined).length;
      for (const purpose of ["diagnostic", "reassessment", "retention", "transfer"]) {
        const questions = items.filter((c) => c.assessmentItemId && c.metadata?.assessmentPurpose === purpose);
        counts[`${language}_${purpose}`] = questions.length;
        counts[`${language}_${purpose}_automatic`] = questions.filter((c) => c.metadata?.expectedResponse !== undefined && c.metadata.evaluationMethod !== "trusted_rubric_evaluation").length;
        counts[`${language}_${purpose}_rubric`] = questions.filter((c) => c.metadata?.evaluationMethod === "trusted_rubric_evaluation").length;
      }
    }
    const authoredFiles = sourceFiles.filter((f) => f.text.includes(`"${id}"`)).map((f) => f.file);
    const fr = content.filter((c) => c.language === "fr"), en = content.filter((c) => c.language === "en");
    const sameBody = fr.filter((f) => en.some((e) => e.type === f.type && e.body.trim() === f.body.trim() && f.body.length > 30));
    const errors: string[] = [];
    if (!competency) errors.push("not_runtime_registered");
    if (!content.length) errors.push("no_seeded_content");
    if (!links.length) errors.push("unmapped_runtime_competency");
    if (expectedCodes.some((code: string) => !links.some((l) => l.code === code))) errors.push("catalogue_code_missing_framework_mapping");
    if (!counts.en_lesson || !counts.fr_lesson) errors.push("lesson_missing_language");
    if (!counts.en_example || !counts.fr_example) errors.push("worked_example_missing_language");
    if (!counts.en_guided_questions || !counts.fr_guided_questions) errors.push("scorable_guided_question_missing_language");
    if (!counts.en_retention || !counts.fr_retention) errors.push("retention_items_missing_language");
    if (!counts.en_transfer || !counts.fr_transfer) errors.push("transfer_items_missing_language");
    if (sameBody.length) errors.push("identical_en_fr_body_review");
    const bodies = content.map((c) => c.body).join("\n");
    const templateFlags = [/\bTODO\b|\bTBD\b|lorem ipsum|coming soon|placeholder/i.test(bodies) ? "placeholder_marker" : "", /demonstrate\(|which action best demonstrates|use the skill in a new situation/i.test(bodies) ? "generic_template_review" : ""].filter(Boolean);
    const record = { grade, subject: subject.name, discipline, competency_id: id, title: competency?.title ?? spec?.title, catalogue_present: !!spec,
      official_codes_claimed: expectedCodes, mapping_links: links, runtime_registered: !!competency, authored_index_member: authored.has(id), authored_source_files: authoredFiles,
      content_records: content.length, ...counts, french_status: !fr.length ? "missing" : sameBody.length ? "identical_body_review" : authored.has(id) || authoredFiles.length ? "separate_authored_fr_present_quality_unverified" : "generated_fr_present_quality_unverified",
      french_translation_links: fr.filter((c) => c.translationOfContentId).length,
      assessment_strategies: [...new Set(content.filter((c) => c.assessmentItemId).map((c) => c.assessmentStrategy))],
      assessment_representations: [...new Set(content.filter((c) => c.assessmentItemId).map((c) => c.metadata?.evidenceRepresentation ?? "unknown"))],
      misconception_ids: competency?.misconceptions ?? spec?.misconceptions ?? [],
      assessment_covered_subskills: [...new Set(content.flatMap((c) => { try { return JSON.parse(c.metadata?.targetSubskills ?? "[]"); } catch { return []; } }))],
      expected_subskills: competency?.subskills ?? spec?.subskills ?? [],
      prerequisite_ids: competency?.prerequisiteCompetencyIds ?? [],
      mastery: competency?.masteryRequirements ?? null, retention: competency?.retentionRequirements ?? null, transfer: competency?.transferRequirements ?? null,
      structural_status: !content.length || !competency ? "missing" : errors.length ? "partially_implemented" : "implemented_structure_only",
      source_alignment: "unverified_against_official_pages", educational_quality: "unverified", mastery_journey: "unverified_per_competency", retention_journey: "unverified_per_competency", transfer_journey: "unverified_per_competency",
      gaps: errors, review_flags: templateFlags, spec_file: specPath,
      evidence_content_ids: content.map((c) => c.id), versions: [...new Set(content.map((c) => c.version))],
    };
    rows.push(record); subjectRows.push(record);
  }
  const mappedCodes = new Set(nodes.filter((n) => getCompetencyMappingsForNode(n.id).length).map((n) => n.code));
  summaries.push({ grade, subject: subject.name, discipline, catalogue_competencies: specs.length, runtime_competencies: runtime.length, framework_indicator_nodes: nodes.length,
    mapped_indicator_codes: mappedCodes.size, authored_index_members: subjectRows.filter((r) => r.authored_index_member).length, with_content: subjectRows.filter((r) => r.content_records).length,
    bilingual_lessons: subjectRows.filter((r) => r.en_lesson && r.fr_lesson).length, bilingual_examples: subjectRows.filter((r) => r.en_example && r.fr_example).length,
    bilingual_scorable_guided_questions: subjectRows.filter((r) => r.en_guided_questions && r.fr_guided_questions).length,
    bilingual_retention_items: subjectRows.filter((r) => r.en_retention && r.fr_retention).length, bilingual_transfer_items: subjectRows.filter((r) => r.en_transfer && r.fr_transfer).length,
    structural_gaps: subjectRows.filter((r) => r.gaps.length).length, capability_label: getSubjectCapability(subject.id)?.status, source_verified: false,
    unmapped_indicator_nodes: nodes.filter((n) => !getCompetencyMappingsForNode(n.id).length).map((n) => ({ id: n.id, code: n.code, title: n.title })),
    duplicate_indicator_codes: [...new Set(nodes.filter((n, i) => nodes.findIndex((x) => x.code === n.code) !== i).map((n) => n.code))],
  });
}
fs.writeFileSync(`${out}/coverage-matrix.json`, JSON.stringify({ generatedAt: new Date().toISOString(), scope: "repository catalogue and actual seeded content; not a certified official indicator denominator", rows }, null, 2) + "\n");
fs.writeFileSync(`${out}/coverage-matrix.csv`, csv(rows));
fs.writeFileSync(`${out}/summary.json`, JSON.stringify(summaries, null, 2) + "\n");
fs.writeFileSync(`${out}/catalogues.json`, JSON.stringify(catalogues, null, 2) + "\n");
fs.writeFileSync(`${out}/seeded-content.json`, JSON.stringify(getAllContent().filter((c) => rows.some((r) => r.competency_id === c.competencyId)), null, 2) + "\n");
console.log(JSON.stringify({ competencies: rows.length, summaries }, null, 2));
