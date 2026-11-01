/*
 * Outline-only subjects: presentation only. Cards open official curriculum
 * references, never learning sessions. They never feed toFilumireSubjects
 * or decide which lessons a learner can open; server subjects (with
 * JHS gating and curriculum approval) remain the only source of active
 * subjects.
 *
 * Source (junior-high): Ghana NaCCA Common Core Programme B7-B9,
 * "Learning Areas: The CCP comprises the following subjects", front
 * matter p. ix of docs/curriculum-sources/ghana/ccp-b7-b9/MATHEMATICS.pdf
 * (same list in the English, Science and Computing CCP documents).
 * Languages are split into the four languages the CCP names.
 *
 * Source (primary, Basic 4-6): NaCCA, https://nacca.gov.gh/curriculum/
 * (read 28 Oct 2026), the subjects of the Standards-Based Curriculum
 * implemented from September 2019 for Key Phase 3 (B4-B6); cross-checked
 * with the National Pre-tertiary Education Curriculum Framework (NaCCA,
 * May 2018), section 10.2 and the B4-B6 period allocation.
 * Literacy is split into its subjects (English is active; Ghanaian
 * Language and French are listed). Our World Our People is left out: the
 * same page says it ceases as a separate primary subject from the
 * 2024/2025 academic year. Arabic is not a B4-B6 subject.
 */
import { basicGradeNumber, type AgeBand } from "./ageBand";

export type ReviewSubjectKey =
  | "ghanaian-language"
  | "french"
  | "arabic"
  | "creative-arts-design"
  | "career-technology"
  | "social-studies"
  | "rme"
  | "physical-health-education"
  | "history"
  | "creative-arts"
  | "physical-education";

export type ReviewSubject = {
  key: ReviewSubjectKey;
  name: { en: string; fr: string };
};

/* In the CCP's own order. */
const JUNIOR_HIGH_REVIEW_SUBJECTS: readonly ReviewSubject[] = [
  { key: "ghanaian-language", name: { en: "Ghanaian Language", fr: "Langue ghanéenne" } },
  { key: "french", name: { en: "French", fr: "Français" } },
  { key: "arabic", name: { en: "Arabic", fr: "Arabe" } },
  { key: "creative-arts-design", name: { en: "Creative Arts and Design", fr: "Arts créatifs et design" } },
  { key: "career-technology", name: { en: "Career Technology", fr: "Technologie profession\u00ADnelle" } },
  { key: "social-studies", name: { en: "Social Studies", fr: "Études sociales" } },
  { key: "rme", name: { en: "Religious and Moral Education", fr: "Éducation religieuse et morale" } },
  { key: "physical-health-education", name: { en: "Physical and Health Education", fr: "Éducation physique et à la santé" } },
];

/* In the order of NaCCA's subject list, without the active subjects. */
const PRIMARY_REVIEW_SUBJECTS: readonly ReviewSubject[] = [
  { key: "history", name: { en: "History", fr: "Histoire" } },
  { key: "creative-arts", name: { en: "Creative Arts", fr: "Arts créatifs" } },
  { key: "rme", name: { en: "Religious and Moral Education", fr: "Éducation religieuse et morale" } },
  { key: "physical-education", name: { en: "Physical Education", fr: "Éducation physique" } },
  { key: "french", name: { en: "French", fr: "Français" } },
  { key: "ghanaian-language", name: { en: "Ghanaian Language", fr: "Langue ghanéenne" } },
];

const REVIEW_SUBJECTS: Readonly<Record<AgeBand, readonly ReviewSubject[]>> = {
  primary: PRIMARY_REVIEW_SUBJECTS,
  "junior-high": JUNIOR_HIGH_REVIEW_SUBJECTS,
};

export const REVIEW_COPY = {
  en: {
    heading: "More subjects · curriculum outlines",
    status: "Outline only",
    open: "View curriculum outline",
    unavailable: "Lessons and learning activities are not yet available. Reading this outline does not count towards mastery or learning progress.",
    source: "Read the official NaCCA curriculum (PDF, opens in a new tab)",
    library: "NaCCA curriculum library (opens in a new tab)",
    guide: "The document covers several classes. Use its contents to find your Basic level.",
  },
  fr: {
    heading: "Autres matières · aperçus du programme",
    status: "Aperçu uniquement",
    open: "Voir le programme",
    unavailable: "Les leçons et les activités ne sont pas encore disponibles. La lecture de ce programme ne compte pas dans la maîtrise ni dans la progression.",
    source: "Lire le programme officiel NaCCA (PDF, nouvel onglet)",
    library: "Bibliothèque des programmes NaCCA (nouvel onglet)",
    guide: "Le document couvre plusieurs classes. Consulte le sommaire pour trouver ton niveau Basic.",
  },
} as const;

// URLs published by NaCCA's Standards-Based Curriculum and CCP indexes,
// verified 1 Nov 2026. These references are not authored FILUMIRE activities.
const PRIMARY_DOCUMENTS: Partial<Record<ReviewSubjectKey, string>> = {
  history: "2019/04/HISTORY-B1-B6.pdf",
  "creative-arts": "2019/06/CREATIVE-ARTS-B4-B6-.pdf",
  rme: "2019/04/RELIGIOUS-AND-MORAL-EDUCATION-B1-B6.pdf",
  "physical-education": "2019/04/PHYSICAL-EDUCATION-B1-B6.pdf",
  french: "2019/06/FRENCH-B4-B6.pdf",
  "ghanaian-language": "2019/06/GHANAIAN-LANGUAGE-B4-B6.pdf",
};
const JHS_DOCUMENTS: Partial<Record<ReviewSubjectKey, string>> = {
  "ghanaian-language": "2023/06/GHANAIAN-LANGUAGE.pdf",
  french: "2023/06/FRENCH-LANGUAGE.pdf",
  arabic: "2023/06/ARABIC.pdf",
  "creative-arts-design": "2023/06/CREATIVE-ARTS-AND-DESIGN.pdf",
  "career-technology": "2023/06/Career-Technology-k-9-3rd-Aug.08.2021.pdf",
  "social-studies": "2026/09/Social-Studies.pdf",
  rme: "2023/06/Religious-and-Moral-Education.pdf",
  "physical-health-education": "2023/06/PHYSICAL-EDUCATION-AND-HEALTH.pdf",
};

export type OutlineSubject = ReviewSubject & {
  grade: number;
  outlineUrl: string;
  sourceIndexUrl: string;
};

// Registered grade, not the optional age-band visual theme, determines subjects.
// No fallback to primary while the overview is loading or for unsupported grades.
export function outlineSubjectsForGrade(
  overview?: {
    gradeId?: string;
    gradeName?: string;
    availableSubjects?: ReadonlyArray<{ discipline: string }>;
  } | null,
): OutlineSubject[] {
  const grade = basicGradeNumber(overview?.gradeId, overview?.gradeName);
  if (grade === null || grade < 4 || grade > 9) return [];
  const band = grade <= 6 ? "primary" : "junior-high";
  const documents = grade <= 6 ? PRIMARY_DOCUMENTS : JHS_DOCUMENTS;
  return reviewSubjectsFor(band, overview?.availableSubjects).flatMap((subject) => {
    const document = documents[subject.key];
    return document ? [{
      ...subject,
      grade,
      outlineUrl: `https://nacca.gov.gh/wp-content/uploads/${document}`,
      sourceIndexUrl: grade <= 6
        ? "https://nacca.gov.gh/learning-areas-subjects/new-standards-based-curriculum-2019/"
        : "https://nacca.gov.gh/common-core-programme-ccp/",
    }] : [];
  });
}

/*
 * The review subjects for a band, leaving out any subject the server
 * already offers (matched on the stable discipline key), so a subject
 * that is approved later is never shown twice.
 */
export function reviewSubjectsFor(
  band: AgeBand,
  available?: ReadonlyArray<{ discipline: string }> | null,
): ReviewSubject[] {
  const active = new Set((available ?? []).map((subject) => subject.discipline));
  return REVIEW_SUBJECTS[band].filter((subject) => !active.has(subject.key));
}
