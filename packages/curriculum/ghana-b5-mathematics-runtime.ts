import type { CompetencyDefinition, ContentStandard, LearningIndicator, Strand, SubStrand } from "./index";
import { GHANA_B5_MATHEMATICS_ADAPTIVE_SPECS, GHANA_B5_MATHEMATICS_PUBLISHED_SPECS } from "./ghana-b5-mathematics-adaptive";

const CURRICULUM_ID = "curriculum-gh-math-pilot";
const EDUCATION_SYSTEM_ID = "education-system-gh-basic-pilot";
const LEVEL_ID = "level-gh-basic-5-pilot";
const SUBJECT_ID = "subject-gh-basic5-mathematics-pilot";

const strandNames: Record<string, string> = {"B5.1": "Number", "B5.2": "Algebra", "B5.3": "Geometry and Measurement", "B5.4": "Data"};
const subStrandNames: Record<string, string> = {"B5.1.1": "Counting, Representation and Cardinality", "B5.1.2": "Number Operations", "B5.1.3": "Fractions", "B5.1.4": "Decimals", "B5.1.5": "Percentages", "B5.2.1": "Patterns and Relationships", "B5.2.2": "Algebraic Expressions", "B5.2.3": "Variables and Equations", "B5.3.1": "Lines and Shapes", "B5.3.2": "Measurement: Perimeter, Area and Volume", "B5.3.3": "Measurement: Angles", "B5.3.4": "Geometric Reasoning", "B5.4.1": "Data Collection, Organisation, Presentation and Analysis", "B5.4.2": "Chance (Probability)"};
const standardTitles: Record<string, string> = {"B5.1.1.1": "Demonstrate understanding of whole numbers up to 1,000,000", "B5.1.1.2": "Recognise and convert Roman numerals up to 100", "B5.1.1.3": "Demonstrate understanding of factors, multiples and prime numbers", "B5.1.2.1": "Use mental strategies for multiplication and division facts", "B5.1.2.2": "Multiply whole numbers efficiently", "B5.1.2.3": "Demonstrate understanding of division facts", "B5.1.2.4": "Divide whole numbers efficiently", "B5.1.2.5": "Solve multi-step word problems with the four operations", "B5.1.2.6": "Demonstrate understanding of integers", "B5.1.3.1": "Demonstrate understanding of fractions and operations on them", "B5.1.4.1": "Demonstrate understanding of decimals and operations on them", "B5.1.5.1": "Demonstrate understanding of percentages", "B5.2.1.1": "Demonstrate understanding of patterns and relationships", "B5.2.2.1": "Demonstrate understanding of algebraic expressions", "B5.2.3.1": "Demonstrate understanding of variables and equations", "B5.3.1.1": "Demonstrate understanding of properties of squares, rectangles and regular polygons", "B5.3.2.1": "Calculate perimeter and surface area", "B5.3.2.2": "Demonstrate understanding of volume and capacity", "B5.3.3.3": "Demonstrate understanding of angles", "B5.3.4.1": "Describe position and motion using cardinal points", "B5.3.4.2": "Identify reflections of 2D shapes", "B5.4.1.1": "Demonstrate understanding of first-hand and second-hand data", "B5.4.1.2": "Draw and interpret double bar graphs", "B5.4.2.1": "Demonstrate understanding of chance and likelihood"};

const slug = (code: string): string => code.toLowerCase().replace(/\./g, "-");
const strandId = (code: string): string => `strand-gh-b5-mathematics-${slug(code)}`;
const subStrandId = (code: string): string => `substrand-gh-b5-mathematics-${slug(code)}`;
const standardId = (code: string): string => `standard-gh-b5-mathematics-${code}`;
const indicatorId = (code: string): string => `indicator-gh-b5-mathematics-${code}`;
const order = (code: string): number => Number(code.split(".").pop() ?? 0);

const usedStandards = new Set(GHANA_B5_MATHEMATICS_PUBLISHED_SPECS.map((spec) => spec.contentStandardCode));
const usedSubStrands = new Set(GHANA_B5_MATHEMATICS_PUBLISHED_SPECS.map((spec) => spec.subStrandCode));
const usedStrands = new Set(GHANA_B5_MATHEMATICS_PUBLISHED_SPECS.map((spec) => spec.strandCode));

export const GHANA_B5_MATHEMATICS_STRANDS: Strand[] = [...usedStrands].map((code) => ({
  id: strandId(code), subjectId: SUBJECT_ID, name: strandNames[code] ?? code, code, order: order(code),
}));

export const GHANA_B5_MATHEMATICS_SUBSTRANDS: SubStrand[] = [...usedSubStrands].map((code) => ({
  id: subStrandId(code), strandId: strandId(code.split(".").slice(0, 2).join(".")), name: subStrandNames[code] ?? code, code, order: order(code),
}));

export const GHANA_B5_MATHEMATICS_STANDARDS: ContentStandard[] = [...usedStandards].map((code) => ({
  id: standardId(code), subStrandId: subStrandId(code.split(".").slice(0, 3).join(".")), title: standardTitles[code] ?? code,
  description: `Ghana Basic 5 Mathematics content standard ${code}.`,
}));

export const GHANA_B5_MATHEMATICS_INDICATORS: LearningIndicator[] = GHANA_B5_MATHEMATICS_PUBLISHED_SPECS.map((spec) => ({
  id: indicatorId(spec.code), contentStandardId: standardId(spec.contentStandardCode), statement: spec.statement, order: order(spec.code),
}));

const published = new Set(GHANA_B5_MATHEMATICS_PUBLISHED_SPECS.map((spec) => spec.code));
const idFor = (code: string): string => {
  const spec = GHANA_B5_MATHEMATICS_ADAPTIVE_SPECS.find((item) => item.code === code);
  if (!spec) throw new Error(`Unknown Ghana B5 Mathematics indicator ${code}`);
  return spec.competencyId;
};
const onlyPublished = (codes: string[]): string[] => codes.filter((code) => published.has(code)).map(idFor);

export const GHANA_B5_MATHEMATICS_COMPETENCIES: CompetencyDefinition[] = GHANA_B5_MATHEMATICS_PUBLISHED_SPECS.map((spec) => ({
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
  successorCompetencyIds: GHANA_B5_MATHEMATICS_PUBLISHED_SPECS.filter((other) => other.prerequisiteCodes.includes(spec.code)).map((other) => other.competencyId),
  relatedCompetencyIds: onlyPublished(spec.relatedCodes),
  subskills: [...spec.subskills],
  misconceptions: [...spec.misconceptions],
  difficulty: spec.difficulty,
  masteryRequirements: { masteryThreshold: 0.8, confidenceThreshold: 0.8 },
  retentionRequirements: { required: true, confidenceThreshold: 0.8 },
  transferRequirements: { required: true, confidenceThreshold: 0.8 },
}));
