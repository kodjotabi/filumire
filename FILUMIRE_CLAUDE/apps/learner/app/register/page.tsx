"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AccountShell } from "../../components/filumire/AccountShell";
import { useLanguage } from "../../components/filumire/language";
import {
  accountErrorMessage,
  AccountRequestError,
  registerGuardian,
} from "../../services/account-client";

/*
 * Parent / guardian registration: the first step of the family
 * journey. The guardian creates the family account and records
 * consent; learners are added on the family page that follows.
 * Nothing about a child is collected here.
 */
const TEXT = {
  en: {
    backLabel: "Back to sign in",
    title: ["Create your", "family account"],
    lead: "Parents and guardians create the account. You will add each learner next, and give them their own username and password.",
    testTitle: "Test version",
    testBody: "FILUMIRE accounts are being tested. Please use made-up test details only. Do not enter real children's names or other personal information until the privacy review is complete.",
    yourName: "Your name",
    yourNameHelp: "How FILUMIRE and teachers will address you.",
    email: "Email address",
    emailHelp: "You will sign in with this email.",
    password: "Password",
    passwordHelp: "At least 8 characters. A short sentence is easy to remember and hard to guess.",
    show: "Show",
    hide: "Hide",
    language: "Preferred language",
    guardian: "I am the parent or legal guardian of the learners I will add to this account.",
    notice: ["I have read the ", "FILUMIRE privacy notice", " and agree to FILUMIRE keeping my account details and my learners' learning records as it describes."],
    consentNote: "We record what you agreed to and when. Ticking these boxes is your declaration; it is not a check of your identity.",
    create: "Create family account",
    creating: "Creating account…",
    haveAccount: "Already have an account?",
    signIn: "Sign in",
  },
  fr: {
    backLabel: "Retour à la connexion",
    title: ["Crée ton", "compte famille"],
    lead: "Ce sont les parents et tuteurs qui créent le compte. Tu ajouteras ensuite chaque apprenant, avec son propre identifiant et son mot de passe.",
    testTitle: "Version de test",
    testBody: "Les comptes FILUMIRE sont en cours de test. Utilise uniquement des informations de test inventées. N'indique pas le vrai prénom d'un enfant ni d'autres informations personnelles avant la fin de l'examen de confidentialité.",
    yourName: "Ton nom",
    yourNameHelp: "Le nom utilisé par FILUMIRE et les enseignants pour s'adresser à toi.",
    email: "Adresse e-mail",
    emailHelp: "Tu te connecteras avec cet e-mail.",
    password: "Mot de passe",
    passwordHelp: "Au moins 8 caractères. Une courte phrase est facile à retenir et difficile à deviner.",
    show: "Afficher",
    hide: "Masquer",
    language: "Langue préférée",
    guardian: "Je suis le parent ou le tuteur légal des apprenants que j'ajouterai à ce compte.",
    notice: ["J'ai lu la ", "notice de confidentialité FILUMIRE", " et j'accepte que FILUMIRE conserve les informations de mon compte et les données d'apprentissage de mes apprenants comme elle le décrit."],
    consentNote: "Nous enregistrons ce que tu as accepté et à quel moment. Cocher ces cases vaut déclaration de ta part ; ce n'est pas une vérification de ton identité.",
    create: "Créer le compte famille",
    creating: "Création du compte…",
    haveAccount: "Tu as déjà un compte ?",
    signIn: "Se connecter",
  },
} as const;

export default function RegisterPage() {
  const router = useRouter();
  const [language, setLanguage] = useLanguage();
  const t = TEXT[language];
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState<"en" | "fr" | "">("");
  const [confirmsGuardian, setConfirmsGuardian] = useState(false);
  const [acceptsNotice, setAcceptsNotice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [invalidField, setInvalidField] = useState<string | undefined>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setInvalidField(undefined);

    try {
      await registerGuardian({
        displayName,
        email,
        password,
        preferredLanguage: preferredLanguage || language,
        confirmsGuardian,
        acceptsNotice,
      });
      setPassword("");
      router.push(`/family?lang=${preferredLanguage || language}&welcome=1`);
    } catch (error) {
      setMessage(accountErrorMessage(error, language));
      setInvalidField(
        error instanceof AccountRequestError
          ? error.field ?? (error.code === "login_taken" ? "email" : undefined)
          : undefined,
      );
      setBusy(false);
    }
  }

  return (
    <AccountShell
      language={language}
      onLanguage={setLanguage}
      backHref={`/login?lang=${language}`}
      backLabel={t.backLabel}
    >
      <h1>
        {t.title[0]} <span>{t.title[1]}</span>
      </h1>
      <p className="acLead">{t.lead}</p>

      <div className="acNotice" role="note">
        <strong>{t.testTitle}</strong>
        {t.testBody}
      </div>

      <section className="acCard" aria-labelledby="register-form-title">
        <h2 id="register-form-title" className="visuallyHidden">
          {t.create}
        </h2>
        <form className="acForm" onSubmit={submit} noValidate>
          <div className="acField" data-invalid={invalidField === "displayName"}>
            <label htmlFor="reg-name">{t.yourName}</label>
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              maxLength={40}
              required
              value={displayName}
              aria-describedby="reg-name-help"
              aria-invalid={invalidField === "displayName"}
              onChange={(event) => setDisplayName(event.target.value)}
            />
            <p id="reg-name-help" className="acHelp">{t.yourNameHelp}</p>
          </div>

          <div className="acField" data-invalid={invalidField === "email"}>
            <label htmlFor="reg-email">{t.email}</label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
              required
              value={email}
              aria-describedby="reg-email-help"
              aria-invalid={invalidField === "email"}
              onChange={(event) => setEmail(event.target.value)}
            />
            <p id="reg-email-help" className="acHelp">{t.emailHelp}</p>
          </div>

          <div className="acField" data-invalid={invalidField === "password"}>
            <label htmlFor="reg-password">{t.password}</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                value={password}
                aria-describedby="reg-password-help"
                aria-invalid={invalidField === "password"}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="acButton secondary"
                aria-pressed={showPassword}
                aria-controls="reg-password"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? t.hide : t.show}
              </button>
            </div>
            <p id="reg-password-help" className="acHelp">{t.passwordHelp}</p>
          </div>

          <div className="acField">
            <label htmlFor="reg-language">{t.language}</label>
            <select
              id="reg-language"
              value={preferredLanguage || language}
              onChange={(event) => setPreferredLanguage(event.target.value as "en" | "fr")}
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>

          <label className="acCheck">
            <input
              type="checkbox"
              checked={confirmsGuardian}
              onChange={(event) => setConfirmsGuardian(event.target.checked)}
            />
            <span>{t.guardian}</span>
          </label>

          <label className="acCheck">
            <input
              type="checkbox"
              checked={acceptsNotice}
              onChange={(event) => setAcceptsNotice(event.target.checked)}
            />
            <span>
              {t.notice[0]}
              <Link href={`/privacy?lang=${language}`} target="_blank" rel="noopener">
                {t.notice[1]}
              </Link>
              {t.notice[2]}
            </span>
          </label>
          <p className="acHelp">{t.consentNote}</p>

          <p className="acMessage" role="alert">
            {message}
          </p>

          <button type="submit" className="acButton green" disabled={busy} aria-busy={busy}>
            {busy ? t.creating : t.create}
          </button>
        </form>
      </section>

      <p className="acSmall">
        {t.haveAccount} <Link href={`/login?lang=${language}`}>{t.signIn}</Link>
      </p>
    </AccountShell>
  );
}
