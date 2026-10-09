import type { CompetencyDefinition, ContentStandard, LearningIndicator, Strand, SubStrand } from "./index";
import { GHANA_B6_ENGLISH_ADAPTIVE_SPECS, GHANA_B6_ENGLISH_PUBLISHED_SPECS } from "./ghana-b6-english-adaptive";

const CURRICULUM_ID = "curriculum-gh-math-pilot";
const EDUCATION_SYSTEM_ID = "education-system-gh-basic-pilot";
const LEVEL_ID = "level-gh-basic-6-pilot";
const SUBJECT_ID = "subject-gh-basic6-english-pilot";

const strandNames: Record<string, string> = {"B6.1": "Oral Language", "B6.2": "Reading", "B6.3": "Grammar Usage at Word and Phrase Levels", "B6.4": "Writing", "B6.5": "Using Writing Conventions/Grammar Usage", "B6.6": "Extensive Reading"};
const subStrandNames: Record<string, string> = {"B6.1.1": "Songs", "B6.1.3": "Poems", "B6.1.4": "Story Telling", "B6.1.5": "Dramatisation and Role Play", "B6.1.6": "Conversation", "B6.1.7": "Listening Comprehension", "B6.1.8": "Asking and Answering Questions", "B6.1.9": "Giving and Following Commands, Instructions, Directions and Requests", "B6.1.10": "Presentation", "B6.2.2": "Phonics", "B6.2.3": "Word Families: Minimal Pairs and Common Digraphs", "B6.2.4": "Diphthongs", "B6.2.5": "Blends and Consonant Clusters", "B6.2.6": "Vocabulary", "B6.2.7": "Comprehension", "B6.2.8": "Silent Reading", "B6.2.9": "Fluency", "B6.2.10": "Summarising", "B6.3.1": "Nouns", "B6.3.2": "Determiners", "B6.3.3": "Pronouns", "B6.3.4": "Adjectives", "B6.3.5": "Verbs", "B6.3.6": "Adverbs", "B6.3.7": "Idiomatic Expressions", "B6.3.8": "Conjunctions", "B6.3.9": "Modals", "B6.3.10": "Prepositions", "B6.3.11": "Adjective Phrases", "B6.3.12": "Adverb Phrases", "B6.3.13": "Direct and Reported Speech", "B6.4.2": "Penmanship and Handwriting", "B6.4.6": "Paragraph Development", "B6.4.9": "Writing as a Process", "B6.4.10": "Narrative Writing", "B6.4.11": "Creative/Free Writing", "B6.4.12": "Descriptive Writing", "B6.4.13": "Argumentative/Persuasive Writing", "B6.4.14": "Expository/Informative Writing", "B6.4.15": "Letter Writing", "B6.5.1": "Using Capitalisation", "B6.5.2": "Using Punctuation", "B6.5.3": "Using Naming Words/Nouns", "B6.5.4": "Using Action Words", "B6.5.5": "Using Qualifying Words: Adjectives", "B6.5.6": "Using Qualifying Words: Adverbs", "B6.5.7": "Using Simple Prepositions", "B6.5.8": "Using Conjunctions", "B6.5.9": "Using Simple, Compound and Complex Sentences", "B6.5.10": "Spelling", "B6.6.1": "Building the Love and Culture of Reading"};
const standardTitles: Record<string, string> = {"B6.1.1.1": "Demonstrate understanding of a variety of songs", "B6.1.3.1": "Appreciate poems and other pieces of literary materials", "B6.1.4.1": "Respond to stories", "B6.1.5.1": "Appreciate pieces of literary materials through dramatisation", "B6.1.5.2": "Appreciate key issues in stories/sketches", "B6.1.6.1": "Explore certain culturally acceptable language for communication", "B6.1.6.2": "Demonstrate positive listening and viewing attitudes and behaviour by showing attentiveness and understanding", "B6.1.6.3": "Use knowledge of language and communicative skills to participate in conversation", "B6.1.7.1": "Use appropriate skills and strategies to process meaning from texts", "B6.1.8.1": "Demonstrate understanding in asking and answering questions correctly", "B6.1.8.2": "Identify and use question tags correctly in speech", "B6.1.9.1": "Explore the use of verbs in commands, instructions, requests and directions appropriately in speech", "B6.1.10.1": "Demonstrate knowledge of spoken grammar and register", "B6.1.10.2": "Demonstrate the ability to communicate with accurate pronunciation and appropriate intonation", "B6.1.10.3": "Plan and present information and ideas for a variety of purposes", "B6.2.2.1": "Connect sounds to letters; and blend letters/syllables in order to read and write", "B6.2.3.1": "Identify minimal pairs and common digraphs", "B6.2.4.1": "Identify and use diphthongs to decode texts", "B6.2.5.1": "Identify and use consonant blends and clusters in reading", "B6.2.6.1": "Understand word meanings and usages", "B6.2.6.2": "Build vocabulary", "B6.2.6.3": "Demonstrate a rich vocabulary that supports the development of listening, reading, speaking, writing and presentation skills", "B6.2.6.4": "Use words appropriately for purpose, audience, context and culture", "B6.2.7.1": "Process and comprehend level appropriate texts", "B6.2.7.2": "Apply critical reading, implied meaning, higher order thinking, judgment and evaluation", "B6.2.7.3": "Demonstrate understanding of the use of words and phrases as used in the text", "B6.2.8.1": "Construct meaning from texts read", "B6.2.9.1": "Read fluently to enhance comprehension", "B6.2.10.1": "Read and summarise passages read", "B6.3.1.1": "Apply knowledge of different types of nouns in communication", "B6.3.2.1": "Apply knowledge of different types of determiners in communication", "B6.3.3.1": "Apply knowledge of different types of pronouns in communication", "B6.3.4.1": "Apply the knowledge of adjectives in communication", "B6.3.5.1": "Apply the knowledge of verbs in communication", "B6.3.6.1": "Apply the knowledge of different types of adverbs in communication", "B6.3.7.1": "Understand and use idiomatic expressions appropriately in speech and in writing", "B6.3.8.1": "Apply the knowledge of conjunctions in speech and in writing", "B6.3.9.1": "Apply the knowledge of modals in speech and in writing", "B6.3.10.1": "Apply the knowledge of prepositions in oral and written communication", "B6.3.11.1": "Show understanding of adjective phrases in oral and written communication", "B6.3.12.1": "Show understanding of adverb phrases in oral and written communication", "B6.3.13.1": "Show understanding of direct and reported speech in oral and written communication", "B6.4.2.1": "Copy and rewrite sentences correctly", "B6.4.6.1": "Develop, organise and express ideas cohesively in writing and representing for a variety of purposes, audience and contexts", "B6.4.9.1": "Apply the skills and strategies for idea generation, selection, development, organisation and revision in writing", "B6.4.9.2": "Develop and express ideas coherently and cohesively in writing", "B6.4.9.3": "Apply strategies for improving drafts for publishing", "B6.4.10.1": "Narrate situations, express feelings and convey point of view about the world or a fictional world", "B6.4.11.1": "Create texts", "B6.4.12.1": "Demonstrate knowledge of descriptive words/expressions in writing", "B6.4.13.1": "Support an opinion in writing", "B6.4.13.2": "Write arguments to support claims with clear reasons and relevant evidence", "B6.4.14.1": "Write informative/expository essays", "B6.4.14.2": "Write the event of the day", "B6.4.15.1": "Write informal letters on given topics", "B6.5.1.1": "Use capital letters to start the first word in direct speech", "B6.5.2.1": "Show understanding of how punctuations are used appropriately in writing", "B6.5.3.1": "Apply knowledge of different types of nouns in communication", "B6.5.4.1": "Demonstrate understanding of verbs in everyday language", "B6.5.5.1": "Demonstrate understanding of adjectives in speech and in writing", "B6.5.6.1": "Understand and use adverbs correctly in speech and in writing", "B6.5.7.1": "Apply the knowledge of prepositions in oral and written communication", "B6.5.8.1": "Apply the knowledge of conjunctions in speech and in writing", "B6.5.9.1": "Apply knowledge of grammatical rules to form words, phrases and sentences", "B6.5.10.1": "Spell words accurately", "B6.6.1.1": "Read widely for pleasure, and to demonstrate independent reading and learning in the literary/content areas"};

const slug = (code: string): string => code.toLowerCase().replace(/\./g, "-");
const strandId = (code: string): string => `strand-gh-b6-english-${slug(code)}`;
const subStrandId = (code: string): string => `substrand-gh-b6-english-${slug(code)}`;
const standardId = (code: string): string => `standard-gh-b6-english-${code}`;
const indicatorId = (code: string): string => `indicator-gh-b6-english-${code}`;
const order = (code: string): number => Number(code.split(".").pop() ?? 0);

const usedStandards = new Set(GHANA_B6_ENGLISH_PUBLISHED_SPECS.map((spec) => spec.contentStandardCode));
const usedSubStrands = new Set(GHANA_B6_ENGLISH_PUBLISHED_SPECS.map((spec) => spec.subStrandCode));
const usedStrands = new Set(GHANA_B6_ENGLISH_PUBLISHED_SPECS.map((spec) => spec.strandCode));

export const GHANA_B6_ENGLISH_STRANDS: Strand[] = [...usedStrands].map((code) => ({
  id: strandId(code), subjectId: SUBJECT_ID, name: strandNames[code] ?? code, code, order: order(code),
}));

export const GHANA_B6_ENGLISH_SUBSTRANDS: SubStrand[] = [...usedSubStrands].map((code) => ({
  id: subStrandId(code), strandId: strandId(code.split(".").slice(0, 2).join(".")), name: subStrandNames[code] ?? code, code, order: order(code),
}));

export const GHANA_B6_ENGLISH_STANDARDS: ContentStandard[] = [...usedStandards].map((code) => ({
  id: standardId(code), subStrandId: subStrandId(code.split(".").slice(0, 3).join(".")), title: standardTitles[code] ?? code,
  description: `Ghana Basic 6 English Language content standard ${code}.`,
}));

export const GHANA_B6_ENGLISH_INDICATORS: LearningIndicator[] = GHANA_B6_ENGLISH_PUBLISHED_SPECS.map((spec) => ({
  id: indicatorId(spec.code), contentStandardId: standardId(spec.contentStandardCode), statement: spec.statement, order: order(spec.code),
}));

const published = new Set(GHANA_B6_ENGLISH_PUBLISHED_SPECS.map((spec) => spec.code));
const idFor = (code: string): string => {
  const spec = GHANA_B6_ENGLISH_ADAPTIVE_SPECS.find((item) => item.code === code);
  if (!spec) throw new Error(`Unknown Ghana B6 English indicator ${code}`);
  return spec.competencyId;
};
const onlyPublished = (codes: string[]): string[] => codes.filter((code) => published.has(code)).map(idFor);

export const GHANA_B6_ENGLISH_COMPETENCIES: CompetencyDefinition[] = GHANA_B6_ENGLISH_PUBLISHED_SPECS.map((spec) => ({
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
  successorCompetencyIds: GHANA_B6_ENGLISH_PUBLISHED_SPECS.filter((other) => other.prerequisiteCodes.includes(spec.code)).map((other) => other.competencyId),
  relatedCompetencyIds: onlyPublished(spec.relatedCodes),
  subskills: [...spec.subskills],
  misconceptions: [...spec.misconceptions],
  difficulty: spec.difficulty,
  masteryRequirements: { masteryThreshold: 0.8, confidenceThreshold: 0.8 },
  retentionRequirements: { required: true, confidenceThreshold: 0.8 },
  transferRequirements: { required: true, confidenceThreshold: 0.8 },
}));
