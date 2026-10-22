import { GHANA_B4_ENGLISH_PRODUCTION_SPECS } from "../curriculum/ghana-b4-english-production";
import type { CurriculumNode, FrameworkSubjectId } from "./index";

const SOURCE = "NaCCA English Language Curriculum for Primary Schools, Basic 4-6, 2019; FILUMIRE Basic 4 English specifications";
const id = (code: string): string => `node-gh-b4-english-${code.toLowerCase()}`;

const strandTitles: Record<string, string> = {
  "B4.1": "Oral Language",
  "B4.2": "Reading",
  "B4.3": "Grammar Usage at Word and Phrase Levels",
  "B4.4": "Writing",
  "B4.5": "Using Writing Conventions/Grammar Usage",
  "B4.6": "Extensive Reading",
};

const subStrandTitles: Record<string, string> = {
  "B4.1.1": "Songs",
  "B4.1.3": "Poems",
  "B4.1.4": "Story Telling",
  "B4.1.5": "Dramatisation and Role Play",
  "B4.1.6": "Conversation",
  "B4.1.7": "Listening Comprehension",
  "B4.1.8": "Asking and Answering Questions/Question Tags",
  "B4.1.9": "Giving and Following Commands, Instructions, Directions and Requests",
  "B4.1.10": "Presentation",
  "B4.2.2": "Phonics",
  "B4.2.3": "Word Families and Common Digraphs",
  "B4.2.4": "Diphthongs",
  "B4.2.5": "Blends and Consonant Clusters",
  "B4.2.6": "Vocabulary",
  "B4.2.7": "Comprehension",
  "B4.2.8": "Silent Reading",
  "B4.2.9": "Fluency",
  "B4.2.10": "Summarising",
  "B4.3.1": "Nouns",
  "B4.3.2": "Determiners",
  "B4.3.3": "Pronouns",
  "B4.3.4": "Adjectives",
  "B4.3.5": "Verbs",
  "B4.3.6": "Adverbs",
  "B4.3.7": "Idiomatic Expressions",
  "B4.3.8": "Conjunctions",
  "B4.3.9": "Modals",
  "B4.3.10": "Prepositions",
  "B4.4.2": "Penmanship and Handwriting",
  "B4.4.6": "Paragraph Development",
  "B4.4.9": "Writing as a Process",
  "B4.4.10": "Narrative Writing",
  "B4.4.11": "Creative/Free Writing",
  "B4.4.12": "Descriptive Writing",
  "B4.4.13": "Persuasive/Argumentative Writing",
  "B4.4.14": "Informative/Expository Writing",
  "B4.4.15": "Letter Writing",
  "B4.5.2": "Using Punctuation",
  "B4.5.3": "Naming Words/Nouns",
  "B4.5.4": "Using Action Words",
  "B4.5.5": "Using Qualifying Words: Adjectives",
  "B4.5.6": "Using Adverbs",
  "B4.5.7": "Using Simple Prepositions",
  "B4.5.8": "Using Conjunctions",
  "B4.5.9": "Using Simple, Compound and Complex Sentences",
  "B4.5.10": "Spelling",
  "B4.6.1": "Building the Love and Culture of Reading",
};

function node(subjectId: FrameworkSubjectId, code: string, nodeType: CurriculumNode["nodeType"], title: string, parentCode?: string, description?: string): CurriculumNode {
  return {
    id: id(code), subjectId, code, nodeType, title, description,
    parentNodeId: parentCode ? id(parentCode) : undefined,
    order: Number(code.split(".").at(-1)), sourceReference: SOURCE,
  };
}

export function getGhanaB4EnglishNodes(subjectId: FrameworkSubjectId): CurriculumNode[] {
  const specs = GHANA_B4_ENGLISH_PRODUCTION_SPECS;
  const standardCodes = [...new Set(specs.map((spec) => spec.contentStandardCode))];
  return [
    ...Object.entries(strandTitles).map(([code, title]) => node(subjectId, code, "strand", title)),
    ...Object.entries(subStrandTitles).map(([code, title]) => node(subjectId, code, "sub_strand", title, code.split(".").slice(0, 2).join("."))),
    // Standard titles summarise the existing authored specifications;
    // they are display labels, rather than quotations of official wording.
    ...standardCodes.map((code) => {
      const indicators = specs.filter((spec) => spec.contentStandardCode === code);
      return node(subjectId, code, "content_standard", indicators.map((spec) => spec.title).join("; "), indicators[0].subStrandCode);
    }),
    ...specs.map((spec) => node(subjectId, spec.code, "learning_indicator", spec.title, spec.contentStandardCode, spec.description)),
  ];
}
