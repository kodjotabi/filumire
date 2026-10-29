/*
 * FILUMIRE public website: shared structure and bilingual copy for the
 * header, footer, countries and subjects. Page copy lives in site-pages.ts.
 * Every English string has a French counterpart with the same key
 * (checked by tests/site-structure.test.mjs).
 */
import type { Locale } from "./locale";

export type Bilingual<T> = Record<Locale, T>;

export const NAV_LINKS = [
  { href: "/how-it-works", label: { en: "How it works", fr: "Comment ça marche" } },
  { href: "/subjects", label: { en: "Subjects", fr: "Matières" } },
  { href: "/learners", label: { en: "For Learners", fr: "Pour les élèves" } },
  { href: "/parents", label: { en: "For Parents", fr: "Pour les parents" } },
  { href: "/schools", label: { en: "For Schools", fr: "Pour les écoles" } },
  { href: "/about", label: { en: "About", fr: "À propos" } },
] as const;

export const SHELL_COPY = {
  en: {
    home: "FILUMIRE home",
    mainNav: "Main navigation",
    language: "Choose language",
    country: "Country",
    countryMenu: "Choose a country",
    login: "Log in",
    start: "Start learning",
    help: "Help & contact",
    menuOpen: "Open menu",
    menuClose: "Close menu",
    tagline: "Learning today for a brighter tomorrow.",
    footerAbout: "FILUMIRE is a personal learning companion for children in Africa, built on the national curriculum and guided by FILU.",
    footerExplore: "Explore",
    footerAudiences: "For you",
    footerCompany: "FILUMIRE",
    footerSignIn: "Sign in",
    privacy: "Website privacy",
    copyright: "© 2026 FILUMIRE. All rights reserved.",
    otherLanguage: "Français",
    languageNote: "This website is in English and French. Lessons are in English for now; French lessons are being prepared.",
    languageMenu: "Language",
  },
  fr: {
    home: "Accueil FILUMIRE",
    mainNav: "Navigation principale",
    language: "Choisir la langue",
    country: "Pays",
    countryMenu: "Choisir un pays",
    login: "Se connecter",
    start: "Commencer",
    help: "Aide et contact",
    menuOpen: "Ouvrir le menu",
    menuClose: "Fermer le menu",
    tagline: "Apprendre aujourd’hui pour un avenir plus radieux.",
    footerAbout: "FILUMIRE est un compagnon d’apprentissage personnalisé pour les enfants d’Afrique, conçu à partir du programme scolaire national et guidé par FILU.",
    footerExplore: "Découvrir",
    footerAudiences: "Pour vous",
    footerCompany: "FILUMIRE",
    footerSignIn: "Connexion",
    privacy: "Confidentialité du site",
    copyright: "© 2026 FILUMIRE. Tous droits réservés.",
    otherLanguage: "English",
    languageNote: "Ce site est en français et en anglais. Les leçons sont pour l’instant en anglais ; les leçons en français sont en préparation.",
    languageMenu: "Langue",
  },
} satisfies Bilingual<Record<string, string>>;

export const COUNTRIES = [
  {
    id: "ghana",
    href: "/ghana",
    status: "available",
    name: { en: "Ghana", fr: "Ghana" },
    summary: { en: "From Basic 4 through JHS 3", fr: "De Basic 4 à JHS 3" },
  },
  {
    id: "cote-divoire",
    href: "/cote-divoire",
    status: "coming-soon",
    name: { en: "Côte d’Ivoire", fr: "Côte d’Ivoire" },
    summary: { en: "Coming soon", fr: "Bientôt disponible" },
  },
  {
    id: "nigeria",
    href: "/nigeria",
    status: "coming-soon",
    name: { en: "Nigeria", fr: "Nigeria" },
    summary: { en: "Coming soon", fr: "Bientôt disponible" },
  },
] as const;

export type CountryId = (typeof COUNTRIES)[number]["id"];

/*
 * Subjects, matching the learner app: the four core subjects are served
 * across Basic 4–9 and use the app's colours and icons. Curriculum Review
 * subjects are presentation only: additional subjects being prepared for
 * mainstream release in each band. Both review lists are the learner app's
 * (apps/learner/components/filumire/subjectCatalogue.ts), with its sources:
 * B4-B6 from NaCCA's Standards-Based Curriculum subject list, B7-B9 from
 * the Common Core Programme "Learning Areas", front matter p. ix.
 */
export const ACTIVE_SUBJECTS = [
  {
    key: "english",
    name: { en: "English", fr: "Anglais" },
    summary: {
      en: "Speaking and listening, reading, grammar and writing.",
      fr: "Expression orale et compréhension, lecture, grammaire et écriture.",
    },
  },
  {
    key: "mathematics",
    name: { en: "Mathematics", fr: "Mathé\u00ADmatiques" },
    summary: {
      en: "Number, algebra, geometry and measurement, and handling data.",
      fr: "Nombres, algèbre, géométrie et mesures, organisation et gestion de données.",
    },
  },
  {
    key: "science",
    name: { en: "Science", fr: "Sciences" },
    summary: {
      en: "Living things and materials, cycles, systems, forces and energy, and our environment.",
      fr: "Le vivant et la matière, les cycles, les systèmes, les forces et l’énergie, l’être humain et son environnement.",
    },
  },
  {
    key: "computing",
    name: { en: "Computing", fr: "Informatique" },
    summary: {
      en: "How computers work, everyday software, networks and the internet, and computational thinking.",
      fr: "Le fonctionnement de l’ordinateur, les logiciels du quotidien, les réseaux et Internet, la pensée informatique.",
    },
  },
] as const;

export const REVIEW_SUBJECTS = {
  primary: [
    { key: "history", name: { en: "History", fr: "Histoire" } },
    { key: "creative-arts", name: { en: "Creative Arts", fr: "Arts créatifs" } },
    { key: "rme", name: { en: "Religious and Moral Education", fr: "Éducation religieuse et morale" } },
    { key: "physical-education", name: { en: "Physical Education", fr: "Éducation physique" } },
    { key: "french", name: { en: "French", fr: "Français" } },
    { key: "ghanaian-language", name: { en: "Ghanaian Language", fr: "Langue ghanéenne" } },
  ],
  jhs: [
    { key: "ghanaian-language", name: { en: "Ghanaian Language", fr: "Langue ghanéenne" } },
    { key: "french", name: { en: "French", fr: "Français" } },
    { key: "arabic", name: { en: "Arabic", fr: "Arabe" } },
    { key: "creative-arts-design", name: { en: "Creative Arts and Design", fr: "Arts créatifs et design" } },
    { key: "career-technology", name: { en: "Career Technology", fr: "Technologie profession\u00ADnelle" } },
    { key: "social-studies", name: { en: "Social Studies", fr: "Études sociales" } },
    { key: "rme", name: { en: "Religious and Moral Education", fr: "Éducation religieuse et morale" } },
    { key: "physical-health-education", name: { en: "Physical and Health Education", fr: "Éducation physique et à la santé" } },
  ],
} as const satisfies Record<"primary" | "jhs", readonly { key: string; name: Bilingual<string> }[]>;

export const SUBJECT_COPY = {
  en: { review: "Curriculum Review", reviewMeaning: "English Language, Mathematics, Science and Computing are available across Basic 4–9. Subjects marked Curriculum Review are additional subjects that educators are preparing and checking for Basic 4–6 and Basic 7–9 before learners can open them." },
  fr: { review: "Programme en préparation", reviewMeaning: "L’anglais, les mathématiques, les sciences et l’informatique sont proposés du Basic 4 au Basic 9. Les matières marquées « Programme en préparation » sont des matières supplémentaires que des enseignants élaborent et vérifient pour le Basic 4 à 6 et le Basic 7 à 9, avant leur ouverture aux élèves." },
} satisfies Bilingual<Record<string, string>>;
