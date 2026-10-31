import {
  getCompetenciesForSubject,
  getCompetency,
  getStrand,
  getSubStrand,
  type CompetencyDefinition,
} from "../../packages/curriculum";
import { getCcpBlockingSourceIssueIds } from "../../packages/curriculum/ghana-ccp-runtime";
import {
  getCurriculumNode,
  getCurriculumNodesForCompetency,
  getCurriculumNodesForSubject,
  getFrameworkCompetencyRegistrationsForSubject,
  type CurriculumNode,
} from "../../packages/curriculum-framework";
import { getContentForCompetency } from "../content-store";

/*
 * Teaching-first Phase 2: where a topic sits in its subject's
 * curriculum (strand -> sub-strand -> topic), for browsing topics
 * and showing learners where they are.
 *
 * Titles come from the official curriculum framework (NaCCA). A
 * topic is placed by its framework mapping, else by its strand and
 * sub-strand codes, else by the runtime curriculum's own names.
 */

export type NavigationLanguage = "en" | "fr";

export interface CurriculumPlace {
  key: string;
  code: string;
  title: string;
  /* The title's language: "en" when no French title exists yet. */
  language: NavigationLanguage;
  order: number;
}

export interface TopicPlacement {
  strand: CurriculumPlace;
  subStrand: CurriculumPlace;
}

/*
 * French titles of the Mathematics strands and sub-strands (Basic
 * 4-6). Other subjects keep their English titles, marked as English.
 */
const FRENCH_TITLES: Record<string, string> = {
  Algebra: "Algèbre",
  Data: "Données",
  "Geometry and Measurement": "Géométrie et mesure",
  Number: "Nombres",
  "Algebraic Expressions": "Expressions algébriques",
  "Chance (Probability)": "Hasard (probabilité)",
  "Chance or Probability": "Hasard ou probabilité",
  "Counting, Representation and Cardinality": "Compter, représenter et cardinalité",
  "Counting, Representation, Cardinality and Ordinality": "Compter, représenter, cardinalité et ordinalité",
  "Data Collection, Organisation, Presentation and Analysis": "Collecte, organisation, présentation et analyse des données",
  "Data Collection, Organisation, Presentation, Interpretation and Analysis": "Collecte, organisation, présentation, interprétation et analyse des données",
  Decimals: "Nombres décimaux",
  Fractions: "Fractions",
  "Functions and Unknowns": "Fonctions et inconnues",
  "Geometric Reasoning": "Raisonnement géométrique",
  "Lines and Shapes": "Lignes et formes",
  Measurement: "Mesure",
  "Measurement: Angles": "Mesure : les angles",
  "Measurement: Perimeter, Area and Volume": "Mesure : périmètre, aire et volume",
  "Number Operations": "Opérations sur les nombres",
  "Pattern and Relationships": "Suites et relations",
  "Patterns and Relationships": "Suites et relations",
  Percent: "Pourcentage",
  Percentages: "Pourcentages",
  "Position and Movement": "Position et déplacement",
  "Ratios and Proportion": "Rapports et proportions",
  "Three-Dimensional Shapes": "Solides",
  "Variables and Equations": "Variables et équations",
  "Whole Numbers: Counting and Representation": "Nombres entiers : compter et représenter",
  "Whole Numbers: Operations": "Nombres entiers : opérations",
};

function place(
  key: string,
  code: string,
  title: string,
  order: number,
  language: NavigationLanguage,
): CurriculumPlace {
  title = plainTitle(title);
  const french = language === "fr" ? FRENCH_TITLES[title] : undefined;
  return {
    key,
    code,
    title: french ?? title,
    language: french ? "fr" : "en",
    order,
  };
}

/* Source titles keep the PDF's line breaks; shown as one line of text. */
function plainTitle(title: string): string {
  return title.replace(/\s+/g, " ").trim();
}

function ancestors(node: CurriculumNode | undefined): CurriculumNode[] {
  const chain: CurriculumNode[] = [];
  while (node && chain.length < 10) {
    chain.push(node);
    node = node.parentNodeId ? getCurriculumNode(node.parentNodeId) : undefined;
  }
  return chain;
}

const frameworkByCode = new Map<string, Map<string, CurriculumNode>>();

function frameworkNodeByCode(subjectId: string, code: string | undefined) {
  if (!code) return undefined;
  let nodes = frameworkByCode.get(subjectId);
  if (!nodes) {
    nodes = new Map(
      getCurriculumNodesForSubject(subjectId)
        .filter((node) => node.code && (node.nodeType === "strand" || node.nodeType === "sub_strand"))
        .map((node) => [node.code!, node]),
    );
    frameworkByCode.set(subjectId, nodes);
  }
  return nodes.get(code);
}

function frameworkPlacement(competency: CompetencyDefinition) {
  const mapped = getCurriculumNodesForCompetency(competency.id).flatMap(ancestors);
  const mappedStrand = mapped.find((node) => node.nodeType === "strand");
  const mappedSubStrand = mapped.find((node) => node.nodeType === "sub_strand");
  if (mappedStrand && mappedSubStrand) {
    return { strand: mappedStrand, subStrand: mappedSubStrand };
  }

  const strand = frameworkNodeByCode(competency.subjectId, getStrand(competency.strandId)?.code);
  const subStrand = frameworkNodeByCode(competency.subjectId, getSubStrand(competency.subStrandId)?.code);
  return strand?.nodeType === "strand" && subStrand?.nodeType === "sub_strand"
    ? { strand, subStrand }
    : undefined;
}

export function topicPlacement(
  competency: CompetencyDefinition,
  language: NavigationLanguage = "en",
): TopicPlacement {
  const framework = frameworkPlacement(competency);
  if (framework) {
    return {
      strand: place(framework.strand.id, framework.strand.code ?? "", framework.strand.title, framework.strand.order, language),
      subStrand: place(framework.subStrand.id, framework.subStrand.code ?? "", framework.subStrand.title, framework.subStrand.order, language),
    };
  }

  const strand = getStrand(competency.strandId);
  const subStrand = getSubStrand(competency.subStrandId);
  return {
    strand: place(competency.strandId, strand?.code ?? "", strand?.name ?? "", strand?.order ?? 0, language),
    subStrand: place(competency.subStrandId, subStrand?.code ?? "", subStrand?.name ?? "", subStrand?.order ?? 0, language),
  };
}

/*
 * Curriculum titles are English; a French topic title comes from the
 * topic's authored French lesson, as in the FILU conversation context.
 */
export function localizedCompetencyTitle(
  competencyId: string,
  title: string,
  language: string | undefined,
): string {
  if (language !== "fr") return title;
  return getContentForCompetency(competencyId, "fr")
    .find((item) => !item.assessmentItemId && item.type === "lesson")?.title ?? title;
}

export interface CurriculumTopic {
  id: string;
  title: string;
  /* Position in the subject's learning sequence, from 1. */
  sequence: number;
  strand: CurriculumPlace;
  subStrand: CurriculumPlace;
}

/*
 * Every topic of a subject in its learning sequence, each with its
 * strand and sub-strand. Grouping is left to the screen.
 */
export function subjectTopics(
  subjectId: string,
  language: NavigationLanguage = "en",
): CurriculumTopic[] {
  return getCompetenciesForSubject(subjectId).map((competency, index) => ({
    id: competency.id,
    title: localizedCompetencyTitle(competency.id, competency.title, language),
    sequence: index + 1,
    ...topicPlacement(competency, language),
  }));
}

/*
 * An official learning goal (learning indicator) of the subject that
 * no FILUMIRE topic teaches yet. Read-only: it is never registered as
 * a competency, so it cannot enter the learning path, mastery totals
 * or reports, and it has no lesson to open.
 */
export interface UpcomingCurriculumGoal {
  /* The curriculum node id, not a competency id. */
  id: string;
  code: string;
  /* Official wording; there is no French version yet. */
  title: string;
  language: "en";
  /* Source order within the subject. */
  order: number;
  strand: CurriculumPlace;
  subStrand: CurriculumPlace;
}

export interface SubjectCurriculumCoverage {
  /* Official learning goals taught by at least one FILUMIRE topic. */
  available: number;
  /* available + upcoming.length: the goals the subject page lists. */
  total: number;
  upcoming: UpcomingCurriculumGoal[];
}

/*
 * How much of a subject's official curriculum FILUMIRE teaches. Every
 * learning indicator is either covered by a registered topic or listed
 * as upcoming, except a goal whose source wording still has an
 * unresolved issue: that one is left out until the source is settled.
 * Where every indicator has a topic (Basic 4-6), upcoming is empty.
 */
export function subjectCurriculumCoverage(
  subjectId: string,
  language: NavigationLanguage = "en",
): SubjectCurriculumCoverage {
  const covered = new Set<string>();
  for (const competency of getCompetenciesForSubject(subjectId)) {
    covered.add(competency.learningIndicatorId);
    for (const node of getCurriculumNodesForCompetency(competency.id)) covered.add(node.id);
  }
  const registrations = new Map(
    getFrameworkCompetencyRegistrationsForSubject(subjectId).map((registration) => [registration.curriculumNodeId, registration]),
  );
  let available = 0;
  const upcoming: UpcomingCurriculumGoal[] = [];
  for (const node of getCurriculumNodesForSubject(subjectId)) {
    if (node.nodeType !== "learning_indicator") continue;
    if (covered.has(node.id)) {
      available += 1;
      continue;
    }
    const registration = registrations.get(node.id);
    if (registration && getCcpBlockingSourceIssueIds(registration.sourceIssueIds).length) continue;
    const chain = ancestors(node);
    const strand = chain.find((item) => item.nodeType === "strand");
    const subStrand = chain.find((item) => item.nodeType === "sub_strand");
    if (!strand || !subStrand) continue;
    upcoming.push({
      id: node.id,
      code: node.code ?? "",
      title: plainTitle(registration?.title ?? node.title),
      language: "en",
      order: node.order,
      strand: place(strand.id, strand.code ?? "", strand.title, strand.order, language),
      subStrand: place(subStrand.id, subStrand.code ?? "", subStrand.title, subStrand.order, language),
    });
  }
  upcoming.sort((a, b) => a.order - b.order);
  return { available, total: available + upcoming.length, upcoming };
}

export function topicPlacementById(
  competencyId: string,
  language: NavigationLanguage = "en",
): TopicPlacement | undefined {
  const competency = getCompetency(competencyId);
  return competency ? topicPlacement(competency, language) : undefined;
}
