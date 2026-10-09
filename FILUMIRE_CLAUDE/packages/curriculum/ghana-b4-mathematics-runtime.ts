import type {
  CompetencyDefinition,
  ContentStandard,
  LearningIndicator,
  Strand,
  SubStrand,
} from "./index";
import { GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS } from "./ghana-b4-mathematics-adaptive";

export const GHANA_B4_MATHEMATICS_SUBJECT_ID =
  "subject-gh-basic-4-mathematics-pilot";

const CURRICULUM_ID = "curriculum-gh-math-pilot";
const EDUCATION_SYSTEM_ID = "education-system-gh-basic-pilot";
const LEVEL_ID = "level-gh-basic-4-pilot";
const SUBJECT_ID = GHANA_B4_MATHEMATICS_SUBJECT_ID;

const strandId = (code: string) =>
  `strand-gh-b4-mathematics-${code.toLowerCase().replace(/\./g, "-")}`;

const subStrandId = (code: string) =>
  `substrand-gh-b4-mathematics-${code.toLowerCase().replace(/\./g, "-")}`;

const standardId = (code: string) =>
  `standard-gh-b4-mathematics-${code.toLowerCase().replace(/\./g, "-")}`;

const indicatorId = (code: string) =>
  `indicator-gh-b4-mathematics-${code.toLowerCase().replace(/\./g, "-")}`;

const unique = (values: string[]) => [...new Set(values)];

const strandCodes = unique(
  GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS.map((spec) => spec.strandCode),
);

const subStrandCodes = unique(
  GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS.map((spec) => spec.subStrandCode),
);

const standardCodes = unique(
  GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS.map(
    (spec) => spec.contentStandardCode,
  ),
);

export const GHANA_B4_MATHEMATICS_STRANDS: Strand[] =
  strandCodes.map((code, index) => ({
    id: strandId(code),
    subjectId: SUBJECT_ID,
    name: code,
    code,
    order: index + 1,
  }));

export const GHANA_B4_MATHEMATICS_SUBSTRANDS: SubStrand[] =
  subStrandCodes.map((code, index) => {
    const strandCode = code.split(".").slice(0, 2).join(".");
    return {
      id: subStrandId(code),
      strandId: strandId(strandCode),
      name: code,
      code,
      order: index + 1,
    };
  });

export const GHANA_B4_MATHEMATICS_STANDARDS: ContentStandard[] =
  standardCodes.map((code) => {
    const spec = GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS.find(
      (candidate) => candidate.contentStandardCode === code,
    );

    if (!spec) {
      throw new Error(`Missing Mathematics specification for ${code}`);
    }

    return {
      id: standardId(code),
      subStrandId: subStrandId(spec.subStrandCode),
      title: `Mathematics Content Standard ${code}`,
      description: `NaCCA Basic 4 Mathematics content standard ${code}.`,
    };
  });

export const GHANA_B4_MATHEMATICS_INDICATORS: LearningIndicator[] =
  GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS.flatMap((spec) =>
    spec.indicatorMappings
      .filter((mapping) => mapping.relationship === "direct")
      .map((mapping) => ({
        id: indicatorId(mapping.code),
        contentStandardId: standardId(spec.contentStandardCode),
        statement: spec.description,
        order:
          GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS
            .filter(
              (candidate) =>
                candidate.contentStandardCode === spec.contentStandardCode,
            )
            .findIndex(
              (candidate) =>
                candidate.competencyId === spec.competencyId,
            ) + 1,
      })),
  );

export const GHANA_B4_MATHEMATICS_COMPETENCIES: CompetencyDefinition[] =
  GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS.map((spec) => {
    const directIndicator = spec.indicatorMappings.find(
      (mapping) => mapping.relationship === "direct",
    );

    if (!directIndicator) {
      throw new Error(
        `Missing direct Mathematics indicator: ${spec.competencyId}`,
      );
    }

    return {
      id: spec.competencyId,
      curriculumFrameworkId: CURRICULUM_ID,
      educationSystemId: EDUCATION_SYSTEM_ID,
      learningLevelId: LEVEL_ID,
      subjectId: SUBJECT_ID,
      strandId: strandId(spec.strandCode),
      subStrandId: subStrandId(spec.subStrandCode),
      contentStandardId: standardId(spec.contentStandardCode),
      learningIndicatorId: indicatorId(directIndicator.code),
      title: spec.title,
      description: spec.description,
      prerequisiteCompetencyIds: spec.prerequisiteCompetencyIds,
      successorCompetencyIds:
        GHANA_B4_MATHEMATICS_ADAPTIVE_SPECS
          .filter((candidate) =>
            candidate.prerequisiteCompetencyIds.includes(spec.competencyId),
          )
          .map((candidate) => candidate.competencyId),
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
    };
  });
