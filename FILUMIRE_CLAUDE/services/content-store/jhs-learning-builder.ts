import type { LearningContent } from "../../packages/content";
import type { CompetencyDefinition } from "../../packages/curriculum";
import type { FrameworkCompetencyRegistration } from "../../packages/curriculum-framework";
import { buildTopic, type Lesson, type Question } from "./authored-builder";
import { tx, type JhsPreviewUnit } from "./jhs-preview-units";

/** Shared record assembly; every objective, example and task is explicitly authored. */
export function buildJhsContent(units: JhsPreviewUnit[], sources: FrameworkCompetencyRegistration[], competencies: CompetencyDefinition[]): LearningContent[] {
return units.flatMap((unit, i) => {
  const s = sources[i], competency = competencies[i];
  const level = `b${s.gradeId.match(/basic-(\d)/)![1]}`;
  const lessons: Lesson[] = [
    { key: 'lesson', type: 'lesson', strategy: 'direct_explanation', title: unit.title, body: unit.explanation },
    { key: 'example', type: 'example', strategy: 'worked_example', title: tx('Worked example and activity', 'Exemple expliqué et activité'), body: unit.example },
    { key: 'scaffold', type: 'scaffold', strategy: 'step_by_step_scaffold', title: tx('Work through the reasoning', 'Suivre le raisonnement'), body: unit.correction },
    { key: 'remediation', type: 'remediation', strategy: 'error_analysis', title: tx('Review and try again', 'Revoir et réessayer'), body: unit.correction },
  ];
  function question(key: string, purpose?: Question['purpose'], n = 0): Question {
    return { key, purpose, title: tx('Knowledge check; performance requires review', 'Vérification des connaissances ; réalisation à examiner'),
      body: purpose === 'retention' ? unit.retention[n] : unit.question,
      options: purpose === 'retention' ? unit.retentionOptions[n] : unit.options, answer: 0,
      rules: { 1: [unit.misconception ?? 'confuses-related-concepts', 'conceptual_misunderstanding'], 2: [unit.misconception ?? 'confuses-related-concepts', 'conceptual_misunderstanding'] },
      code: s.officialCode, subskills: competency.subskills, criteria: ['Explain reasoning using independent work'], contexts: [key],
    };
  }
  const content = buildTopic({ competencyId: s.id, slug: `ccp-preview-${s.id}`, version: 'ccp-representative-1', level,
    source: `${s.source.url}#page=${s.source.pdfPages[0]}; SHA-256 ${s.source.sha256}`, defaultCode: s.officialCode }, lessons, question('practice'),
    (['diagnostic', 'reassessment', 'retention', 'transfer'] as const).flatMap(p => [0, 1].map(n => question(`${p}-${n + 1}`, p, n))));
  return content.map(item => {
    const metadata = { ...item.metadata, sourceDocumentSha256: s.source.sha256, sourcePdfPage: String(s.source.pdfPages[0]), authoringStatus: 'draft_representative_preview', educatorApproval: 'pending', frenchApproval: 'pending', sourceIssueIds: JSON.stringify([...s.sourceIssueIds, ...s.globalSourceIssueIds]) };
    if (item.type === 'practice') return { ...item, metadata: { ...metadata, evidenceIndependence: 'guided' } };
    const purpose = item.metadata?.assessmentPurpose;
    if (!purpose || purpose === 'retention') return { ...item, metadata };
    const n = item.id.includes(`${purpose}-1-`) ? 0 : 1;
    const task = (purpose === 'transfer' ? unit.transfer : unit.tasks)[n];
    const { options: _options, diagnosticRules: _rules, ...reviewMetadata } = metadata as Record<string, string>;
    const revision = purpose === 'reassessment' ? tx('After feedback, complete a fresh attempt independently. Explain your corrections. ', 'Après les remarques, réalise un nouvel essai autonome. Explique tes corrections. ')[item.language] : '';
    return { ...item, title: tx('Independent performance: teacher review required', 'Réalisation autonome : examen par l’enseignant requis')[item.language], body: revision + task[item.language], assessmentStrategy: 'constructed_response' as const,
      metadata: { ...reviewMetadata, expectedResponse: 'rubric_evaluated_performance', evaluationMethod: 'trusted_rubric_evaluation', responseMode: 'constructed_response', evidenceIndependence: 'independent', evidenceRepresentation: n === 0 ? 'contextual' : 'verbal', targetSubskills: JSON.stringify(competency.subskills),
        rubricStatus: 'authored_pending_educator_review', rubricCriteria: JSON.stringify([...unit.criteria.map(c => c[item.language]), tx('Inspect the actual independent work or hear the actual oral performance. Record assistance and incomplete work; do not infer competence from option selection or a submitted claim.', 'Examiner le vrai travail autonome ou écouter la vraie prestation orale. Noter les aides et les parties inachevées ; ne pas déduire une compétence d’un choix ou d’une simple déclaration.')[item.language]]) } };
  });

});
}
