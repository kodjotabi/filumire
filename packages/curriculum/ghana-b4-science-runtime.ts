import type {
  CompetencyDefinition,
  ContentStandard,
  LearningIndicator,
  Strand,
  SubStrand,
} from "./index";

import {
  GHANA_B4_SCIENCE_ADAPTIVE_SPECS,
} from "./ghana-b4-science-adaptive";

const CURRICULUM_ID = "curriculum-gh-math-pilot";
const EDUCATION_SYSTEM_ID = "education-system-gh-basic-pilot";
const LEVEL_ID = "level-gh-basic-4-pilot";
const SUBJECT_ID = "subject-gh-basic4-science-pilot";

const EXISTING_STRAND_CODE = "B4.1";
const EXISTING_SUBSTRAND_CODE = "B4.1.1";
const EXISTING_STANDARD_CODE = "B4.1.1.1";
const EXISTING_INDICATOR_CODE = "B4.1.1.1.1";

const strandNames: Record<string, string> = {
  "B4.1": "Diversity of Matter",
  "B4.2": "Cycles",
  "B4.3": "Systems",
  "B4.4": "Forces and Energy",
  "B4.5": "Humans and the Environment",
};

const subStrandNames: Record<string, string> = {
  "B4.1.1": "Living and Non-Living Things",
  "B4.1.2": "Materials",
  "B4.2.1": "Earth Science",
  "B4.2.2": "Life Cycles of Organisms",
  "B4.3.1": "The Human Body Systems",
  "B4.3.2": "The Solar System",
  "B4.3.3": "Ecosystem",
  "B4.4.1": "Sources and Forms of Energy",
  "B4.4.2": "Electricity and Electronics",
  "B4.4.3": "Forces and Movement",
  "B4.5.1": "Personal Hygiene and Sanitation",
  "B4.5.2": "Diseases",
  "B4.5.4": "Climate Change",
};

function strandId(code: string): string {
  return `strand-gh-b4-science-${code.toLowerCase().replace(/\./g, "-")}`;
}

function subStrandId(code: string): string {
  return `substrand-gh-b4-science-${code.toLowerCase().replace(/\./g, "-")}`;
}

function standardId(code: string): string {
  return `standard-gh-b4-science-${code}`;
}

function indicatorId(code: string): string {
  return `indicator-gh-b4-science-${code}`;
}

function numericOrder(code: string): number {
  const parts = code.split(".");
  return Number(parts[parts.length - 1] ?? 0);
}

const strandCodes = [
  ...new Set(
    GHANA_B4_SCIENCE_ADAPTIVE_SPECS.map(
      (spec) => spec.strandCode,
    ),
  ),
];

const subStrandCodes = [
  ...new Set(
    GHANA_B4_SCIENCE_ADAPTIVE_SPECS.map(
      (spec) => spec.subStrandCode,
    ),
  ),
];

const standardCodes = [
  ...new Set(
    GHANA_B4_SCIENCE_ADAPTIVE_SPECS.map(
      (spec) => spec.contentStandardCode,
    ),
  ),
];

export const GHANA_B4_SCIENCE_ADDITIONAL_STRANDS: Strand[] =
  strandCodes
    .filter((code) => code !== EXISTING_STRAND_CODE)
    .map((code) => ({
      id: strandId(code),
      subjectId: SUBJECT_ID,
      name: strandNames[code] ?? code,
      code,
      order: numericOrder(code),
    }));

export const GHANA_B4_SCIENCE_ADDITIONAL_SUBSTRANDS: SubStrand[] =
  subStrandCodes
    .filter((code) => code !== EXISTING_SUBSTRAND_CODE)
    .map((code) => {
      const parentCode = code.split(".").slice(0, 2).join(".");

      return {
        id: subStrandId(code),
        strandId:
          parentCode === EXISTING_STRAND_CODE
            ? "strand-gh-b4-science-diversity-of-matter"
            : strandId(parentCode),
        name: subStrandNames[code] ?? code,
        code,
        order: numericOrder(code),
      };
    });

export const GHANA_B4_SCIENCE_ADDITIONAL_STANDARDS: ContentStandard[] =
  standardCodes
    .filter((code) => code !== EXISTING_STANDARD_CODE)
    .map((code) => {
      const subCode = code.split(".").slice(0, 3).join(".");

      return {
        id: standardId(code),
        subStrandId:
          subCode === EXISTING_SUBSTRAND_CODE
            ? "substrand-gh-b4-science-living-nonliving-things"
            : subStrandId(subCode),
        title: `Science Content Standard ${code}`,
        description:
          `Legacy runtime bridge for Ghana Basic 4 Science content standard ${code}.`,
      };
    });

export const GHANA_B4_SCIENCE_ADDITIONAL_INDICATORS: LearningIndicator[] =
  GHANA_B4_SCIENCE_ADAPTIVE_SPECS
    .filter((spec) => spec.code !== EXISTING_INDICATOR_CODE)
    .map((spec) => ({
      id: indicatorId(spec.code),
      contentStandardId:
        spec.contentStandardCode === EXISTING_STANDARD_CODE
          ? "standard-gh-b4-science-b4.1.1.1"
          : standardId(spec.contentStandardCode),
      statement: spec.description,
      order: numericOrder(spec.code),
    }));

const prerequisiteByCode: Record<string, string[]> = {
  "B4.2.2.1.2": ["B4.2.2.1.1"],
  "B4.4.2.1.2": ["B4.4.2.1.1"],
};

const relatedByCode: Record<string, string[]> = {
  "B4.1.1.1.2": ["B4.1.1.1.1", "B4.1.1.2.3"],
  "B4.1.1.2.2": ["B4.2.2.1.1"],
  "B4.1.1.2.3": ["B4.1.1.1.1", "B4.1.1.1.2"],
  "B4.2.1.2.1": ["B4.3.2.1.1"],
  "B4.2.1.3.1": ["B4.4.1.1.1"],
  "B4.2.2.1.1": ["B4.1.1.2.2", "B4.2.2.1.2"],
  "B4.2.2.1.2": ["B4.2.2.1.1"],
  "B4.3.2.1.1": ["B4.2.1.2.1"],
  "B4.4.1.1.1": ["B4.2.1.3.1"],
  "B4.4.2.1.1": ["B4.4.2.1.2", "B4.4.2.2.1"],
  "B4.4.2.1.2": ["B4.4.2.1.1"],
  "B4.4.2.2.1": ["B4.4.2.1.1"],
  "B4.5.1.1.1": ["B4.5.1.1.2", "B4.5.2.1.1", "B4.5.2.1.2"],
  "B4.5.1.1.2": ["B4.5.1.1.1", "B4.5.4.1.1"],
  "B4.5.2.1.1": ["B4.5.1.1.1"],
  "B4.5.2.1.2": ["B4.5.1.1.1"],
  "B4.5.4.1.1": ["B4.5.1.1.2"],
};

function competencyIdForCode(code: string): string {
  const spec = GHANA_B4_SCIENCE_ADAPTIVE_SPECS.find(
    (item) => item.code === code,
  );

  if (!spec) {
    throw new Error(`Unknown Ghana B4 Science indicator ${code}`);
  }

  return spec.competencyId;
}

export const GHANA_B4_SCIENCE_ADDITIONAL_COMPETENCIES:
  CompetencyDefinition[] =
  GHANA_B4_SCIENCE_ADAPTIVE_SPECS
    .filter((spec) => spec.code !== EXISTING_INDICATOR_CODE)
    .map((spec) => ({
      id: spec.competencyId,

      curriculumFrameworkId: CURRICULUM_ID,
      educationSystemId: EDUCATION_SYSTEM_ID,
      learningLevelId: LEVEL_ID,
      subjectId: SUBJECT_ID,

      strandId:
        spec.strandCode === EXISTING_STRAND_CODE
          ? "strand-gh-b4-science-diversity-of-matter"
          : strandId(spec.strandCode),

      subStrandId:
        spec.subStrandCode === EXISTING_SUBSTRAND_CODE
          ? "substrand-gh-b4-science-living-nonliving-things"
          : subStrandId(spec.subStrandCode),

      contentStandardId:
        spec.contentStandardCode === EXISTING_STANDARD_CODE
          ? "standard-gh-b4-science-b4.1.1.1"
          : standardId(spec.contentStandardCode),

      learningIndicatorId: indicatorId(spec.code),

      title: spec.title,
      description: spec.description,

      prerequisiteCompetencyIds:
        (prerequisiteByCode[spec.code] ?? []).map(
          competencyIdForCode,
        ),

      successorCompetencyIds: GHANA_B4_SCIENCE_ADAPTIVE_SPECS.filter((candidate) => (prerequisiteByCode[candidate.code] ?? []).includes(spec.code)).map((candidate) => candidate.competencyId),

      relatedCompetencyIds:
        (relatedByCode[spec.code] ?? []).map(
          competencyIdForCode,
        ),

      subskills: [...spec.subskills],
      misconceptions: [...spec.misconceptions],

      difficulty: spec.difficulty,

      masteryRequirements: {
        masteryThreshold: 0.8,
        confidenceThreshold: 0.8,
      },

      retentionRequirements: {
        required: true,
        confidenceThreshold: 0.8,
      },

      transferRequirements: {
        required: true,
        confidenceThreshold: 0.8,
      },
    }));

