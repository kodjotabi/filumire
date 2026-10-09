import type { CompetencyDefinition, ContentStandard, LearningIndicator, Strand, SubStrand } from "./index";
import { GHANA_B6_MATHEMATICS_ADAPTIVE_SPECS, GHANA_B6_MATHEMATICS_PUBLISHED_SPECS } from "./ghana-b6-mathematics-adaptive";

const CURRICULUM_ID = "curriculum-gh-math-pilot";
const EDUCATION_SYSTEM_ID = "education-system-gh-basic-pilot";
const LEVEL_ID = "level-gh-basic-6-pilot";
const SUBJECT_ID = "subject-gh-basic6-mathematics-pilot";

const strandNames: Record<string, string> = {"B6.1": "Number", "B6.2": "Algebra", "B6.3": "Geometry and Measurement", "B6.4": "Data"};
const subStrandNames: Record<string, string> = {"B6.1.1": "Counting, Representation, Cardinality and Ordinality", "B6.1.2": "Number Operations", "B6.1.3": "Fractions", "B6.1.4": "Ratios and Proportion", "B6.2.1": "Pattern and Relationships", "B6.2.2": "Algebraic Expressions", "B6.2.3": "Variables and Equations", "B6.3.1": "Three-Dimensional Shapes", "B6.3.3": "Geometric Reasoning", "B6.4.1": "Data Collection, Organisation, Presentation, Interpretation and Analysis", "B6.4.2": "Chance or Probability"};
const standardTitles: Record<string, string> = {"B6.1.1.1": "Quantities and place value for multi-digit numerals up to 1 billion", "B6.1.1.2": "Roman numerals up to C (100)", "B6.1.1.3": "Factors, multiples and prime numbers from 1 to 100", "B6.1.2.1": "Mental mathematics strategies and number properties", "B6.1.2.2": "Multiplication of 2 or 3-digit numbers", "B6.1.2.3": "Basic division facts", "B6.1.2.4": "Division of 2 or 3-digit numbers by 1 or 2-digit numbers", "B6.1.2.5": "Word problems and mathematical sentences", "B6.1.2.6": "Integers", "B6.1.3.1": "Comparing, adding, subtracting and multiplying fractions", "B6.1.4.1": "Ratios and their relationship to fractions", "B6.1.4.2": "Proportion, ratios and rates", "B6.2.1.1": "Pattern rules and predictions", "B6.2.2.1": "Algebraic expressions", "B6.2.3.1": "Single-variable, one-step equations", "B6.3.1.1": "Prisms", "B6.3.3.5": "Position and single transformations", "B6.4.1.1": "Creating and interpreting line graphs", "B6.4.1.2": "Methods of collecting data", "B6.4.2.2": "Probability and possible outcomes"};

const slug = (code: string): string => code.toLowerCase().replace(/\./g, "-");
const strandId = (code: string): string => `strand-gh-b6-mathematics-${slug(code)}`;
const subStrandId = (code: string): string => `substrand-gh-b6-mathematics-${slug(code)}`;
const standardId = (code: string): string => `standard-gh-b6-mathematics-${code}`;
const indicatorId = (code: string): string => `indicator-gh-b6-mathematics-${code}`;
const order = (code: string): number => Number(code.split(".").pop() ?? 0);

const usedStandards = new Set(GHANA_B6_MATHEMATICS_PUBLISHED_SPECS.map((spec) => spec.contentStandardCode));
const usedSubStrands = new Set(GHANA_B6_MATHEMATICS_PUBLISHED_SPECS.map((spec) => spec.subStrandCode));
const usedStrands = new Set(GHANA_B6_MATHEMATICS_PUBLISHED_SPECS.map((spec) => spec.strandCode));

export const GHANA_B6_MATHEMATICS_STRANDS: Strand[] = [...usedStrands].map((code) => ({
  id: strandId(code), subjectId: SUBJECT_ID, name: strandNames[code] ?? code, code, order: order(code),
}));

export const GHANA_B6_MATHEMATICS_SUBSTRANDS: SubStrand[] = [...usedSubStrands].map((code) => ({
  id: subStrandId(code), strandId: strandId(code.split(".").slice(0, 2).join(".")), name: subStrandNames[code] ?? code, code, order: order(code),
}));

export const GHANA_B6_MATHEMATICS_STANDARDS: ContentStandard[] = [...usedStandards].map((code) => ({
  id: standardId(code), subStrandId: subStrandId(code.split(".").slice(0, 3).join(".")), title: standardTitles[code] ?? code,
  description: `Ghana Basic 6 Mathematics content standard ${code}.`,
}));

export const GHANA_B6_MATHEMATICS_INDICATORS: LearningIndicator[] = GHANA_B6_MATHEMATICS_PUBLISHED_SPECS.map((spec) => ({
  id: indicatorId(spec.code), contentStandardId: standardId(spec.contentStandardCode), statement: spec.statement, order: order(spec.code),
}));

const published = new Set(GHANA_B6_MATHEMATICS_PUBLISHED_SPECS.map((spec) => spec.code));
const idFor = (code: string): string => {
  const spec = GHANA_B6_MATHEMATICS_ADAPTIVE_SPECS.find((item) => item.code === code);
  if (!spec) throw new Error(`Unknown Ghana B6 Mathematics indicator ${code}`);
  return spec.competencyId;
};
const onlyPublished = (codes: string[]): string[] => codes.filter((code) => published.has(code)).map(idFor);

export const GHANA_B6_MATHEMATICS_COMPETENCIES: CompetencyDefinition[] = GHANA_B6_MATHEMATICS_PUBLISHED_SPECS.map((spec) => ({
  id: spec.competencyId,
  curriculumFrameworkId: CURRICULUM_ID,
  educationSystemId: EDUCATION_SYSTEM_ID,
  learningLevelId: LEVEL_ID,
  subjectId: SUBJECT_ID,
  strandId: strandId(spec.strandCode),
  subStrandId: subStrandId(spec.subStrandCode),
  contentStandardId: standardId(spec.contentStandardCode),
  learningIndicatorId: indicatorId(spec.code),
  title: spec.title,
  description: spec.description,
  prerequisiteCompetencyIds: onlyPublished(spec.prerequisiteCodes),
  successorCompetencyIds: GHANA_B6_MATHEMATICS_PUBLISHED_SPECS.filter((other) => other.prerequisiteCodes.includes(spec.code)).map((other) => other.competencyId),
  relatedCompetencyIds: onlyPublished(spec.relatedCodes),
  subskills: [...spec.subskills],
  misconceptions: [...spec.misconceptions],
  difficulty: spec.difficulty,
  masteryRequirements: { masteryThreshold: 0.8, confidenceThreshold: 0.8 },
  retentionRequirements: { required: true, confidenceThreshold: 0.8 },
  transferRequirements: { required: true, confidenceThreshold: 0.8 },
}));
