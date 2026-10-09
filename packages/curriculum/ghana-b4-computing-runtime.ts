import type {
  CompetencyDefinition,
  ContentStandard,
  LearningIndicator,
  Strand,
  SubStrand,
} from "./index";
import { GHANA_B4_COMPUTING_ADAPTIVE_SPECS } from "./ghana-b4-computing-adaptive";

export const GHANA_B4_COMPUTING_SUBJECT_ID =
  "subject-gh-basic4-computing-pilot";

const CURRICULUM_ID = "curriculum-gh-math-pilot";
const EDUCATION_SYSTEM_ID = "education-system-gh-basic-pilot";
const LEVEL_ID = "level-gh-basic-4-pilot";
const SUBJECT_ID = GHANA_B4_COMPUTING_SUBJECT_ID;

const strandNames: Record<string, string> = {
  "B4.1": "Introduction to Computing",
  "B4.2": "Presentation",
  "B4.3": "Word Processing",
};

const subStrandNames: Record<string, string> = {
  "B4.1.1": "Generation of Computers and Parts of a Computer and Other Gadgets",
  "B4.1.2": "Introduction to MS-Windows Interface",
  "B4.1.3": "Data, Sources and Usage",
  "B4.1.4": "Technology in the Community (Communication)",
  "B4.2.1": "Introduction to MS-PowerPoint",
  "B4.3.1": "Introduction to Word Processing",
};

const strandId = (code: string) =>
  `strand-gh-b4-computing-${code.toLowerCase().replace(/\./g, "-")}`;

const subStrandId = (code: string) =>
  `substrand-gh-b4-computing-${code.toLowerCase().replace(/\./g, "-")}`;

const standardId = (code: string) =>
  `standard-gh-b4-computing-${code.toLowerCase().replace(/\./g, "-")}`;

const indicatorId = (code: string) =>
  `indicator-gh-b4-computing-${code.toLowerCase().replace(/\./g, "-")}`;

const unique = (values: string[]) => [...new Set(values)];

const strandCodes = unique(
  GHANA_B4_COMPUTING_ADAPTIVE_SPECS.map((spec) => spec.strandCode),
);

const subStrandCodes = unique(
  GHANA_B4_COMPUTING_ADAPTIVE_SPECS.map((spec) => spec.subStrandCode),
);

const standardCodes = unique(
  GHANA_B4_COMPUTING_ADAPTIVE_SPECS.map((spec) => spec.contentStandardCode),
);

export const GHANA_B4_COMPUTING_STRANDS: Strand[] = strandCodes.map(
  (code, index) => ({
    id: strandId(code),
    subjectId: SUBJECT_ID,
    name: strandNames[code] ?? code,
    code,
    order: index + 1,
  }),
);

export const GHANA_B4_COMPUTING_SUBSTRANDS: SubStrand[] = subStrandCodes.map(
  (code, index) => {
    const strandCode = code.split(".").slice(0, 2).join(".");
    return {
      id: subStrandId(code),
      strandId: strandId(strandCode),
      name: subStrandNames[code] ?? code,
      code,
      order: index + 1,
    };
  },
);

export const GHANA_B4_COMPUTING_STANDARDS: ContentStandard[] =
  standardCodes.map((code) => {
    const spec = GHANA_B4_COMPUTING_ADAPTIVE_SPECS.find(
      (candidate) => candidate.contentStandardCode === code,
    );

    if (!spec) {
      throw new Error(`Missing Computing specification for ${code}`);
    }

    return {
      id: standardId(code),
      subStrandId: subStrandId(spec.subStrandCode),
      title: `Computing Content Standard ${code}`,
      description: `NaCCA Basic 4 Computing content standard ${code}.`,
    };
  });

export const GHANA_B4_COMPUTING_INDICATORS: LearningIndicator[] =
  GHANA_B4_COMPUTING_ADAPTIVE_SPECS.flatMap((spec) =>
    spec.indicatorMappings
      .filter((mapping) => mapping.relationship === "direct")
      .map((mapping, index) => ({
        id: indicatorId(mapping.code),
        contentStandardId: standardId(spec.contentStandardCode),
        statement: spec.description,
        order: GHANA_B4_COMPUTING_ADAPTIVE_SPECS.filter((candidate) => candidate.contentStandardCode === spec.contentStandardCode).findIndex((candidate) => candidate.competencyId === spec.competencyId) + 1,
      })),
  );

export const GHANA_B4_COMPUTING_COMPETENCIES: CompetencyDefinition[] =
  GHANA_B4_COMPUTING_ADAPTIVE_SPECS.map((spec) => ({
    id: spec.competencyId,
    curriculumFrameworkId: CURRICULUM_ID,
    educationSystemId: EDUCATION_SYSTEM_ID,
    learningLevelId: LEVEL_ID,
    subjectId: SUBJECT_ID,
    strandId: strandId(spec.strandCode),
    subStrandId: subStrandId(spec.subStrandCode),
    contentStandardId: standardId(spec.contentStandardCode),
    learningIndicatorId: indicatorId(spec.indicatorMappings.find((mapping) => mapping.relationship === "direct")!.code),
    title: spec.title,
    description: spec.description,
    prerequisiteCompetencyIds: spec.prerequisiteCompetencyIds,
    successorCompetencyIds: GHANA_B4_COMPUTING_ADAPTIVE_SPECS.filter((candidate) => candidate.prerequisiteCompetencyIds.includes(spec.competencyId)).map((candidate) => candidate.competencyId),
    relatedCompetencyIds: spec.relatedCompetencyIds,
    subskills: spec.subskills,
    misconceptions: spec.misconceptions,
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




