import type { CompetencyDefinition, ContentStandard, LearningIndicator, Strand, SubStrand } from "./index";
import { GHANA_B5_SCIENCE_ADAPTIVE_SPECS, GHANA_B5_SCIENCE_PUBLISHED_SPECS } from "./ghana-b5-science-adaptive";

const CURRICULUM_ID = "curriculum-gh-math-pilot";
const EDUCATION_SYSTEM_ID = "education-system-gh-basic-pilot";
const LEVEL_ID = "level-gh-basic-5-pilot";
const SUBJECT_ID = "subject-gh-basic5-science-pilot";

const strandNames: Record<string, string> = {"B5.1": "Diversity of Matter", "B5.2": "Cycles", "B5.3": "Systems", "B5.4": "Forces and Energy", "B5.5": "Humans and the Environment"};
const subStrandNames: Record<string, string> = {"B5.1.1": "Living and Non-Living Things", "B5.1.2": "Materials", "B5.2.1": "Earth Science", "B5.2.2": "Life Cycles of Organisms", "B5.3.1": "The Human Body Systems", "B5.3.2": "The Solar System", "B5.3.3": "Ecosystem", "B5.4.1": "Sources and Forms of Energy", "B5.4.2": "Electricity and Electronics", "B5.4.3": "Forces and Movement", "B5.5.1": "Personal Hygiene and Sanitation", "B5.5.2": "Diseases", "B5.5.3": "Science and Industry", "B5.5.4": "Climate Change"};
const standardTitles: Record<string, string> = {"B5.1.1.1": "Understand the physical features and life processes of living things and use this understanding to classify them", "B5.1.1.2": "Demonstrate understanding of the differences between living things, non-living things, and things which have never been alive", "B5.1.2.1": "Recognise materials as important resources for providing human needs", "B5.1.2.2": "Know that substances can exist in different physical states (solid, liquid, gas). Many substances can be changed from one state to another by heating or cooling", "B5.1.2.3": "Understand mixtures, the types, formation, uses and ways of separating them into their components", "B5.2.1.1": "Recognise that some events in our environment occur recurrently", "B5.2.1.2": "Recognise the relationship between the earth and the sun", "B5.2.1.3": "Show understanding of the roles of condensation, evaporation, transpiration and precipitation in the hydrological (water) cycle", "B5.2.1.4": "Demonstrate understanding of how carbon and nitrogen are cycled in nature", "B5.2.1.5": "Recognise water and air as important natural resources", "B5.2.2.1": "Demonstrate understanding of life cycle of a plant", "B5.3.1.1": "Recognise that different parts of the human body work interdependently to perform a specific function", "B5.3.2.1": "Show understanding of the orderliness of the sun, planets and satellites in the solar system, as well as the important role of the sun in the existence of the solar system", "B5.3.3.1": "Show understanding of ecosystem, interdependency of organisms in an ecosystem and appreciate the interactions", "B5.4.1.1": "Demonstrate understanding of the concept of energy, its various forms and sources and the ways in which it can be transformed and conserved", "B5.4.1.2": "Show understanding of the concept of heat energy in terms of its importance, effects, sources and transfer from one medium to another", "B5.4.2.1": "Demonstrate knowledge of generation of electricity, its transmission and transformation into other forms", "B5.4.3.1": "Know that movement is caused by applied forces due to the release of stored energy", "B5.5.1.1": "Recognise the importance of personal hygiene", "B5.5.1.2": "Identify, discuss and appreciate the natural and human features of the environment and the need to keep the environment clean", "B5.5.2.1": "Know common diseases of humans; causes, symptoms, effects and prevention", "B5.5.3.1": "Recognise the impact of science and technology in society", "B5.5.4.1": "Know that climate change is one of the most important environmental issues facing the world today"};

const slug = (code: string): string => code.toLowerCase().replace(/\./g, "-");
const strandId = (code: string): string => `strand-gh-b5-science-${slug(code)}`;
const subStrandId = (code: string): string => `substrand-gh-b5-science-${slug(code)}`;
const standardId = (code: string): string => `standard-gh-b5-science-${code}`;
const indicatorId = (code: string): string => `indicator-gh-b5-science-${code}`;
const order = (code: string): number => Number(code.split(".").pop() ?? 0);

const usedStandards = new Set(GHANA_B5_SCIENCE_PUBLISHED_SPECS.map((spec) => spec.contentStandardCode));
const usedSubStrands = new Set(GHANA_B5_SCIENCE_PUBLISHED_SPECS.map((spec) => spec.subStrandCode));
const usedStrands = new Set(GHANA_B5_SCIENCE_PUBLISHED_SPECS.map((spec) => spec.strandCode));

export const GHANA_B5_SCIENCE_STRANDS: Strand[] = [...usedStrands].map((code) => ({
  id: strandId(code), subjectId: SUBJECT_ID, name: strandNames[code] ?? code, code, order: order(code),
}));

export const GHANA_B5_SCIENCE_SUBSTRANDS: SubStrand[] = [...usedSubStrands].map((code) => ({
  id: subStrandId(code), strandId: strandId(code.split(".").slice(0, 2).join(".")), name: subStrandNames[code] ?? code, code, order: order(code),
}));

export const GHANA_B5_SCIENCE_STANDARDS: ContentStandard[] = [...usedStandards].map((code) => ({
  id: standardId(code), subStrandId: subStrandId(code.split(".").slice(0, 3).join(".")), title: standardTitles[code] ?? code,
  description: `Ghana Basic 5 Science content standard ${code}.`,
}));

export const GHANA_B5_SCIENCE_INDICATORS: LearningIndicator[] = GHANA_B5_SCIENCE_PUBLISHED_SPECS.map((spec) => ({
  id: indicatorId(spec.code), contentStandardId: standardId(spec.contentStandardCode), statement: spec.statement, order: order(spec.code),
}));

const published = new Set(GHANA_B5_SCIENCE_PUBLISHED_SPECS.map((spec) => spec.code));
const idFor = (code: string): string => {
  const spec = GHANA_B5_SCIENCE_ADAPTIVE_SPECS.find((item) => item.code === code);
  if (!spec) throw new Error(`Unknown Ghana B5 Science indicator ${code}`);
  return spec.competencyId;
};
const onlyPublished = (codes: string[]): string[] => codes.filter((code) => published.has(code)).map(idFor);

export const GHANA_B5_SCIENCE_COMPETENCIES: CompetencyDefinition[] = GHANA_B5_SCIENCE_PUBLISHED_SPECS.map((spec) => ({
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
  successorCompetencyIds: GHANA_B5_SCIENCE_PUBLISHED_SPECS.filter((other) => other.prerequisiteCodes.includes(spec.code)).map((other) => other.competencyId),
  relatedCompetencyIds: onlyPublished(spec.relatedCodes),
  subskills: [...spec.subskills],
  misconceptions: [...spec.misconceptions],
  difficulty: spec.difficulty,
  masteryRequirements: { masteryThreshold: 0.8, confidenceThreshold: 0.8 },
  retentionRequirements: { required: true, confidenceThreshold: 0.8 },
  transferRequirements: { required: true, confidenceThreshold: 0.8 },
}));
