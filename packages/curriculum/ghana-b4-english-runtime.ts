import type {
  CompetencyDefinition,
  ContentStandard,
  LearningIndicator,
  Strand,
  SubStrand,
} from "./index";

import {
  GHANA_B4_ENGLISH_PRODUCTION_SPECS,
} from "./ghana-b4-english-production";

import type {
  GhanaB4EnglishStrand2Spec,
} from "./ghana-b4-english-strand2-adaptive";

const CURRICULUM_ID = "curriculum-gh-math-pilot";
const EDUCATION_SYSTEM_ID = "education-system-gh-basic-pilot";
const LEVEL_ID = "level-gh-basic-4-pilot";
const SUBJECT_ID = "subject-gh-basic4-english-pilot";

const strandNames: Record<string, string> = {
  "B4.1": "Oral Language",
  "B4.2": "Reading",
};

const subStrandNames: Record<string, string> = {
  "B4.1.1": "Songs",
  "B4.1.3": "Poems",
  "B4.1.4": "Story Telling",
  "B4.1.5": "Dramatisation and Role Play",
  "B4.1.6": "Conversation",
  "B4.1.7": "Listening Comprehension",
  "B4.1.8": "Asking and Answering Questions",
  "B4.1.9": "Commands, Instructions, Directions and Requests",
  "B4.1.10": "Presentation",

  "B4.2.2": "Sound-Letter and Word Recognition",
  "B4.2.3": "Word Families and Digraph Reading",
  "B4.2.4": "Diphthongs",
  "B4.2.5": "Blending and Spelling-Sound Relationships",
  "B4.2.6": "Vocabulary",
  "B4.2.7": "Reading Comprehension",
  "B4.2.8": "Silent Reading and Meaning",
  "B4.2.9": "Reading Fluency and Monitoring",
  "B4.2.10": "Summarising",
};

const contentStandardTitles: Record<string, string> = {
  "B4.1.1.1": "Demonstrate understanding of variety of songs",
  "B4.1.3.1": "Appreciate poems and other pieces of literary materials",
  "B4.1.4.1": "Respond to stories",
  "B4.1.5.1": "Perform stories",
  "B4.1.5.2": "Talk about key issues in stories/sketches",
  "B4.1.6.1": "Use culturally acceptable language for communication",
  "B4.1.6.2": "Demonstrate positive listening and viewing attitudes",
  "B4.1.6.3": "Participate effectively in conversation",
  "B4.1.7.1": "Use appropriate skills and strategies to process meaning from texts",
  "B4.1.8.1": "Ask and answer questions correctly",
  "B4.1.8.2": "Identify and use question tags correctly in speech",
  "B4.1.9.1": "Use verbs appropriately in commands, requests and directions",
  "B4.1.10.1": "Show knowledge of spoken grammar and register",
  "B4.1.10.2": "Communicate with accurate pronunciation and appropriate intonation",
  "B4.1.10.3": "Plan and present information and ideas",

  "B4.2.2.1": "Sound-letter patterns and word reading",
  "B4.2.2.2": "Word recognition using structural cues",
  "B4.2.3.1": "Word decoding using familiar patterns",
  "B4.2.4.1": "Diphthong patterns in meaningful language",
  "B4.2.5.1": "Blending and spelling-sound correspondence",
  "B4.2.6.1": "Vocabulary use and language terminology",
  "B4.2.6.2": "Vocabulary growth through reading",
  "B4.2.6.3": "Vocabulary meaning from context and relationships",
  "B4.2.6.4": "Vocabulary development and purposeful word choice",
  "B4.2.7.1": "Construct meaning and identify main ideas",
  "B4.2.7.2": "Respond to and connect with texts",
  "B4.2.7.3": "Determine contextual meaning",
  "B4.2.8.1": "Read silently for meaning",
  "B4.2.9.1": "Read fluently and monitor understanding",
  "B4.2.10.1": "Summarise texts",
};

function strandId(code: string): string {
  return `strand-gh-b4-english-${code.toLowerCase().replace(/\./g, "-")}`;
}

function subStrandId(code: string): string {
  return `substrand-gh-b4-english-${code.toLowerCase().replace(/\./g, "-")}`;
}

function standardId(code: string): string {
  return `standard-gh-b4-english-${code}`;
}

function indicatorId(code: string): string {
  return `indicator-gh-b4-english-${code}`;
}

function competencyId(code: string): string {
  return `competency-gh-english-${code.toLowerCase().replace(/\./g, "-")}`;
}

function numericOrder(code: string): number {
  return code
    .split(".")
    .slice(1)
    .reduce(
      (total, part) => total * 100 + Number.parseInt(part, 10),
      0,
    );
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function prerequisiteCodesFor(
  spec: (typeof GHANA_B4_ENGLISH_PRODUCTION_SPECS)[number],
): string[] {
  if ("prerequisiteCodes" in spec) {
    return (spec as GhanaB4EnglishStrand2Spec).prerequisiteCodes;
  }

  return [];
}

const strandCodes = unique(
  GHANA_B4_ENGLISH_PRODUCTION_SPECS.map(
    (spec) => spec.strandCode,
  ),
);

const subStrandCodes = unique(
  GHANA_B4_ENGLISH_PRODUCTION_SPECS.map(
    (spec) => spec.subStrandCode,
  ),
);

const standardCodes = unique(
  GHANA_B4_ENGLISH_PRODUCTION_SPECS.map(
    (spec) => spec.contentStandardCode,
  ),
);

export const GHANA_B4_ENGLISH_STRANDS: Strand[] =
  strandCodes.map((code) => ({
    id: strandId(code),
    subjectId: SUBJECT_ID,
    name: strandNames[code] ?? `English Strand ${code}`,
    code,
    order: Number.parseInt(code.split(".")[1] ?? "0", 10),
  }));

export const GHANA_B4_ENGLISH_SUBSTRANDS: SubStrand[] =
  subStrandCodes.map((code) => {
    const strandCode = code
      .split(".")
      .slice(0, 2)
      .join(".");

    return {
      id: subStrandId(code),
      strandId: strandId(strandCode),
      name: subStrandNames[code] ?? `English Sub-strand ${code}`,
      code,
      order: Number.parseInt(code.split(".")[2] ?? "0", 10),
    };
  });

export const GHANA_B4_ENGLISH_STANDARDS:
  ContentStandard[] = standardCodes.map((code) => {
    const subStrandCode = code
      .split(".")
      .slice(0, 3)
      .join(".");

    const title =
      contentStandardTitles[code] ??
      `English content standard ${code}`;

    return {
      id: standardId(code),
      subStrandId: subStrandId(subStrandCode),
      title,
      description:
        `NaCCA Ghana Basic 4 English content standard ${code}: ${title}.`,
    };
  });

export const GHANA_B4_ENGLISH_INDICATORS:
  LearningIndicator[] =
    GHANA_B4_ENGLISH_PRODUCTION_SPECS.map((spec) => ({
      id: indicatorId(spec.code),
      contentStandardId: standardId(
        spec.contentStandardCode,
      ),
      statement: spec.description,
      order: numericOrder(spec.code),
    }));

export const GHANA_B4_ENGLISH_COMPETENCIES:
  CompetencyDefinition[] =
    GHANA_B4_ENGLISH_PRODUCTION_SPECS.map((spec) => {
      const prerequisiteCompetencyIds =
        prerequisiteCodesFor(spec).map(competencyId);

      const successorCompetencyIds =
        GHANA_B4_ENGLISH_PRODUCTION_SPECS
          .filter(
            (candidate) =>
              prerequisiteCodesFor(candidate).includes(spec.code),
          )
          .map((candidate) => candidate.competencyId);

      return {
        id: spec.competencyId,

        curriculumFrameworkId: CURRICULUM_ID,
        educationSystemId: EDUCATION_SYSTEM_ID,
        learningLevelId: LEVEL_ID,
        subjectId: SUBJECT_ID,

        strandId: strandId(spec.strandCode),
        subStrandId: subStrandId(spec.subStrandCode),
        contentStandardId: standardId(
          spec.contentStandardCode,
        ),
        learningIndicatorId: indicatorId(spec.code),

        title: spec.title,
        description: spec.description,

        prerequisiteCompetencyIds,
        successorCompetencyIds,
        relatedCompetencyIds: [],

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

export const GHANA_B4_ENGLISH_COMPETENCY_COUNT =
  GHANA_B4_ENGLISH_COMPETENCIES.length;

/*
 * Compatibility aliases.
 * Existing consumers currently import the Strand1-prefixed symbols.
 * They now expose the complete production English registry without
 * forcing an unsafe simultaneous refactor of every consumer.
 */
export const GHANA_B4_ENGLISH_STRAND1_STRANDS =
  GHANA_B4_ENGLISH_STRANDS;

export const GHANA_B4_ENGLISH_STRAND1_SUBSTRANDS =
  GHANA_B4_ENGLISH_SUBSTRANDS;

export const GHANA_B4_ENGLISH_STRAND1_STANDARDS =
  GHANA_B4_ENGLISH_STANDARDS;

export const GHANA_B4_ENGLISH_STRAND1_INDICATORS =
  GHANA_B4_ENGLISH_INDICATORS;

export const GHANA_B4_ENGLISH_STRAND1_COMPETENCIES =
  GHANA_B4_ENGLISH_COMPETENCIES;

export const GHANA_B4_ENGLISH_STRAND1_COMPETENCY_COUNT =
  GHANA_B4_ENGLISH_COMPETENCY_COUNT;