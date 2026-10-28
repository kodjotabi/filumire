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
    tagline: "Apprendre aujourd’hui, réussir demain.",
    footerAbout: "FILUMIRE est un compagnon d’apprentissage personnalisé pour les enfants d’Afrique, conçu à partir du programme scolaire national et guidé par FILU.",
    footerExplore: "Découvrir",
    footerAudiences: "Pour vous",
    footerCompany: "FILUMIRE",
    footerSignIn: "Connexion",
    privacy: "Confidentialité du site",
    copyright: "© 2026 FILUMIRE. Tous droits réservés.",
    otherLanguage: "English",
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
 * Subjects, matching the learner app: the four active subjects use the app's
 * colours and icons; Curriculum Review subjects are presentation only.
 * JHS review list source: Ghana NaCCA Common Core Programme (B7-B9),
 * "Learning Areas", front matter p. ix of the CCP subject documents.
 * The Basic 4-6 review list stays empty until its source is confirmed.
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
    name: { en: "Mathematics", fr: "Mathématiques" },
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
  primary: [],
  jhs: [
    { key: "ghanaian-language", name: { en: "Ghanaian Language", fr: "Langue ghanéenne" } },
    { key: "french", name: { en: "French", fr: "Français" } },
    { key: "arabic", name: { en: "Arabic", fr: "Arabe" } },
    { key: "creative-arts-design", name: { en: "Creative Arts and Design", fr: "Arts créatifs et design" } },
    { key: "career-technology", name: { en: "Career Technology", fr: "Technologie professionnelle" } },
    { key: "social-studies", name: { en: "Social Studies", fr: "Études sociales" } },
    { key: "rme", name: { en: "Religious and Moral Education", fr: "Éducation religieuse et morale" } },
    { key: "physical-health-education", name: { en: "Physical and Health Education", fr: "Éducation physique et à la santé" } },
  ],
} as const satisfies Record<"primary" | "jhs", readonly { key: string; name: Bilingual<string> }[]>;

export const SUBJECT_COPY = {
  en: { review: "Curriculum Review", reviewMeaning: "Curriculum Review means the subject is being prepared and checked by educators before learners can open it." },
  fr: { review: "Programme en préparation", reviewMeaning: "« Programme en préparation » : la matière est en cours d’élaboration et de vérification par des enseignants avant d’être ouverte aux élèves." },
} satisfies Bilingual<Record<string, string>>;
