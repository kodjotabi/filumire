export type CurriculumFrameworkId = string;
export type EducationSystemId = string;
export type LearningLevelId = string;
export type SubjectId = string;
export type StrandId = string;
export type SubStrandId = string;
export type ContentStandardId = string;
export type LearningIndicatorId = string;
export type CompetencyId = string;

export interface CurriculumFramework {
  id: CurriculumFrameworkId;
  name: string;
  countryOrRegion: string;
  version: string;
}

export interface EducationSystem {
  id: EducationSystemId;
  curriculumFrameworkId: CurriculumFrameworkId;
  name: string;
  description?: string;
}

export interface LearningLevel {
  id: LearningLevelId;
  educationSystemId: EducationSystemId;
  name: string;
  order: number;
}

export interface Subject {
  id: SubjectId;
  learningLevelId: LearningLevelId;
  name: string;
  code: string;
}

export interface Strand {
  id: StrandId;
  subjectId: SubjectId;
  name: string;
  code: string;
  order: number;
}

export interface SubStrand {
  id: SubStrandId;
  strandId: StrandId;
  name: string;
  code: string;
  order: number;
}

export interface ContentStandard {
  id: ContentStandardId;
  subStrandId: SubStrandId;
  title: string;
  description: string;
}

export interface LearningIndicator {
  id: LearningIndicatorId;
  contentStandardId: ContentStandardId;
  statement: string;
  order: number;
}

export interface CompetencyDefinition {
  id: CompetencyId;

  curriculumFrameworkId: CurriculumFrameworkId;
  educationSystemId: EducationSystemId;
  learningLevelId: LearningLevelId;
  subjectId: SubjectId;
  strandId: StrandId;
  subStrandId: SubStrandId;
  contentStandardId: ContentStandardId;
  learningIndicatorId: LearningIndicatorId;

  title: string;
  description: string;

  prerequisiteCompetencyIds: CompetencyId[];
  successorCompetencyIds: CompetencyId[];
  relatedCompetencyIds: CompetencyId[];

  subskills: string[];
  misconceptions: string[];

  difficulty: number;

  masteryRequirements: {
    masteryThreshold: number;
    confidenceThreshold: number;
  };

  retentionRequirements: {
    required: boolean;
    confidenceThreshold: number;
  };

  transferRequirements: {
    required: boolean;
    confidenceThreshold: number;
  };
}

const curriculumFrameworks: CurriculumFramework[] = [
  {
    id: "framework-test",
    name: "FILUMIRE Validation Curriculum",
    countryOrRegion: "TEST",
    version: "0.1",
  },
];

const educationSystems: EducationSystem[] = [
  {
    id: "education-system-test",
    curriculumFrameworkId: "framework-test",
    name: "FILUMIRE Validation Education System",
  },
];

const learningLevels: LearningLevel[] = [
  {
    id: "level-test",
    educationSystemId: "education-system-test",
    name: "Validation Level",
    order: 1,
  },
];

const subjects: Subject[] = [
  {
    id: "subject-test-mathematics",
    learningLevelId: "level-test",
    name: "Mathematics",
    code: "MATH",
  },
];

const strands: Strand[] = [
  {
    id: "strand-test-number-patterns",
    subjectId: "subject-test-mathematics",
    name: "Number Patterns",
    code: "NP",
    order: 1,
  },
];

const subStrands: SubStrand[] = [
  {
    id: "substrand-test-number-sequences",
    strandId: "strand-test-number-patterns",
    name: "Number Sequences",
    code: "NS",
    order: 1,
  },
];

const contentStandards: ContentStandard[] = [
  {
    id: "standard-test-number-sequences",
    subStrandId: "substrand-test-number-sequences",
    title: "Number Sequence Patterns",
    description:
      "Recognise, describe and apply simple number sequence rules.",
  },
];

const learningIndicators: LearningIndicator[] = [
  {
    id: "indicator-test-number-sequences",
    contentStandardId: "standard-test-number-sequences",
    statement:
      "Recognise, continue and apply simple number sequence rules.",
    order: 1,
  },
];

const curriculum: CompetencyDefinition[] = [
  {
    id: "competency-test-001",

    curriculumFrameworkId: "framework-test",
    educationSystemId: "education-system-test",
    learningLevelId: "level-test",
    subjectId: "subject-test-mathematics",
    strandId: "strand-test-number-patterns",
    subStrandId: "substrand-test-number-sequences",
    contentStandardId: "standard-test-number-sequences",
    learningIndicatorId: "indicator-test-number-sequences",

    title: "Number Sequences",

    description:
      "Recognise and continue simple number sequences.",

    prerequisiteCompetencyIds: [],

    successorCompetencyIds: [
      "competency-test-002",
    ],

    relatedCompetencyIds: [],

    subskills: [
      "recognise_sequence",
      "continue_sequence",
    ],

    misconceptions: [],

    difficulty: 1,

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
  },

  {
    id: "competency-test-002",

    curriculumFrameworkId: "framework-test",
    educationSystemId: "education-system-test",
    learningLevelId: "level-test",
    subjectId: "subject-test-mathematics",
    strandId: "strand-test-number-patterns",
    subStrandId: "substrand-test-number-sequences",
    contentStandardId: "standard-test-number-sequences",
    learningIndicatorId: "indicator-test-number-sequences",

    title: "Number Sequence Patterns",

    description:
      "Identify the rule governing a number sequence.",

    prerequisiteCompetencyIds: [
      "competency-test-001",
    ],

    successorCompetencyIds: [
      "competency-test-003",
    ],

    relatedCompetencyIds: [
      "competency-test-001",
    ],

    subskills: [
      "identify_sequence_rule",
      "describe_sequence_rule",
    ],

    misconceptions: [],

    difficulty: 2,

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
  },

  {
    id: "competency-test-003",

    curriculumFrameworkId: "framework-test",
    educationSystemId: "education-system-test",
    learningLevelId: "level-test",
    subjectId: "subject-test-mathematics",
    strandId: "strand-test-number-patterns",
    subStrandId: "substrand-test-number-sequences",
    contentStandardId: "standard-test-number-sequences",
    learningIndicatorId: "indicator-test-number-sequences",

    title: "Next Curriculum Competency",

    description:
      "Test progression to the next defined competency.",

    prerequisiteCompetencyIds: [
      "competency-test-002",
    ],

    successorCompetencyIds: [
      "competency-test-004",
    ],

    relatedCompetencyIds: [],

    subskills: [
      "apply_sequence_reasoning",
    ],

    misconceptions: [],

    difficulty: 3,

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
  },

  {
    id: "competency-test-004",

    curriculumFrameworkId: "framework-test",
    educationSystemId: "education-system-test",
    learningLevelId: "level-test",
    subjectId: "subject-test-mathematics",
    strandId: "strand-test-number-patterns",
    subStrandId: "substrand-test-number-sequences",
    contentStandardId: "standard-test-number-sequences",
    learningIndicatorId: "indicator-test-number-sequences",

    title: "Following Number Patterns",

    description:
      "Continue number patterns using an identified rule.",

    prerequisiteCompetencyIds: [
      "competency-test-003",
    ],

    successorCompetencyIds: [
      "competency-test-005",
    ],

    relatedCompetencyIds: [
      "competency-test-002",
    ],

    subskills: [
      "apply_pattern_rule",
      "continue_pattern",
    ],

    misconceptions: [],

    difficulty: 4,

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
  },

  {
    id: "competency-test-005",

    curriculumFrameworkId: "framework-test",
    educationSystemId: "education-system-test",
    learningLevelId: "level-test",
    subjectId: "subject-test-mathematics",
    strandId: "strand-test-number-patterns",
    subStrandId: "substrand-test-number-sequences",
    contentStandardId: "standard-test-number-sequences",
    learningIndicatorId: "indicator-test-number-sequences",

    title: "Applying Number Pattern Rules",

    description:
      "Apply a number pattern rule to continue and explain a sequence.",

    prerequisiteCompetencyIds: [
      "competency-test-004",
    ],

    successorCompetencyIds: [],

    relatedCompetencyIds: [
      "competency-test-002",
      "competency-test-004",
    ],

    subskills: [
      "apply_pattern_rule",
      "explain_pattern_rule",
      "transfer_pattern_reasoning",
    ],

    misconceptions: [],

    difficulty: 5,

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
  },
];

export function getCompetency(
  competencyId: CompetencyId,
): CompetencyDefinition | undefined {
  return curriculum.find(
    (competency) =>
      competency.id === competencyId,
  );
}

export function getNextCompetency(
  competencyId: CompetencyId,
): CompetencyDefinition | undefined {
  const competency =
    getCompetency(competencyId);

  if (!competency) {
    return undefined;
  }

  if (
    competency.successorCompetencyIds.length ===
    0
  ) {
    return undefined;
  }

  return getCompetency(
    competency.successorCompetencyIds[0],
  );
}

export function prerequisitesSatisfied(
  competencyId: CompetencyId,
  completedCompetencyIds: CompetencyId[],
): boolean {
  const competency =
    getCompetency(competencyId);

  if (!competency) {
    return false;
  }

  return competency.prerequisiteCompetencyIds.every(
    (prerequisiteId) =>
      completedCompetencyIds.includes(
        prerequisiteId,
      ),
  );
}

export function getAllCompetencies(): CompetencyDefinition[] {
  return [...curriculum];
}

export function getCurriculumFramework(
  frameworkId: CurriculumFrameworkId,
): CurriculumFramework | undefined {
  return curriculumFrameworks.find(
    (framework) =>
      framework.id === frameworkId,
  );
}

export function getEducationSystem(
  educationSystemId: EducationSystemId,
): EducationSystem | undefined {
  return educationSystems.find(
    (system) =>
      system.id === educationSystemId,
  );
}

export function getLearningLevel(
  levelId: LearningLevelId,
): LearningLevel | undefined {
  return learningLevels.find(
    (level) =>
      level.id === levelId,
  );
}

export function getSubject(
  subjectId: SubjectId,
): Subject | undefined {
  return subjects.find(
    (subject) =>
      subject.id === subjectId,
  );
}

export function getStrand(
  strandId: StrandId,
): Strand | undefined {
  return strands.find(
    (strand) =>
      strand.id === strandId,
  );
}

export function getSubStrand(
  subStrandId: SubStrandId,
): SubStrand | undefined {
  return subStrands.find(
    (subStrand) =>
      subStrand.id === subStrandId,
  );
}

export function getContentStandard(
  contentStandardId: ContentStandardId,
): ContentStandard | undefined {
  return contentStandards.find(
    (standard) =>
      standard.id === contentStandardId,
  );
}

export function getLearningIndicator(
  learningIndicatorId: LearningIndicatorId,
): LearningIndicator | undefined {
  return learningIndicators.find(
    (indicator) =>
      indicator.id === learningIndicatorId,
  );
}

export function getCompetenciesForSubject(
  subjectId: SubjectId,
): CompetencyDefinition[] {
  return curriculum.filter(
    (competency) =>
      competency.subjectId === subjectId,
  );
}

export function getCompetenciesForLevel(
  learningLevelId: LearningLevelId,
): CompetencyDefinition[] {
  return curriculum.filter(
    (competency) =>
      competency.learningLevelId ===
      learningLevelId,
  );
}

export function getAllSubjects(): Subject[] {
  return [...subjects];
}

export function getAllLearningLevels(): LearningLevel[] {
  return [...learningLevels];
}

export function getAllCurriculumFrameworks(): CurriculumFramework[] {
  return [...curriculumFrameworks];
}