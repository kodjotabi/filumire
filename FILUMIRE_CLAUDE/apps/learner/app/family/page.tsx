"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AccountSecurity } from "../../components/filumire/AccountSecurity";
import { AccountShell } from "../../components/filumire/AccountShell";
import { TeacherAccess } from "../../components/filumire/TeacherAccess";
import { GuardianPlacement, placementSubjectName } from "../../components/filumire/GuardianPlacement";
import { TutoringRecovery } from "../../components/filumire/TutoringRecovery";
import { LEARNER_AVATARS } from "../../components/filumire/avatars";
import { LEARNER_GRADES } from "../../components/filumire/grades";
import { readLanguage, useLanguage, type Language } from "../../components/filumire/language";
import {
  accountErrorMessage,
  AccountRequestError,
  addLearner,
  applyLearnerProfileToDevice,
  clearLearnerProfileFromDevice,
  destinationFor,
  fetchAccount,
  fetchPlacementChoices,
  selectLearner,
  setLearnerPassword,
  signOut,
  type Account,
  type AccountLearner,
  type PlacementOptions,
} from "../../services/account-client";

/*
 * The guardian's family page: their learners, adding a learner
 * (with consent), opening a learner's learning on this device, and
 * setting a new learner password. Learner accounts go straight to
 * their own learning instead.
 */
const TEXT = {
  en: {
    backLabel: "Back to FILUMIRE home",
    hello: "Hello",
    lead: "Add each learner in your family. Each one signs in with their own username and password and continues where they left off.",
    welcome: "Your family account is ready. Add your first learner below.",
    testTitle: "Test version",
    testBody: "Use made-up test names and details only. Please do not enter real children's information yet.",
    loading: "Loading your family account…",
    learnersTitle: "Your learners",
    none: "No learners yet.",
    username: "Username:",
    setupDone: "Set up",
    setupPending: "First sign-in still to do",
    open: "Start learning on this device",
    opening: "Opening…",
    newPassword: "Set a new password",
    newPasswordLabel: "New password for",
    savePassword: "Save password",
    passwordSaved: "New password saved. Give it to your learner.",
    cancel: "Cancel",
    addTitle: "Add a learner",
    addLead: "Use a first name or nickname. FILUMIRE does not ask for a child's surname, birthday, email or school.",
    name: "First name or nickname",
    usernameLabel: "Username for signing in",
    usernameHelp: "3 to 24 letters or numbers, and . _ or - if you like. It must be unique on FILUMIRE.",
    password: "Password",
    passwordHelp: "At least 6 characters. Your learner will type this to sign in.",
    show: "Show",
    hide: "Hide",
    grade: "Class",
    gradeLater: "Choose later",
    subject: "Subject",
    draftNote: "Private preview: available bilingual activities only. Full curriculum coverage and educational approval remain pending.",
    language: "Learning language",
    consent: "I agree to FILUMIRE keeping this learner's profile and learning records, as described in the privacy notice, so they can continue learning and I can follow their progress.",
    notice: "Privacy notice",
    add: "Add learner",
    adding: "Adding…",
    added: (name: string, username: string) => `${name} can now sign in with the username “${username}” and the password you chose.`,
    progress: "See progress and messages",
    signOut: "Sign out",
  },
  fr: {
    backLabel: "Retour à l'accueil FILUMIRE",
    hello: "Bonjour",
    lead: "Ajoute chaque apprenant de ta famille. Chacun se connecte avec son propre identifiant et mot de passe, et reprend là où il s'était arrêté.",
    welcome: "Ton compte famille est prêt. Ajoute ton premier apprenant ci-dessous.",
    testTitle: "Version de test",
    testBody: "Utilise uniquement des prénoms et informations de test inventés. N'indique pas encore de vraies informations sur un enfant.",
    loading: "Chargement de ton compte famille…",
    learnersTitle: "Tes apprenants",
    none: "Aucun apprenant pour l'instant.",
    username: "Identifiant :",
    setupDone: "Configuré",
    setupPending: "Première connexion à faire",
    open: "Commencer à apprendre sur cet appareil",
    opening: "Ouverture…",
    newPassword: "Choisir un nouveau mot de passe",
    newPasswordLabel: "Nouveau mot de passe pour",
    savePassword: "Enregistrer le mot de passe",
    passwordSaved: "Nouveau mot de passe enregistré. Communique-le à ton apprenant.",
    cancel: "Annuler",
    addTitle: "Ajouter un apprenant",
    addLead: "Utilise un prénom ou un surnom. FILUMIRE ne demande ni le nom de famille, ni la date de naissance, ni l'e-mail, ni l'école d'un enfant.",
    name: "Prénom ou surnom",
    usernameLabel: "Identifiant de connexion",
    usernameHelp: "3 à 24 lettres ou chiffres, avec . _ ou - si tu veux. Il doit être unique sur FILUMIRE.",
    password: "Mot de passe",
    passwordHelp: "Au moins 6 caractères. Ton apprenant le saisira pour se connecter.",
    show: "Afficher",
    hide: "Masquer",
    grade: "Classe",
    gradeLater: "Choisir plus tard",
    subject: "Matière",
    draftNote: "Aperçu privé : activités bilingues disponibles uniquement. Le programme complet et la validation pédagogique restent en attente.",
    language: "Langue d'apprentissage",
    consent: "J'accepte que FILUMIRE conserve le profil et les données d'apprentissage de cet apprenant, comme décrit dans la notice de confidentialité, pour qu'il puisse continuer à apprendre et que je puisse suivre ses progrès.",
    notice: "Notice de confidentialité",
    add: "Ajouter l'apprenant",
    adding: "Ajout…",
    added: (name: string, username: string) => `${name} peut maintenant se connecter avec l'identifiant « ${username} » et le mot de passe choisi.`,
    progress: "Voir les progrès et les messages",
    signOut: "Se déconnecter",
  },
};

function suggestUsername(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 24);
}

function avatarSrc(learner: AccountLearner): string {
  return (
    LEARNER_AVATARS.find((avatar) => avatar.id === learner.avatarId)?.src ??
    LEARNER_AVATARS[0].src
  );
}

function LearnerCard({
  learner,
  language,
  onOpen,
}: {
  learner: AccountLearner;
  language: Language;
  onOpen: (learner: AccountLearner) => Promise<void>;
}) {
  const t = TEXT[language];
  const [opening, setOpening] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function open() {
    setOpening(true);
    setMessage("");
    try {
      await onOpen(learner);
    } catch (error) {
      setOk(false);
      setMessage(accountErrorMessage(error, language));
      setOpening(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await setLearnerPassword(learner.learnerId, password);
      setPassword("");
      setResetting(false);
      setOk(true);
      setMessage(t.passwordSaved);
    } catch (error) {
      setOk(false);
      setMessage(accountErrorMessage(error, language));
    }
    setBusy(false);
  }

  const passwordId = `pw-${learner.learnerId}`;

  return (
    <li className="acCard plain fmLearner">
      <div className="fmWho">
        <img src={avatarSrc(learner)} alt="" />
        <div>
          <h3>{learner.displayName}</h3>
          <p>
            {t.username} <strong>{learner.username}</strong>
          </p>
          <p className="fmStatus">
            {learner.onboardingComplete ? t.setupDone : t.setupPending}
          </p>
        </div>
      </div>
      <div className="acActions">
        <button type="button" className="acButton" onClick={open} disabled={opening} aria-busy={opening}>
          {opening ? t.opening : t.open}
        </button>
        {!resetting ? (
          <button type="button" className="acButton secondary" onClick={() => { setResetting(true); setMessage(""); }}>
            {t.newPassword}
          </button>
        ) : null}
      </div>
      {resetting ? (
        <form className="acForm" onSubmit={savePassword}>
          <div className="acField">
            <label htmlFor={passwordId}>
              {t.newPasswordLabel} {learner.displayName}
            </label>
            <input
              id={passwordId}
              type="text"
              autoComplete="new-password"
              minLength={6}
              maxLength={128}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="acActions">
            <button type="submit" className="acButton green" disabled={busy}>
              {t.savePassword}
            </button>
            <button type="button" className="acButton quiet" onClick={() => setResetting(false)}>
              {t.cancel}
            </button>
          </div>
        </form>
      ) : null}
      <p className={`acMessage${ok ? " ok" : ""}`} role="status">
        {message}
      </p>
      <GuardianPlacement learnerId={learner.learnerId} language={language} />
      <TeacherAccess
        learnerId={learner.learnerId}
        learnerName={learner.displayName}
        language={language}
      />
      <TutoringRecovery learnerId={learner.learnerId} language={language} />
    </li>
  );
}

export default function FamilyPage() {
  const router = useRouter();
  const [language, setLanguage] = useLanguage();
  const t = TEXT[language];
  const [account, setAccount] = useState<Account | null>(null);
  const [loadError, setLoadError] = useState("");
  const [welcome, setWelcome] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [gradeId, setGradeId] = useState("");
  // Server class list; only replaces the primary list when it offers
  // Basic 7-9 (private presentation on), so the default form is unchanged.
  const [choices, setChoices] = useState<PlacementOptions["choices"] | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [learnerLanguage, setLearnerLanguage] = useState<Language | "">("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [invalidField, setInvalidField] = useState<string | undefined>();

  const load = useCallback(async () => {
    let current = await fetchAccount();
    // The mount callback runs before useLanguage's first state update. Read
    // the current URL/device preference instead of its initial English state.
    const currentLanguage = readLanguage();

    if (!current) {
      router.replace(`/login?lang=${currentLanguage}&returnTo=family`);
      return;
    }

    if (current.accountKind !== "guardian") {
      router.replace(destinationFor(current, currentLanguage));
      return;
    }

    // Back on the family page: stop learning as a child on this
    // device so the family controls are never left in a learner
    // session.
    if (current.activeLearnerId) {
      await selectLearner(null);
      clearLearnerProfileFromDevice();
      current = (await fetchAccount()) ?? current;
    }

    setAccount(current);
    fetchPlacementChoices()
      .then((result) => setChoices(result.choices.some((choice) => choice.draft) ? result.choices : null))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setWelcome(new URLSearchParams(window.location.search).get("welcome") === "1");
    load().catch((error) => setLoadError(accountErrorMessage(error, language)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openLearner(learner: AccountLearner) {
    await selectLearner(learner.learnerId);
    applyLearnerProfileToDevice(learner);
    router.push(
      learner.onboardingComplete
        ? `/dashboard?lang=${learner.preferredLanguage}`
        : `/dashboard?lang=${learner.preferredLanguage}&view=setup`,
    );
  }

  const draftChoice = choices?.find((choice) => choice.draft && choice.gradeId === gradeId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setInvalidField(undefined);

    try {
      const created = await addLearner({
        displayName,
        username,
        password,
        gradeId: gradeId || undefined,
        ...(draftChoice ? { curriculumVersionId: draftChoice.curriculumVersionId, subjectId } : {}),
        preferredLanguage: learnerLanguage || language,
        consentsToLearnerData: consent,
      });
      setOk(true);
      setMessage(t.added(displayName.trim(), created.username));
      setDisplayName("");
      setUsername("");
      setUsernameEdited(false);
      setPassword("");
      setGradeId("");
      setSubjectId("");
      setConsent(false);
      setWelcome(false);
      setAccount(await fetchAccount());
    } catch (error) {
      setOk(false);
      setMessage(accountErrorMessage(error, language));
      setInvalidField(
        error instanceof AccountRequestError
          ? error.field ?? (error.code === "login_taken" ? "username" : undefined)
          : undefined,
      );
    }

    setBusy(false);
  }

  async function leave() {
    setBusy(true);
    setMessage("");
    try {
      await signOut();
      router.push(`/login?lang=${language}`);
    } catch (error) {
      setOk(false);
      setMessage(accountErrorMessage(error, language));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountShell
      language={language}
      onLanguage={setLanguage}
      backHref={`/?lang=${language}`}
      backLabel={t.backLabel}
      wide
    >
      {!account ? (
        <p className="acLead" role="status">
          {loadError || t.loading}
        </p>
      ) : (
        <>
          <h1>
            {t.hello}
            {account.displayName ? <>, <span>{account.displayName}</span></> : null}
          </h1>
          <p className="acLead">{t.lead}</p>
          {welcome ? (
            <p className="acMessage ok" role="status">
              {t.welcome}
            </p>
          ) : null}

          <div className="acNotice" role="note">
            <strong>{t.testTitle}</strong>
            {t.testBody}
          </div>

          <section aria-labelledby="family-learners" className="fmSection">
            <h2 id="family-learners">{t.learnersTitle}</h2>
            {account.learners.length === 0 ? (
              <p className="acSmall">{t.none}</p>
            ) : (
              <ul className="fmList">
                {account.learners.map((learner) => (
                  <LearnerCard
                    key={learner.learnerId}
                    learner={learner}
                    language={language}
                    onOpen={openLearner}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="acCard green" aria-labelledby="family-add">
            <h2 id="family-add">{t.addTitle}</h2>
            <p>{t.addLead}</p>
            <form className="acForm" onSubmit={submit} noValidate>
              <div className="acField" data-invalid={invalidField === "displayName"}>
                <label htmlFor="add-name">{t.name}</label>
                <input
                  id="add-name"
                  type="text"
                  autoComplete="off"
                  maxLength={40}
                  required
                  value={displayName}
                  aria-invalid={invalidField === "displayName"}
                  onChange={(event) => {
                    setDisplayName(event.target.value);
                    if (!usernameEdited) setUsername(suggestUsername(event.target.value));
                  }}
                />
              </div>

              <div className="acField" data-invalid={invalidField === "username"}>
                <label htmlFor="add-username">{t.usernameLabel}</label>
                <input
                  id="add-username"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={24}
                  required
                  value={username}
                  aria-describedby="add-username-help"
                  aria-invalid={invalidField === "username"}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setUsernameEdited(true);
                  }}
                />
                <p id="add-username-help" className="acHelp">{t.usernameHelp}</p>
              </div>

              <div className="acField" data-invalid={invalidField === "password"}>
                <label htmlFor="add-password">{t.password}</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    id="add-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={6}
                    maxLength={128}
                    required
                    value={password}
                    aria-describedby="add-password-help"
                    aria-invalid={invalidField === "password"}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="acButton secondary"
                    aria-pressed={showPassword}
                    aria-controls="add-password"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? t.hide : t.show}
                  </button>
                </div>
                <p id="add-password-help" className="acHelp">{t.passwordHelp}</p>
              </div>

              <div className="fmRow">
                <div className="acField">
                  <label htmlFor="add-grade">{t.grade}</label>
                  <select
                    id="add-grade"
                    value={gradeId}
                    onChange={(event) => {
                      const next = choices?.find((choice) => choice.draft && choice.gradeId === event.target.value);
                      setGradeId(event.target.value);
                      setSubjectId(next?.subjects[0]?.id ?? "");
                    }}
                  >
                    <option value="">{t.gradeLater}</option>
                    {choices
                      ? choices.map((choice) => (
                          <option key={choice.gradeId} value={choice.gradeId}>
                            {choice.name}
                          </option>
                        ))
                      : LEARNER_GRADES.map((grade) => (
                          <option key={grade.id} value={grade.id}>
                            {grade.name[language]}
                          </option>
                        ))}
                  </select>
                </div>
                {draftChoice && (
                  <div className="acField">
                    <label htmlFor="add-subject">{t.subject}</label>
                    <select id="add-subject" value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
                      {draftChoice.subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {placementSubjectName(subject, language)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="acField">
                  <label htmlFor="add-language">{t.language}</label>
                  <select
                    id="add-language"
                    value={learnerLanguage || language}
                    onChange={(event) => setLearnerLanguage(event.target.value as Language)}
                  >
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
              </div>
              {draftChoice && <p className="acHelp">{t.draftNote}</p>}

              <label className="acCheck">
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                <span>
                  {t.consent}{" "}
                  <Link href={`/privacy?lang=${language}`} target="_blank" rel="noopener">
                    {t.notice}
                  </Link>
                </span>
              </label>

              <p className={`acMessage${ok ? " ok" : ""}`} role="status">
                {message}
              </p>

              <button type="submit" className="acButton green" disabled={busy} aria-busy={busy}>
                {busy ? t.adding : t.add}
              </button>
            </form>
          </section>

          <AccountSecurity language={language} minLength={8} />

          <div className="acActions">
            <Link href={`/adult?lang=${language}`} className="acButton secondary">
              {t.progress}
            </Link>
            <button type="button" className="acButton quiet" onClick={leave} disabled={busy} aria-busy={busy}>
              {t.signOut}
            </button>
          </div>
        </>
      )}

      <style>{`
        .fmSection { display: grid; gap: 10px; }
        .fmSection h2 { margin: 0; font-size: 20px; font-weight: 800; }
        .fmList { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
        .fmWho { display: flex; align-items: center; gap: 12px; }
        .fmWho img { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; background: var(--ui-blue-tint); }
        .fmWho h3 { margin: 0; font-size: 18px; font-weight: 800; }
        .fmWho p { margin: 2px 0 0; font-size: 14px; color: var(--ui-ink-soft); }
        .fmStatus { font-size: 13px !important; }
        .fmRow { display: grid; gap: 12px; }
        @media (min-width: 640px) {
          .fmRow { grid-template-columns: 1fr 1fr; }
        }
        @media (min-width: 900px) {
          .fmList { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </AccountShell>
  );
}
