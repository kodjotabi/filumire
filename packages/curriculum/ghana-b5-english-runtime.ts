import type { CompetencyDefinition, ContentStandard, LearningIndicator, Strand, SubStrand } from "./index";
import { GHANA_B5_ENGLISH_ADAPTIVE_SPECS, GHANA_B5_ENGLISH_PUBLISHED_SPECS } from "./ghana-b5-english-adaptive";

const CURRICULUM_ID = "curriculum-gh-math-pilot";
const EDUCATION_SYSTEM_ID = "education-system-gh-basic-pilot";
const LEVEL_ID = "level-gh-basic-5-pilot";
const SUBJECT_ID = "subject-gh-basic5-english-pilot";

const strandNames: Record<string, string> = {"B5.1": "Oral Language", "B5.2": "Reading", "B5.3": "Grammar Usage at Word and Phrase Levels", "B5.4": "Writing", "B5.5": "Using Writing Conventions/Grammar Usage", "B5.6": "Extensive Reading"};
const subStrandNames: Record<string, string> = {"B5.1.1": "Songs", "B5.1.3": "Poems", "B5.1.4": "Story Telling", "B5.1.5": "Dramatisation and Role Play", "B5.1.6": "Conversation", "B5.1.7": "Listening Comprehension", "B5.1.8": "Asking and Answering Questions/Question Tags", "B5.1.9": "Giving and Following Commands, Instructions, Directions and Requests", "B5.1.10": "Presentation", "B5.2.2": "Phonics", "B5.2.3": "Word Families: Minimal Pairs and Common Digraphs", "B5.2.4": "Diphthongs", "B5.2.5": "Blends and Consonant Clusters", "B5.2.6": "Vocabulary", "B5.2.7": "Comprehension", "B5.2.8": "Silent Reading", "B5.2.9": "Fluency", "B5.2.10": "Summarising", "B5.3.1": "Nouns", "B5.3.2": "Determiners", "B5.3.3": "Pronouns", "B5.3.4": "Adjectives", "B5.3.5": "Verbs", "B5.3.6": "Adverbs", "B5.3.7": "Idiomatic Expressions", "B5.3.8": "Conjunctions", "B5.3.9": "Modals", "B5.3.10": "Prepositions", "B5.4.2": "Penmanship and Handwriting", "B5.4.3": "Paragraph Development", "B5.4.9": "Writing as a Process", "B5.4.10": "Narrative Writing", "B5.4.11": "Creative/Free Writing", "B5.4.12": "Descriptive Writing", "B5.4.13": "Persuasive/Argumentative Writing", "B5.4.14": "Informative/Expository Writing", "B5.4.15": "Letter Writing", "B5.5.1": "Using Capitalisation", "B5.5.2": "Using Punctuation", "B5.5.3": "Naming Words/Nouns", "B5.5.4": "Using Action Words", "B5.5.5": "Using Qualifying Words: Adjectives", "B5.5.6": "Using Adverbs", "B5.5.7": "Using Simple Prepositions", "B5.5.8": "Using Conjunctions", "B5.5.9": "Using Simple, Compound and Complex Sentences", "B5.5.10": "Spelling", "B5.6.1": "Building the Love and Culture of Reading"};
const standardTitles: Record<string, string> = {"B5.1.1.1": "Demonstrate understanding of a variety of songs", "B5.1.3.1": "Appreciate poems and other pieces of literary materials", "B5.1.4.1": "Respond to stories", "B5.1.5.1": "Appreciate pieces of literary materials through dramatisation", "B5.1.5.2": "Appreciate key issues in stories/sketches", "B5.1.6.1": "Use culturally acceptable language for communication", "B5.1.6.2": "Demonstrate positive listening and viewing attitudes and behaviour by showing attentiveness and understanding", "B5.1.6.3": "Use knowledge of language and communicative skills to participate in conversation", "B5.1.7.1": "Use appropriate skills and strategies to process meaning from texts", "B5.1.8.1": "Demonstrate understanding in asking and answering questions correctly", "B5.1.8.2": "Identify and use question tags correctly in speech", "B5.1.9.1": "Use verbs in commands, instructions, requests and directions appropriately in speech", "B5.1.10.1": "Demonstrate knowledge of spoken grammar and register", "B5.1.10.2": "Demonstrate the ability to communicate with accurate pronunciation and appropriate intonation", "B5.1.10.3": "Plan and present information and ideas for a variety of purposes", "B5.2.2.1": "Connect sounds to letters; and blend letters/syllables in order to read and write", "B5.2.3.1": "Identify minimal pairs and common digraphs", "B5.2.4.1": "Identify and use diphthongs to decode", "B5.2.5.1": "Identify and use consonant blends and clusters in reading", "B5.2.6.1": "Understand word meanings and usages", "B5.2.6.2": "Build vocabulary", "B5.2.6.3": "Demonstrate a rich vocabulary that supports the development of listening, reading, speaking, writing and presentation skills", "B5.2.6.4": "Use words appropriately for purpose, audience, context and culture", "B5.2.7.1": "Process and comprehend level appropriate texts", "B5.2.7.2": "Apply critical reading, implied meaning, higher order thinking, judgment and evaluation", "B5.2.7.3": "Demonstrate an understanding of the use of words and phrases as used in a text", "B5.2.8.1": "Construct meaning from texts read", "B5.2.9.1": "Read fluently to enhance comprehension", "B5.2.10.1": "Read and summarise passages read", "B5.3.1.1": "Apply knowledge of different types of nouns in communication", "B5.3.2.1": "Apply knowledge of different types of determiners in communication", "B5.3.3.1": "Apply knowledge of different types of pronouns in communication", "B5.3.4.1": "Apply the knowledge of adjectives in communication", "B5.3.5.1": "Apply the knowledge of verbs in communication", "B5.3.6.1": "Apply the knowledge of different types of adverbs in communication", "B5.3.7.1": "Understand and use idiomatic expressions appropriately in speech and in writing", "B5.3.8.1": "Apply the knowledge of conjunctions in speech and in writing", "B5.3.9.1": "Apply the knowledge of modals in speech and in writing", "B5.3.10.1": "Apply the knowledge of prepositions in oral and written communication", "B5.4.2.1": "Copy and rewrite sentences correctly", "B5.4.3.1": "Develop, organise and express ideas cohesively in writing and representing for a variety of purposes, audience and context", "B5.4.9.1": "Apply the skills and strategies for idea generation, selection, development, organisation and revision in writing", "B5.4.9.2": "Develop and express ideas coherently and cohesively in writing", "B5.4.9.3": "Apply strategies for improving drafts for publishing", "B5.4.10.1": "Narrate situations, express feelings and convey point of view about the world or a fictional world", "B5.4.11.1": "Create texts", "B5.4.12.1": "Demonstrate knowledge of descriptive words/expressions in writing", "B5.4.13.1": "Support an opinion in writing", "B5.4.13.2": "Write arguments to support claims with clear reasons and relevant evidence", "B5.4.14.1": "Write informative/expository essays", "B5.4.14.2": "Write the event of the day", "B5.4.15.1": "Write informal letters on given topics", "B5.5.1.1": "Use capital letters to start the first words in a direct speech", "B5.5.2.1": "Show understanding of how punctuations are used appropriately in writing", "B5.5.3.1": "Apply knowledge of different types of nouns in communication", "B5.5.4.1": "Demonstrate understanding of verbs in everyday language", "B5.5.5.1": "Demonstrate understanding of adjectives in speech and in writing", "B5.5.6.1": "Demonstrate understanding of the use of adverbs in speech and in writing", "B5.5.7.1": "Apply the knowledge of prepositions in oral and written communication", "B5.5.8.1": "Apply the knowledge of conjunctions in speech and in writing", "B5.5.9.1": "Apply knowledge of grammatical rules to form words, phrases and sentences", "B5.5.10.1": "Spell words correctly", "B5.6.1.1": "Read widely for pleasure, and to demonstrate independent reading and learning in the literary/content areas"};

const slug = (code: string): string => code.toLowerCase().replace(/\./g, "-");
const strandId = (code: string): string => `strand-gh-b5-english-${slug(code)}`;
const subStrandId = (code: string): string => `substrand-gh-b5-english-${slug(code)}`;
const standardId = (code: string): string => `standard-gh-b5-english-${code}`;
const indicatorId = (code: string): string => `indicator-gh-b5-english-${code}`;
const order = (code: string): number => Number(code.split(".").pop() ?? 0);

const usedStandards = new Set(GHANA_B5_ENGLISH_PUBLISHED_SPECS.map((spec) => spec.contentStandardCode));
const usedSubStrands = new Set(GHANA_B5_ENGLISH_PUBLISHED_SPECS.map((spec) => spec.subStrandCode));
const usedStrands = new Set(GHANA_B5_ENGLISH_PUBLISHED_SPECS.map((spec) => spec.strandCode));

export const GHANA_B5_ENGLISH_STRANDS: Strand[] = [...usedStrands].map((code) => ({
  id: strandId(code), subjectId: SUBJECT_ID, name: strandNames[code] ?? code, code, order: order(code),
}));

export const GHANA_B5_ENGLISH_SUBSTRANDS: SubStrand[] = [...usedSubStrands].map((code) => ({
  id: subStrandId(code), strandId: strandId(code.split(".").slice(0, 2).join(".")), name: subStrandNames[code] ?? code, code, order: order(code),
}));

export const GHANA_B5_ENGLISH_STANDARDS: ContentStandard[] = [...usedStandards].map((code) => ({
  id: standardId(code), subStrandId: subStrandId(code.split(".").slice(0, 3).join(".")), title: standardTitles[code] ?? code,
  description: `Ghana Basic 5 English Language content standard ${code}.`,
}));

export const GHANA_B5_ENGLISH_INDICATORS: LearningIndicator[] = GHANA_B5_ENGLISH_PUBLISHED_SPECS.map((spec) => ({
  id: indicatorId(spec.code), contentStandardId: standardId(spec.contentStandardCode), statement: spec.statement, order: order(spec.code),
}));

const published = new Set(GHANA_B5_ENGLISH_PUBLISHED_SPECS.map((spec) => spec.code));
const idFor = (code: string): string => {
  const spec = GHANA_B5_ENGLISH_ADAPTIVE_SPECS.find((item) => item.code === code);
  if (!spec) throw new Error(`Unknown Ghana B5 English indicator ${code}`);
  return spec.competencyId;
};
const onlyPublished = (codes: string[]): string[] => codes.filter((code) => published.has(code)).map(idFor);

export const GHANA_B5_ENGLISH_COMPETENCIES: CompetencyDefinition[] = GHANA_B5_ENGLISH_PUBLISHED_SPECS.map((spec) => ({
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
  successorCompetencyIds: GHANA_B5_ENGLISH_PUBLISHED_SPECS.filter((other) => other.prerequisiteCodes.includes(spec.code)).map((other) => other.competencyId),
  relatedCompetencyIds: onlyPublished(spec.relatedCodes),
  subskills: [...spec.subskills],
  misconceptions: [...spec.misconceptions],
  difficulty: spec.difficulty,
  masteryRequirements: { masteryThreshold: 0.8, confidenceThreshold: 0.8 },
  retentionRequirements: { required: true, confidenceThreshold: 0.8 },
  transferRequirements: { required: true, confidenceThreshold: 0.8 },
}));
