import type { CompetencyDefinition, ContentStandard, LearningIndicator, Strand, SubStrand } from "./index";
import { GHANA_B6_COMPUTING_ADAPTIVE_SPECS, GHANA_B6_COMPUTING_PUBLISHED_SPECS } from "./ghana-b6-computing-adaptive";

const CURRICULUM_ID = "curriculum-gh-math-pilot";
const EDUCATION_SYSTEM_ID = "education-system-gh-basic-pilot";
const LEVEL_ID = "level-gh-basic-6-pilot";
const SUBJECT_ID = "subject-gh-basic6-computing-pilot";

const strandNames: Record<string, string> = {"B6.1": "Introduction to Computing", "B6.2": "Presentation", "B6.3": "Word Processing", "B6.5": "Programming and Databases", "B6.6": "Internet and Social Media", "B6.7": "Health and Safety in Using ICT Tools"};
const subStrandNames: Record<string, string> = {"B6.1.1": "Generation of Computers and Parts of a Computer and Other Gadgets", "B6.1.2": "Introduction to MS-Windows Interface", "B6.1.3": "Data, Sources and Usage", "B6.1.4": "Technology in the Community", "B6.2.1": "Introduction to MS-PowerPoint", "B6.3.1": "Introduction to Word Processing", "B6.5.1": "Introduction to Databases, Algorithm and Programming Languages", "B6.5.3": "Introduction to Electronic Spreadsheet", "B6.6.1": "Network Overview", "B6.6.2": "Web Browsers and Web Pages", "B6.6.3": "Surfing the World Wide Web", "B6.6.4": "Favourite Places and Search Engine", "B6.6.5": "Using Online Forms", "B6.6.6": "Customising Your Browser", "B6.6.7": "Electronic Email", "B6.6.8": "Internet of Things", "B6.6.9": "Digital Literacy", "B6.6.10": "Internet Etiquette", "B6.7.1": "Health and Safety in Using ICT Tools"};
const standardTitles: Record<string, string> = {"B6.1.1.1": "Identify parts of a computer, technology tools and the history of computers", "B6.1.2.1": "Demonstrate the use of the desktop background and work with folders and File Explorer", "B6.1.3.1": "Demonstrate the collection, handling and presentation of data", "B6.1.4.1": "Demonstrate the role of technology in communication in the community", "B6.2.1.1": "Demonstrate how to use MS-PowerPoint ribbons", "B6.3.1.1": "Illustrate the use of word processing ribbons", "B6.5.1.1": "Demonstrate how databases are described, designed and queried", "B6.5.3.1": "Demonstrate how to use an electronic spreadsheet", "B6.6.1.1": "Demonstrate how the internet is used and how to connect to it", "B6.6.2.1": "Demonstrate the use of web browser features", "B6.6.3.1": "Demonstrate how to surf the World Wide Web", "B6.6.4.1": "Demonstrate how to use favourite places", "B6.6.5.1": "Demonstrate the use of online forms", "B6.6.6.1": "Show how to customise a browser", "B6.6.7.1": "Demonstrate the use of electronic email", "B6.6.8.1": "Demonstrate the use of the Internet of Things", "B6.6.9.1": "Demonstrate safe handling of information online", "B6.6.10.1": "Demonstrate internet etiquette and responsible computer use", "B6.7.1.1": "Demonstrate healthy and safe use of ICT tools"};

const slug = (code: string): string => code.toLowerCase().replace(/\./g, "-");
const strandId = (code: string): string => `strand-gh-b6-computing-${slug(code)}`;
const subStrandId = (code: string): string => `substrand-gh-b6-computing-${slug(code)}`;
const standardId = (code: string): string => `standard-gh-b6-computing-${code}`;
const indicatorId = (code: string): string => `indicator-gh-b6-computing-${code}`;
const order = (code: string): number => Number(code.split(".").pop() ?? 0);

const usedStandards = new Set(GHANA_B6_COMPUTING_PUBLISHED_SPECS.map((spec) => spec.contentStandardCode));
const usedSubStrands = new Set(GHANA_B6_COMPUTING_PUBLISHED_SPECS.map((spec) => spec.subStrandCode));
const usedStrands = new Set(GHANA_B6_COMPUTING_PUBLISHED_SPECS.map((spec) => spec.strandCode));

export const GHANA_B6_COMPUTING_STRANDS: Strand[] = [...usedStrands].map((code) => ({
  id: strandId(code), subjectId: SUBJECT_ID, name: strandNames[code] ?? code, code, order: order(code),
}));

export const GHANA_B6_COMPUTING_SUBSTRANDS: SubStrand[] = [...usedSubStrands].map((code) => ({
  id: subStrandId(code), strandId: strandId(code.split(".").slice(0, 2).join(".")), name: subStrandNames[code] ?? code, code, order: order(code),
}));

export const GHANA_B6_COMPUTING_STANDARDS: ContentStandard[] = [...usedStandards].map((code) => ({
  id: standardId(code), subStrandId: subStrandId(code.split(".").slice(0, 3).join(".")), title: standardTitles[code] ?? code,
  description: `Ghana Basic 6 Computing content standard ${code}.`,
}));

export const GHANA_B6_COMPUTING_INDICATORS: LearningIndicator[] = GHANA_B6_COMPUTING_PUBLISHED_SPECS.map((spec) => ({
  id: indicatorId(spec.code), contentStandardId: standardId(spec.contentStandardCode), statement: spec.statement, order: order(spec.code),
}));

const published = new Set(GHANA_B6_COMPUTING_PUBLISHED_SPECS.map((spec) => spec.code));
const idFor = (code: string): string => {
  const spec = GHANA_B6_COMPUTING_ADAPTIVE_SPECS.find((item) => item.code === code);
  if (!spec) throw new Error(`Unknown Ghana B6 Computing indicator ${code}`);
  return spec.competencyId;
};
const onlyPublished = (codes: string[]): string[] => codes.filter((code) => published.has(code)).map(idFor);

export const GHANA_B6_COMPUTING_COMPETENCIES: CompetencyDefinition[] = GHANA_B6_COMPUTING_PUBLISHED_SPECS.map((spec) => ({
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
  successorCompetencyIds: GHANA_B6_COMPUTING_PUBLISHED_SPECS.filter((other) => other.prerequisiteCodes.includes(spec.code)).map((other) => other.competencyId),
  relatedCompetencyIds: onlyPublished(spec.relatedCodes),
  subskills: [...spec.subskills],
  misconceptions: [...spec.misconceptions],
  difficulty: spec.difficulty,
  masteryRequirements: { masteryThreshold: 0.8, confidenceThreshold: 0.8 },
  retentionRequirements: { required: true, confidenceThreshold: 0.8 },
  transferRequirements: { required: true, confidenceThreshold: 0.8 },
}));
