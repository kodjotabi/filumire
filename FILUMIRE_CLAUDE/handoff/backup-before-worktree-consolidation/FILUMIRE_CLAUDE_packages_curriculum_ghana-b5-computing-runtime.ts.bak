import type { CompetencyDefinition, ContentStandard, LearningIndicator, Strand, SubStrand } from "./index";
import { GHANA_B5_COMPUTING_ADAPTIVE_SPECS, GHANA_B5_COMPUTING_PUBLISHED_SPECS } from "./ghana-b5-computing-adaptive";

const CURRICULUM_ID = "curriculum-gh-math-pilot";
const EDUCATION_SYSTEM_ID = "education-system-gh-basic-pilot";
const LEVEL_ID = "level-gh-basic-5-pilot";
const SUBJECT_ID = "subject-gh-basic5-computing-pilot";

const strandNames: Record<string, string> = {"B5.1": "Introduction to Computing", "B5.2": "Presentation", "B5.3": "Word Processing", "B5.5": "Programming and Databases", "B5.6": "Internet and Social Media", "B5.7": "Health and Safety in Using ICT Tools"};
const subStrandNames: Record<string, string> = {"B5.1.1": "Generation of Computers and Parts of a Computer and Other Gadgets", "B5.1.2": "Introduction to MS-Windows Interface", "B5.1.3": "Data, Sources and Usage", "B5.1.4": "Technology in the Community", "B5.2.1": "Introduction to MS-PowerPoint", "B5.3.1": "Introduction to Word Processing", "B5.5.1": "Introduction to Databases, Algorithm, Programming and Electronic Spreadsheet", "B5.6.1": "Network Overview", "B5.6.2": "Web Browsers and Web Pages", "B5.6.3": "Surfing the World Wide Web", "B5.6.4": "Favourite Places and Search Engine", "B5.6.5": "Using Online Forms", "B5.6.6": "Customising Your Browser", "B5.6.7": "Electronic Email", "B5.6.8": "Internet of Things", "B5.6.9": "Digital Literacy", "B5.6.10": "Digital Literacy: Digital Footprint", "B5.7.1": "Health and Safety in Using ICT Tools"};
const standardTitles: Record<string, string> = {"B5.1.1.1": "Identify parts of a computer and technology tools", "B5.1.2.1": "Demonstrate the use of the desktop background and work with folders", "B5.1.3.1": "Illustrate the use of data, its sources and its usage", "B5.1.4.1": "Demonstrate the role of technology in the community", "B5.2.1.1": "Demonstrate how to use MS-PowerPoint tabs and ribbons", "B5.3.1.1": "Illustrate the use of word processing tabs and ribbons", "B5.5.1.2": "Demonstrate how to use an electronic spreadsheet", "B5.5.1.3": "Demonstrate how databases and programming languages work", "B5.6.1.1": "Demonstrate how networks and the internet work", "B5.6.2.1": "Demonstrate how to use web browsers and web pages", "B5.6.3.1": "Demonstrate how to surf the World Wide Web", "B5.6.4.1": "Demonstrate how to use search engines", "B5.6.5.1": "Demonstrate the use of online forms", "B5.6.6.1": "Show how to customise a browser", "B5.6.7.1": "Demonstrate the use of electronic email", "B5.6.8.1": "Demonstrate the use of the Internet of Things", "B5.6.9.1": "Demonstrate safe and private use of information online", "B5.6.10.1": "Demonstrate understanding of a digital footprint", "B5.7.1.1": "Demonstrate healthy and safe use of ICT tools"};

const slug = (code: string): string => code.toLowerCase().replace(/\./g, "-");
const strandId = (code: string): string => `strand-gh-b5-computing-${slug(code)}`;
const subStrandId = (code: string): string => `substrand-gh-b5-computing-${slug(code)}`;
const standardId = (code: string): string => `standard-gh-b5-computing-${code}`;
const indicatorId = (code: string): string => `indicator-gh-b5-computing-${code}`;
const order = (code: string): number => Number(code.split(".").pop() ?? 0);

const usedStandards = new Set(GHANA_B5_COMPUTING_PUBLISHED_SPECS.map((spec) => spec.contentStandardCode));
const usedSubStrands = new Set(GHANA_B5_COMPUTING_PUBLISHED_SPECS.map((spec) => spec.subStrandCode));
const usedStrands = new Set(GHANA_B5_COMPUTING_PUBLISHED_SPECS.map((spec) => spec.strandCode));

export const GHANA_B5_COMPUTING_STRANDS: Strand[] = [...usedStrands].map((code) => ({
  id: strandId(code), subjectId: SUBJECT_ID, name: strandNames[code] ?? code, code, order: order(code),
}));

export const GHANA_B5_COMPUTING_SUBSTRANDS: SubStrand[] = [...usedSubStrands].map((code) => ({
  id: subStrandId(code), strandId: strandId(code.split(".").slice(0, 2).join(".")), name: subStrandNames[code] ?? code, code, order: order(code),
}));

export const GHANA_B5_COMPUTING_STANDARDS: ContentStandard[] = [...usedStandards].map((code) => ({
  id: standardId(code), subStrandId: subStrandId(code.split(".").slice(0, 3).join(".")), title: standardTitles[code] ?? code,
  description: `Ghana Basic 5 Computing content standard ${code}.`,
}));

export const GHANA_B5_COMPUTING_INDICATORS: LearningIndicator[] = GHANA_B5_COMPUTING_PUBLISHED_SPECS.map((spec) => ({
  id: indicatorId(spec.code), contentStandardId: standardId(spec.contentStandardCode), statement: spec.statement, order: order(spec.code),
}));

const published = new Set(GHANA_B5_COMPUTING_PUBLISHED_SPECS.map((spec) => spec.code));
const idFor = (code: string): string => {
  const spec = GHANA_B5_COMPUTING_ADAPTIVE_SPECS.find((item) => item.code === code);
  if (!spec) throw new Error(`Unknown Ghana B5 Computing indicator ${code}`);
  return spec.competencyId;
};
const onlyPublished = (codes: string[]): string[] => codes.filter((code) => published.has(code)).map(idFor);

export const GHANA_B5_COMPUTING_COMPETENCIES: CompetencyDefinition[] = GHANA_B5_COMPUTING_PUBLISHED_SPECS.map((spec) => ({
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
  successorCompetencyIds: GHANA_B5_COMPUTING_PUBLISHED_SPECS.filter((other) => other.prerequisiteCodes.includes(spec.code)).map((other) => other.competencyId),
  relatedCompetencyIds: onlyPublished(spec.relatedCodes),
  subskills: [...spec.subskills],
  misconceptions: [...spec.misconceptions],
  difficulty: spec.difficulty,
  masteryRequirements: { masteryThreshold: 0.8, confidenceThreshold: 0.8 },
  retentionRequirements: { required: true, confidenceThreshold: 0.8 },
  transferRequirements: { required: true, confidenceThreshold: 0.8 },
}));
