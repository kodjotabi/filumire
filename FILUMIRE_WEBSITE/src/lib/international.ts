import type { Locale } from "./locale";

/** International entry point (filumire.com) → country homepage → learner application. */
export type CountryId = "ghana" | "cote-divoire" | "nigeria";
export type Country = { id: CountryId; href: string; name: Record<Locale, string>; status: "available" | "coming-soon"; summary: Record<Locale, string> };

export const COUNTRIES: readonly Country[] = [
  { id: "ghana", href: "/ghana", status: "available", name: { en: "Ghana", fr: "Ghana" }, summary: { en: "Primary Basic 4–6 • JHS 1–3", fr: "Primaire Basic 4–6 • JHS 1–3" } },
  { id: "cote-divoire", href: "/cote-divoire", status: "coming-soon", name: { en: "Côte d’Ivoire", fr: "Côte d’Ivoire" }, summary: { en: "Coming soon", fr: "Bientôt disponible" } },
  { id: "nigeria", href: "/nigeria", status: "coming-soon", name: { en: "Nigeria", fr: "Nigeria" }, summary: { en: "Coming soon", fr: "Bientôt disponible" } },
];

/** Pages that carry the international header and landscape instead of the Ghana site navigation. */
export const INTERNATIONAL_ROUTES = ["/", "/cote-divoire", "/nigeria"] as const;
export function isInternationalPath(pathname: string): boolean {
  const path = pathname.replace(/^\/fr(?=\/|$)/, "").replace(/\/$/, "") || "/";
  return (INTERNATIONAL_ROUTES as readonly string[]).includes(path);
}

export const INTERNATIONAL_COPY = {
  en: {
    home: "FILUMIRE international home",
    language: "Select language",
    login: "Parent / Teacher Login",
    menuOpen: "Open menu",
    menuClose: "Close menu",
    madeForAfrica: "Made for Africa",
    headline: ["Learning that ", "understands", " every child."],
    subtitle: ["Un apprentissage", "qui comprend chaque enfant."],
    subtitleLang: "fr" as Locale,
    ctaPrimary: "Choose Your Country",
    ctaSecondary: "Choisissez votre pays",
    dialogTitle: "Choose your country",
    dialogIntro: "Select your country to continue to its FILUMIRE website.",
    close: "Close",
    comingSoon: "Coming soon",
    tagline: "Same learners. Brighter futures.",
    soonEyebrow: "Coming soon",
    soonBody: (country: string) => `The FILUMIRE website for ${country} is in preparation. Lessons and learner access for ${country} are not available yet.`,
    soonBack: "Choose another country",
    soonContact: "Contact FILUMIRE",
  },
  fr: {
    home: "Accueil international FILUMIRE",
    language: "Choisir la langue",
    login: "Connexion parent / enseignant",
    menuOpen: "Ouvrir le menu",
    menuClose: "Fermer le menu",
    madeForAfrica: "Pensé pour l’Afrique",
    headline: ["Un apprentissage qui ", "comprend", " chaque enfant."],
    subtitle: ["Learning that", "understands every child."],
    subtitleLang: "en" as Locale,
    ctaPrimary: "Choisissez votre pays",
    ctaSecondary: "Choose Your Country",
    dialogTitle: "Choisissez votre pays",
    dialogIntro: "Sélectionnez votre pays pour accéder à son site FILUMIRE.",
    close: "Fermer",
    comingSoon: "Bientôt disponible",
    tagline: "Mêmes apprenants. Des avenirs plus lumineux.",
    soonEyebrow: "Bientôt disponible",
    soonBody: (country: string) => `Le site FILUMIRE pour ${country === "Nigeria" ? "le Nigeria" : "la " + country} est en préparation. Les leçons et l’accès apprenant ne sont pas encore disponibles.`,
    soonBack: "Choisir un autre pays",
    soonContact: "Contacter FILUMIRE",
  },
} satisfies Record<Locale, unknown>;
