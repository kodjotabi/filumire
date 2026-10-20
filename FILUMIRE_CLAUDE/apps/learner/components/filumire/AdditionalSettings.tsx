"use client";
import Link from "next/link";
import { useState } from "react";
import { saveInterfacePreferences, useInterfacePreferences, type Appearance } from "../../services/interface-preferences";
import { AccountSecurity } from "./AccountSecurity";
import type { Language } from "./language";
import { publicSiteHref } from "./PublicHomeLink";
const copy = {
  en: {
    title: "Additional Settings", notifications: "Notifications", progress: "Learning progress updates", achievements: "New achievements", notices: "These preferences control optional notices while you use FILUMIRE. Important learning feedback and safety messages always remain visible. No push notifications or emails are sent.",
    appearance: "App Appearance", light: "Light", dark: "Dark", system: "System Default", theme: "FILUMIRE's learning screens are bright and white, even when your device uses dark mode. Choose Dark only if bright screens are uncomfortable for you. The welcome and sign-in pages keep their original appearance.",
    device: "These preferences are saved for this learner on this device only.", saved: "Saved on this device.", failed: "Could not save. Check browser storage settings and try again.", learner: "Choose a learner to save preferences.",
    privacy: "Privacy & Safety", private: "Keep names, contact details and passwords out of Ask FILU. FILU gives learning guidance; it does not supply scored answers. Learning voices use local device speech only.", notice: "Read the privacy notice", guardian: "A parent or guardian manages learner access and linked teachers from the family page.", family: "Family account settings",
    help: "Help & Support", faq1: "How do I get help with a lesson?", answer1: "Open Ask FILU from the header or bottom navigation, type your question and select Send. Use Back to my lesson to continue.", faq2: "Why can’t I hear the learning voice?", answer2: "FILUMIRE reads aloud only with an African voice (Ghanaian, Nigerian or Kenyan English) installed on your device. If your device has none, lessons stay text-only. Otherwise choose it in FILUMIRE Learning Voice and check mute and volume.", faq3: "How do I change my password?", answer3: "In Privacy & Safety, use Password and devices if you are signed in as a learner. A parent or guardian can manage their learner’s password from the family page. Email password reset is not available yet.", faq4: "How do subscriptions work?", answer4: "The public pricing page explains subscriptions. Payment and connected subscription access are not operational in this learner preview.", pricing: "View subscription information", contact: "Contact FILUMIRE", contactHelp: "Ask a parent or guardian to help you contact FILUMIRE. Do not include passwords or private learner details. The contact page opens in a new tab.",
  },
  fr: {
    title: "Paramètres supplémentaires", notifications: "Notifications", progress: "Mises à jour de progression", achievements: "Nouvelles réussites", notices: "Ces préférences contrôlent les notifications facultatives pendant l’utilisation de FILUMIRE. Les retours pédagogiques importants et les messages de sécurité restent visibles. Aucun e-mail ni notification push n’est envoyé.",
    appearance: "Apparence", light: "Clair", dark: "Sombre", system: "Paramètres du système", theme: "Les écrans d’apprentissage de FILUMIRE sont clairs et blancs, même si ton appareil utilise le mode sombre. Choisis Sombre seulement si les écrans lumineux te gênent. Les pages d’accueil et de connexion gardent leur apparence d’origine.",
    device: "Ces préférences sont enregistrées pour cet apprenant sur cet appareil uniquement.", saved: "Enregistré sur cet appareil.", failed: "Enregistrement impossible. Vérifie le stockage du navigateur et réessaie.", learner: "Choisis un apprenant pour enregistrer les préférences.",
    privacy: "Confidentialité et sécurité", private: "Ne partage pas de noms, coordonnées ou mots de passe avec FILU. FILU guide ton apprentissage sans donner les réponses aux activités évaluées. Les voix utilisent uniquement la synthèse vocale locale.", notice: "Lire la notice de confidentialité", guardian: "Un parent ou tuteur gère les accès des apprenants et les enseignants associés depuis la page famille.", family: "Paramètres du compte famille",
    help: "Aide et assistance", faq1: "Comment obtenir de l’aide pour une leçon ?", answer1: "Ouvre FILU depuis l’en-tête ou la navigation, saisis ta question et sélectionne Envoyer. Utilise Retour à ma leçon pour continuer.", faq2: "Pourquoi la voix est-elle silencieuse ?", answer2: "FILUMIRE ne lit à voix haute qu’avec une voix française d’Afrique installée sur ton appareil. Sinon, les leçons restent en texte seulement. Si tu en as une, choisis-la dans La voix d’apprentissage FILUMIRE et vérifie le son.", faq3: "Comment changer mon mot de passe ?", answer3: "Dans Confidentialité et sécurité, utilise Mot de passe et appareils si tu es connecté comme apprenant. Un parent ou tuteur peut gérer le mot de passe de son apprenant depuis la page famille. La réinitialisation par e-mail n’est pas encore disponible.", faq4: "Comment fonctionnent les abonnements ?", answer4: "La page publique des tarifs explique les abonnements. Le paiement et les droits d’abonnement connectés ne sont pas opérationnels dans cet aperçu apprenant.", pricing: "Consulter les informations d’abonnement", contact: "Contacter FILUMIRE", contactHelp: "Demande l’aide d’un parent ou tuteur pour contacter FILUMIRE. Ne partage pas de mot de passe ni de données privées. La page de contact s’ouvre dans un nouvel onglet.",
  },
};
export function AdditionalSettings({ learnerId, language, signedIn, guardianSession }: { learnerId?: string; language: Language; signedIn?: boolean; guardianSession?: boolean }) {
  const t = copy[language]; const preferences = useInterfacePreferences(learnerId);
  const [status, setStatus] = useState<"saved" | "failed" | null>(null);
  function update(next: Partial<typeof preferences>) { if (learnerId) setStatus(saveInterfacePreferences(learnerId, { ...preferences, ...next }) ? "saved" : "failed"); }
  return <section className="additionalSettings" aria-labelledby="additional-settings-title">
    <h2 id="additional-settings-title">{t.title}</h2>
    <details><summary>{t.notifications}</summary><p>{t.notices}</p>
      <label><input type="checkbox" disabled={!learnerId} checked={preferences.progressNotices} onChange={e => update({ progressNotices: e.target.checked })} />{t.progress}</label>
      <label><input type="checkbox" disabled={!learnerId} checked={preferences.achievementNotices} onChange={e => update({ achievementNotices: e.target.checked })} />{t.achievements}</label>
    </details>
    <details><summary>{t.appearance}</summary><p>{t.theme}</p><fieldset disabled={!learnerId}><legend>{t.appearance}</legend>
      {(["light", "dark"] as Appearance[]).map(value => <label key={value}><input type="radio" name="learner-appearance" value={value} checked={(preferences.appearance === "dark" ? "dark" : "light") === value} onChange={() => update({ appearance: value })} />{t[value]}</label>)}
    </fieldset></details>
    <p>{learnerId ? t.device : t.learner}</p><p role="status">{status ? t[status] : ""}</p>
    <details><summary>{t.privacy}</summary><p>{t.private}</p><Link href={`/privacy?lang=${language}`}>{t.notice}</Link><p>{t.guardian}</p>
      {signedIn && !guardianSession && <AccountSecurity language={language} minLength={6} />}
      {guardianSession && <Link href={`/family?lang=${language}`}>{t.family}</Link>}
    </details>
    <details><summary>{t.help}</summary>
      {[[t.faq1, t.answer1], [t.faq2, t.answer2], [t.faq3, t.answer3], [t.faq4, t.answer4]].map(([question, answer]) => <div key={question}><h3>{question}</h3><p>{answer}</p></div>)}
      <a href={publicSiteHref("/pricing", language)}>{t.pricing}</a><p>{t.contactHelp}</p>
      <a href={publicSiteHref("/contact", language)}>{t.contact}</a>
    </details>
  </section>;
}
