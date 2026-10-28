/*
 * Curriculum Review subjects: presentation only. These cards show the
 * rest of the official subject offering for a learner's band. They are
 * never links, never feed toFilumireSubjects, and never decide which
 * subjects a learner can open; the server's available subjects (with
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
import type { AgeBand } from "./ageBand";

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
  en: { heading: "Also in the Ghana curriculum", status: "Curriculum Review" },
  fr: { heading: "Également au programme du Ghana", status: "Programme en préparation" },
} as const;

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
