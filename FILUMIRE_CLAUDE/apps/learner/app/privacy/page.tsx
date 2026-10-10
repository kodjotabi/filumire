"use client";

import { AccountShell } from "../../components/filumire/AccountShell";
import { useLanguage } from "../../components/filumire/language";

/*
 * Draft privacy notice for the account test phase. Consent records
 * point at this text by version (CONSENT_NOTICE_VERSION in
 * services/account). It has not had a legal or privacy review and
 * says so; replace it, and bump the version, once it has.
 */
const NOTICE_VERSION = "filumire-test-notice-2026-10-draft";

type Section = { heading: string; items: string[] };

const TEXT: Record<"en" | "fr", { title: string; draft: string; back: string; sections: Section[]; version: string }> = {
  en: {
    title: "FILUMIRE privacy notice",
    draft: "Draft for testing. This notice has not yet been reviewed for legal and child-privacy requirements. Use FILUMIRE with made-up test details only until it has.",
    back: "Back",
    version: "Notice version",
    sections: [
      {
        heading: "Who creates accounts",
        items: [
          "A parent or guardian creates the family account and adds each learner.",
          "Children do not register themselves and are never asked for an email address.",
        ],
      },
      {
        heading: "What FILUMIRE keeps",
        items: [
          "For the parent or guardian: name, email address, preferred language, a protected (hashed) password, and a record of what you agreed to and when.",
          "For each learner: a first name or nickname, a username, a protected (hashed) password, an avatar choice, language and class.",
          "Learning records: answers, progress, mastery estimates, support suggestions, and notes or reviews from linked teachers.",
        ],
      },
      {
        heading: "What FILUMIRE does not ask for",
        items: [
          "Dates of birth, children's email addresses or phone numbers, home addresses, photographs or location.",
        ],
      },
      {
        heading: "Why",
        items: [
          "To let each learner sign in and continue where they left off.",
          "To adapt lessons to what the learner has shown they understand.",
          "To show parents, guardians and linked teachers how the learner is progressing.",
        ],
      },
      {
        heading: "Who can see it",
        items: [
          "The learner, their parent or guardian, and teachers the family is linked with. Other families never see your learners.",
          "FILUMIRE does not sell personal information or use it for advertising.",
        ],
      },
      {
        heading: "Still to be decided before real use",
        items: [
          "How long records are kept, how to download or delete them, the contact for privacy questions, and where data is hosted. These will be set out here before FILUMIRE opens to real families.",
        ],
      },
    ],
  },
  fr: {
    title: "Notice de confidentialité FILUMIRE",
    draft: "Version provisoire pour les tests. Cette notice n'a pas encore été examinée au regard des exigences légales et de protection des données des enfants. Utilise FILUMIRE uniquement avec des informations de test inventées jusqu'à cet examen.",
    back: "Retour",
    version: "Version de la notice",
    sections: [
      {
        heading: "Qui crée les comptes",
        items: [
          "Un parent ou tuteur crée le compte famille et ajoute chaque apprenant.",
          "Les enfants ne s'inscrivent pas eux-mêmes et on ne leur demande jamais d'adresse e-mail.",
        ],
      },
      {
        heading: "Ce que FILUMIRE conserve",
        items: [
          "Pour le parent ou tuteur : nom, adresse e-mail, langue préférée, mot de passe protégé (haché) et un enregistrement de ce que tu as accepté et à quel moment.",
          "Pour chaque apprenant : un prénom ou surnom, un identifiant, un mot de passe protégé (haché), un avatar, la langue et la classe.",
          "Données d'apprentissage : réponses, progrès, estimations de maîtrise, suggestions de soutien, et notes ou évaluations des enseignants associés.",
        ],
      },
      {
        heading: "Ce que FILUMIRE ne demande pas",
        items: [
          "Date de naissance, adresse e-mail ou numéro de téléphone des enfants, adresse du domicile, photos ou localisation.",
        ],
      },
      {
        heading: "Pourquoi",
        items: [
          "Pour que chaque apprenant puisse se connecter et reprendre là où il s'était arrêté.",
          "Pour adapter les leçons à ce que l'apprenant a montré qu'il comprend.",
          "Pour montrer aux parents, tuteurs et enseignants associés comment l'apprenant progresse.",
        ],
      },
      {
        heading: "Qui peut les voir",
        items: [
          "L'apprenant, son parent ou tuteur, et les enseignants associés à la famille. Les autres familles ne voient jamais tes apprenants.",
          "FILUMIRE ne vend pas les données personnelles et ne les utilise pas pour la publicité.",
        ],
      },
      {
        heading: "À définir avant une utilisation réelle",
        items: [
          "La durée de conservation, la manière de télécharger ou supprimer les données, le contact pour les questions de confidentialité et le lieu d'hébergement. Ils seront précisés ici avant l'ouverture de FILUMIRE aux vraies familles.",
        ],
      },
    ],
  },
};

export default function PrivacyPage() {
  const [language, setLanguage] = useLanguage();
  const t = TEXT[language];

  return (
    <AccountShell
      language={language}
      onLanguage={setLanguage}
      backHref={`/register?lang=${language}`}
      backLabel={t.back}
    >
      <h1>{t.title}</h1>
      <div className="acNotice" role="note">
        {t.draft}
      </div>
      {t.sections.map((section) => (
        <section key={section.heading} className="acCard plain">
          <h2>{section.heading}</h2>
          <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6, fontSize: 14, lineHeight: 1.45 }}>
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
      <p className="acSmall">
        {t.version}: <code>{NOTICE_VERSION}</code>
      </p>
    </AccountShell>
  );
}
