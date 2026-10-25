"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { LearningRequestOrder } from "../../services/learning-continuity";
import { fetchDashboardSnapshot } from "../../services/learning-client";
import { classUnavailableText, isClassUnavailable } from "../../services/learner-interface";
import { completionPercent } from "../../services/learning-presentation";

import {
  LearningNetworkError,
  LearningRequestError,
  type LearningResponse,
} from "../../services/learning-client";

import {
  LearnerBottomNav,
} from "../../components/filumire/LearnerBottomNav";
import { askFiluHref, dashboardView, navItemForView, setupDestination, setupRedirect } from "../../services/dashboard-navigation";
import { LearnerHeader } from "../../components/filumire/LearnerHeader";
import { LearnerLoadingState } from "../../components/filumire/LearnerLoadingState";
import { SubjectGrid } from "../../components/filumire/SubjectGrid";
import { useAgeBand } from "../../components/filumire/ageBand";
import { MasteryGoalsPanel } from "../../components/filumire/MasteryGoalsPanel";
import { fetchLearningOverview, type LearningOverview } from "../../services/learning-client";
import { SubjectPage } from "../../components/filumire/SubjectPage";
import { ProgressPage } from "../../components/filumire/ProgressPage";
import { ChallengesPage } from "../../components/filumire/ChallengesPage";
import { AskFiluPage } from "../../components/filumire/AskFiluPage";
import { LearnerSignOut } from "../../components/filumire/LearnerSignOut";
import { LearningNotices } from "../../components/filumire/LearningNotices";
import { computeAchievements } from "../../components/filumire/achievements";
import { useLearnerAppearance } from "../../services/interface-preferences";
import ProfilePage from "../../components/filumire/ProfilePage";
import { AVATAR_KEY, LEARNER_AVATARS, useLearnerAvatar } from "../../components/filumire/avatars";
import { findFilumireSubject, subjectLabel, toFilumireSubjects } from "../../components/filumire/subjects";
import { SubjectIcon } from "../../components/filumire/SubjectIcon";
import { useLanguage, withLang } from "../../components/filumire/language";
import {
  SetupClassField,
  setupClassMode,
  setupGradeValue,
  setupSubjectsFor,
} from "../../components/filumire/SetupClassField";
import {
  AccountRequestError,
  accountErrorMessage,
  activeLearner,
  applyLearnerProfileToDevice,
  fetchAccount,
  hasAccountSession,
  saveSignedInLearnerProfile,
  signOut,
  updateLearnerProfile,
  type Account,
} from "../../services/account-client";

type ViewState =
  | "loading"
  | "ready"
  | "unauthenticated"
  | "offline"
  | "unavailable";

/* The subject overview loads separately from the learning session. */
type OverviewState = "loading" | "ready" | "unavailable";

function Chevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

function TileIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {name === "progress" && (
        <g>
          <rect x="3" y="13" width="5" height="8" rx="0.8" />
          <rect x="9.5" y="8" width="5" height="13" rx="0.8" />
          <rect x="16" y="3" width="5" height="18" rx="0.8" />
        </g>
      )}
      {name === "challenge" && (
        <g>
          <path d="M7 3h10v5.5a5 5 0 0 1-10 0z" />
          <path className="line" d="M7 5H3.5v1.5A3.5 3.5 0 0 0 7 10M17 5h3.5v1.5A3.5 3.5 0 0 1 17 10" />
          <rect x="10.8" y="13" width="2.4" height="5" />
          <rect x="7.5" y="18.2" width="9" height="2.8" rx="1.2" />
        </g>
      )}
      {name === "ask" && (
        <g>
          <circle cx="12" cy="3.8" r="1.7" />
          <rect x="11.2" y="5" width="1.6" height="3.2" />
          <rect x="1.5" y="12" width="2.6" height="5" rx="1.3" />
          <rect x="19.9" y="12" width="2.6" height="5" rx="1.3" />
          <rect x="3.8" y="8" width="16.4" height="13" rx="5.5" />
          <circle className="cut" cx="8.8" cy="14" r="1.6" />
          <circle className="cut" cx="15.2" cy="14" r="1.6" />
          <path className="cutline" d="M9.8 17.6c1.2 1.2 3.2 1.2 4.4 0" />
        </g>
      )}
    </svg>
  );
}
const CHIP_TEXT = {
  en: { current: "Currently learning", new: "Start learning", done: "Well done!", good: "Making good progress", going: "Keep going" },
  fr: { current: "En cours", new: "Commencer", done: "Bravo !", good: "Bons progrès", going: "Continue !" },
};

const SETUP_TEXT = {
  en: {
    steps: ["Language", "Account", "Setup", "Start"],
    stepsLabel: "Setup progress",
    title: "Let’s set up your learning",
    intro: "Tell us a little about yourself so FILUMIRE can get things ready for you.",
    note: ["A brighter", "you starts", "here!"],
    name: "Your name",
    namePlaceholder: "Enter your name",
    clear: "Clear name",
    levelRequired: "Choose your class to continue.",
    saving: "Saving…",
    saveFailed: "Your details could not be saved. Check your connection and try again.",
    avatar: "Choose your avatar",
    avatarHelp: "Pick the FILUMIRE learner you would like to represent you.",
    chooseAvatar: "Choose avatar",
    learning: "Your learning",
    learningHelp: "FILUMIRE has prepared these subjects for your class.",
    continue: "Continue",
  },
  fr: {
    steps: ["Langue", "Compte", "Profil", "Début"],
    stepsLabel: "Étapes de configuration",
    title: "Préparons ton apprentissage",
    intro: "Parle-nous un peu de toi pour que FILUMIRE prépare tout pour toi.",
    note: ["Un avenir", "brillant", "commence ici !"],
    name: "Ton prénom",
    namePlaceholder: "Écris ton prénom",
    clear: "Effacer le prénom",
    levelRequired: "Choisis ta classe pour continuer.",
    saving: "Enregistrement…",
    saveFailed: "Tes informations n’ont pas pu être enregistrées. Vérifie ta connexion et réessaie.",
    avatar: "Choisis ton avatar",
    avatarHelp: "Choisis l’apprenant FILUMIRE qui te représente.",
    chooseAvatar: "Choisir l’avatar",
    learning: "Ton apprentissage",
    learningHelp: "FILUMIRE a préparé ces matières pour ta classe.",
    continue: "Continuer",
  },
} as const;

function LearnerDashboardView() {
  const router = useRouter();
  const searchKey = useSearchParams().toString();
  const requestOrder = useRef(new LearningRequestOrder());
  // The signed-in FILUMIRE account, when there is one. Without it
  // (local development) the dashboard runs as the test learner.
  const [account, setAccount] = useState<Account | null>(null);
  const [accountChecked, setAccountChecked] = useState(false);
  const [setupGrade, setSetupGrade] = useState("");
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [language, setLanguage] = useLanguage(searchKey);
  const requestedView = dashboardView(searchKey);
  const view = activeLearner(account)?.onboardingComplete === false ? "setup" : requestedView;
  const selectedSubjectId = new URLSearchParams(searchKey).get("subjectId");
  const afterSetupHref = setupDestination(searchKey, language);

  const [setupName, setSetupName] = useState("");
  const [setupAvatar, setSetupAvatar] = useState("1");
  const [viewState, setViewState] =
    useState<ViewState>("loading");
  // A stored class that is no longer offered: the guardian must choose again.
  const [classUnavailable, setClassUnavailable] = useState(false);
  const [data, setData] =
    useState<LearningResponse | null>(null);
  const [learnerName, setLearnerName] = useState("");
  const learnerAvatarSrc = useLearnerAvatar();
  const [overview, setOverview] = useState<LearningOverview | null>(null);
  const [overviewState, setOverviewState] = useState<OverviewState>("loading");
  const [overviewAttempt, setOverviewAttempt] = useState(0);
  const ageBand = useAgeBand(overview);

  useEffect(() => {
    try {
      const savedName = window.localStorage.getItem("filumire.learnerName") ?? "";
      setLearnerName(savedName);
      setSetupName(savedName);
      const savedAvatar = window.localStorage.getItem(AVATAR_KEY);
      if (LEARNER_AVATARS.some((avatar) => avatar.id === savedAvatar)) {
        setSetupAvatar(savedAvatar as string);
      }
    } catch {
      setLearnerName("");
    }
  }, []);

  useEffect(() => {
    if (!hasAccountSession()) {
      setAccountChecked(true);
      return;
    }

    let alive = true;
    fetchAccount()
      .then((current) => {
        if (!alive || !current) return;

        const learner = activeLearner(current);

        if (!learner) {
          // A guardian who has not chosen a learner belongs on the
          // family page, not in a learner's dashboard.
          if (current.accountKind === "guardian") {
            router.replace(`/family?lang=${language}`);
          }
          return;
        }

        setAccount(current);
        applyLearnerProfileToDevice(learner);
        setLearnerName(learner.displayName);
        setSetupName(learner.displayName);
        if (learner.avatarId) setSetupAvatar(learner.avatarId);

      })
      .catch(() => undefined)
      .finally(() => { if (alive) setAccountChecked(true); });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signedInLearner = activeLearner(account);
  // Required first-time setup: every other view redirects back to it,
  // so navigation that cannot leave setup is not shown.
  const onboarding = signedInLearner?.onboardingComplete === false;
  const appearance = useLearnerAppearance(signedInLearner?.learnerId);

  // The setup class field: nothing editable until the account and
  // the stored class are known; a guardian's class is locked.
  const setupClass = setupClassMode({
    accountPending: !accountChecked,
    signedIn: Boolean(signedInLearner),
    overviewPending: overviewState === "loading" && (viewState === "loading" || viewState === "ready"),
    overview,
  });
  const chosenGrade = setupGradeValue({
    mode: setupClass,
    picked: setupGrade,
    overview,
    onboardingComplete: Boolean(signedInLearner?.onboardingComplete),
  });

  useEffect(() => {
    if (signedInLearner?.onboardingComplete !== false) return;
    const destination = setupRedirect(searchKey, language);
    if (destination) router.replace(destination);
  }, [signedInLearner?.onboardingComplete, searchKey, language, router]);

  const tutoringView = view === "ask-filu";
  const tutorAccountReady = !tutoringView || accountChecked;
  const tutorLearnerId = tutoringView ? signedInLearner?.learnerId : undefined;
  const load = useCallback(async () => {
    if (!tutorAccountReady) return;
    const ticket = requestOrder.current.begin();
    setViewState("loading");

    try {
      if (tutoringView) {
        // Viewing the tutor must not deliver a new scored learning activity.
        // Its own API reads the existing authoritative lesson/assessment state.
        const summary = await fetchLearningOverview(selectedSubjectId ?? undefined);
        if (!requestOrder.current.accepts(ticket)) return;
        if (!summary) {
          if (!tutorLearnerId && process.env.NODE_ENV === "production") throw new LearningRequestError("Sign in required", 401);
          throw new Error("Learning overview unavailable");
        }
        setData(null);
        setOverview(summary);
        setOverviewState("ready");
        setViewState("ready");
        return;
      }
      const result = await fetchDashboardSnapshot(
        selectedSubjectId ?? undefined,
      );
      if (!requestOrder.current.accepts(ticket)) return;
      setData(result);
      setClassUnavailable(false);
      setViewState("ready");
    } catch (err) {
      if (!requestOrder.current.accepts(ticket)) return;
      setData(null);
      setClassUnavailable(isClassUnavailable(err));
      setViewState(
        err instanceof LearningRequestError &&
          err.status === 401
          ? "unauthenticated"
          : err instanceof LearningNetworkError
            ? "offline"
            : "unavailable",
      );
    }
  }, [selectedSubjectId, tutoringView, tutorAccountReady, tutorLearnerId]);

  useEffect(() => {
    const order = requestOrder.current;
    load();
    return () => order.invalidate();
  }, [load, searchKey]);

  useEffect(() => {
    if (!data || viewState !== "ready") return;
    let alive = true;
    setOverviewState("loading");
    setOverview(null);
    fetchLearningOverview(selectedSubjectId || undefined).then((result) => {
      if (!alive) return;
      setOverview(result);
      setOverviewState(result ? "ready" : "unavailable");
    });
    return () => {
      alive = false;
    };
  }, [view, selectedSubjectId, overviewAttempt, data, viewState, language]);

  const retryOverview = () => setOverviewAttempt((n) => n + 1);

  // Subjects for the learner's grade, as returned by the server.
  const subjects = toFilumireSubjects(overview?.availableSubjects);
  // Display order only:the server remains authoritative for availability.
  const learningOrder = ["science", "computing", "mathematics", "english"];
  const learningSubjects = [...subjects].sort((a,b) => learningOrder.indexOf(a.key)-learningOrder.indexOf(b.key));
  // In setup, the subjects of the class being chosen.
  const setupSubjects = toFilumireSubjects(setupSubjectsFor(overview, chosenGrade));
  const currentSubject = findFilumireSubject(subjects, data?.progress.subjectId);

  const homeStat = overview?.subjects[data?.progress.subjectId ?? ""];
  const progressPercent = completionPercent(homeStat);
  const subjectProgressLabel = language === "fr" ? "Objectifs maîtrisés dans cette matière" : "Subject goals mastered";
  const progressUnavailable = language === "fr" ? "Progression indisponible" : "Progress unavailable";

  const copy =
    language === "fr"
      ? {
          hello: "Bonjour !",
          continueLearning: "Continuer l'apprentissage",
          today: "Apprentissage du jour",
          learning: "Mon apprentissage",
          learningIntro:
            "Choisis une matière pour continuer.",
          progress: "Ma progression",
          challenges: "Défis et réussites",
          askFilu: "Demander à FILU",
          profile: "Mon profil",
          preparing:
            "Préparation de ton parcours...",
          signIn: "Connecte-toi pour continuer",
          signInBody:
            "Connecte-toi pour poursuivre ton parcours d'apprentissage.",
          signInButton: "Aller à la connexion",
          offline: "Tu es hors ligne",
          offlineBody:
            "FILUMIRE n'arrive pas à joindre le serveur. Vérifie ta connexion puis réessaie.",
          unavailable:
            "L'apprentissage n'est pas disponible pour le moment",
          unavailableBody:
            "Nous n'avons pas pu charger ton parcours. Réessaie.",
          overviewUnavailable: "Tes matières n'ont pas pu être chargées.",
          noSubjects: "Aucune matière n'est encore prête pour ta classe. Ton enseignant peut t'aider.",
          retry: "Réessayer",
          continue: "Continuer",
          completed: "objectifs maîtrisés",
          recommended: "Recommandé ensuite",
          backHome: "Retour à l'accueil",
          learningFallback: "Apprentissage",
          readyTitle: "Prêt à continuer ?",
        }
      : {
          hello: "Hello!",
          continueLearning: "Continue Learning",
          today: "Today's Learning",
          learning: "My Learning",
          learningIntro:
            "Choose a subject to continue learning.",
          progress: "My Progress",
          challenges: "Challenges & Achievements",
          askFilu: "Ask FILU",
          profile: "My Profile",
          preparing:
            "Preparing your learning journey...",
          signIn: "Please sign in",
          signInBody:
            "Sign in to continue your learning journey.",
          signInButton: "Go to sign in",
          offline: "You're offline",
          offlineBody:
            "FILUMIRE can't reach the server. Check your connection and try again.",
          unavailable:
            "Learning isn't available right now",
          unavailableBody:
            "We couldn't load your learning journey. Please try again.",
          overviewUnavailable: "Your subjects couldn't be loaded.",
          noSubjects: "No subjects are ready for your class yet. Your teacher can help.",
          retry: "Try again",
          continue: "Continue",
          completed: "learning goals mastered",
          recommended: "Recommended Next",
          backHome: "Back to Home",
          learningFallback: "Learning",
          readyTitle: "Ready to continue learning?",
        };

  const subjectName =
    currentSubject?.name ?? data?.progress.subjectName ?? copy.learningFallback;
  const competencyTitle =
    data?.progress.competencyTitle ??
    copy.readyTitle;
  const completedCompetencies =
    data?.progress.completedCompetencies ?? 0;
  const competencyCount =
    data?.progress.competencyCount ?? 0;

  const selectedSubject =
    findFilumireSubject(subjects, selectedSubjectId);

  const selectedLearnHref = selectedSubject
    ? `/learn?lang=${language}&subjectId=${encodeURIComponent(
        selectedSubject.subjectId,
      )}`
    : null;

  const learnHref =
    `/learn?lang=${language}`;
  const assistantSubjectId = selectedSubjectId ?? data?.progress.subjectId;

  function saveLearnerProfile() {
    try {
      const name = setupName.trim();
      window.localStorage.setItem(AVATAR_KEY, setupAvatar);
      window.dispatchEvent(new Event("filumire-avatar"));
      if (name) {
        window.localStorage.setItem("filumire.learnerName", name);
        setLearnerName(name);
      }
    } catch {
      /* storage unavailable: the greeting falls back to a plain hello */
    }
  }

  /*
   * Finishing first-time setup. A signed-in learner's name, avatar
   * and class are saved to their account (and onboarding marked
   * done) before moving on; the reload picks up the new class's
   * subjects. The local test learner keeps the device-only save.
   */
  async function finishSetup(event: { preventDefault(): void }) {
    // Nothing is saved until the account and the class are known.
    if (setupSaving || setupClass === "loading") { event.preventDefault(); return; }
    saveLearnerProfile();

    if (!signedInLearner) return;

    event.preventDefault();

    if (!chosenGrade) {
      setSetupError(SETUP_TEXT[language].levelRequired);
      return;
    }

    setSetupSaving(true);
    setSetupError("");

    try {
      await updateLearnerProfile(signedInLearner.learnerId, {
        ...(setupName.trim() ? { displayName: setupName.trim() } : {}),
        avatarId: setupAvatar,
        gradeId: chosenGrade,
        completeOnboarding: true,
      });
      window.location.assign(afterSetupHref);
    } catch (error) {
      setSetupError(
        error instanceof AccountRequestError
          ? accountErrorMessage(error, language)
          : SETUP_TEXT[language].saveFailed,
      );
      setSetupSaving(false);
    }
  }

  const homeText =
    language === "fr"
      ? {
          helloPre: learnerName ? "Bonjour, " : "Bonjour !", helloName: learnerName, helloPost: learnerName ? " !" : "",
          greetingA: "Ravi de te revoir.",
          greetingB: "Continuons à apprendre !",
          note: ["Progresser", "aujourd’hui,", "demain sera", "plus beau !"],
          of: "sur",
          goalsShort: "objectifs maîtrisés",
          today: "Apprentissage du jour",
          seeAll: "Tout voir",
          tileProgress: "Vois où tu en es.",
          challengeTitle: "Défi du jour",
          tileChallenge: "Un nouveau défi pour toi !",
          tileAsk: "Obtiens de l’aide. Explore plus.",
          footer: "Mêmes apprenants. Des avenirs plus brillants.",
          taglines: {
            english: "Lis. Réfléchis. Exprime-toi.",
            mathematics: "Résous. Progresse.",
            science: "Explore. Découvre.",
            computing: "Crée. Résous.",
          },
        }
      : {
          helloPre: learnerName ? "Hello, " : "Hello!", helloName: learnerName, helloPost: learnerName ? "!" : "",
          greetingA: "Great to see you again.",
          greetingB: "Let’s keep learning!",
          note: ["Progress", "today", "brighter", "tomorrow!"],
          of: "of",
          goalsShort: "goals mastered",
          today: "Today’s Learning",
          seeAll: "See All",
          tileProgress: "See how you’re doing.",
          challengeTitle: "Today’s Challenge",
          tileChallenge: "A new challenge for you!",
          tileAsk: "Get help. Explore more.",
          footer: "Same learners. Brighter futures.",
          taglines: {
            english: "Read. Think. Express.",
            mathematics: "Solve. Reason. Grow.",
            science: "Explore. Discover. Apply.",
            computing: "Create. Solve. Belong.",
          },
        };

  const setupText = SETUP_TEXT[language];

  /* Shown where the subject list would be when it is loading,
     unavailable or (for a new grade) empty. */
  function subjectsNotice() {
    if (overviewState === "loading") {
      return (
        <div className="fSkeleton" aria-busy="true" aria-label={copy.preparing}>
          <span />
          <span />
        </div>
      );
    }

    if (overviewState === "unavailable") {
      return (
        <div className="fState inline" role="alert">
          <p>{copy.overviewUnavailable}</p>
          <button type="button" className="fButton secondary" onClick={retryOverview}>
            {copy.retry}
          </button>
        </div>
      );
    }

    if (subjects.length === 0) {
      return (
        <div className="fState inline" role="status">
          <p>{copy.noSubjects}</p>
        </div>
      );
    }

    return null;
  }

  return (
    <main className={onboarding ? "learnerPage learnerUi learnerOnboarding" : "learnerPage learnerUi"} lang={language} data-appearance={appearance} data-age-band={ageBand}>
      <a className="filumireSkipLink" href="#learner-main">
        {language === "fr" ? "Aller au contenu" : "Skip to content"}
      </a>
      <div className="learnerShell">
        <LearningNotices learnerId={signedInLearner?.learnerId} language={language} completed={overview ? Object.values(overview.subjects).reduce((n, item) => n + item.completed, 0) : undefined} achievements={overview ? computeAchievements(Object.values(overview.subjects), language).filter(item => item.earned).map(item => item.id).join(",") : ""} />
        {(
          <LearnerHeader
                    language={language}
                    subjectId={assistantSubjectId}
                    setupHeader={view === "setup" || view === "progress" || view === "challenges" || view === "ask-filu" || view === "profile"}
                    showAskFilu={view !== "ask-filu"}
                    onboarding={onboarding}
                    backHref={
                      view === "home" || (view === "learning" && !selectedSubjectId)
                        ? undefined
                        : view === "learning"
                          ? "/dashboard?view=learning"
                          : "/dashboard"
                    }
                  />
        )}

        <div id="learner-main" className="learnerMainRegion" tabIndex={-1}>
        {(!accountChecked || viewState === "loading") && (
          <section className="fState" aria-busy="true">
            <div className="fSpinner" />
            <p role="status">{copy.preparing}</p>
          </section>
        )}

        {accountChecked && viewState === "unauthenticated" && (
          <section className="fState">
            <span className="fStateIcon" aria-hidden="true">?</span>
            <h1>{copy.signIn}</h1>
            <p>{copy.signInBody}</p>
            <div className="fStateActions">
              <Link
                href={`/login?lang=${language}`}
                className="fButton"
              >
                {copy.signInButton}
              </Link>
            </div>
          </section>
        )}

        {accountChecked && (viewState === "unavailable" || viewState === "offline") && (
          <section className="fState" role="alert">
            <span className="fStateIcon warn" aria-hidden="true">!</span>
            <h1>{viewState === "offline" ? copy.offline : copy.unavailable}</h1>
            <p>{viewState === "offline" ? copy.offlineBody : classUnavailable ? classUnavailableText(language) : copy.unavailableBody}</p>
            <div className="fStateActions">
              <button
                type="button"
                onClick={load}
                className="fButton"
              >
                {copy.retry}
              </button>
            </div>
          </section>
        )}

        {accountChecked && viewState === "ready" && view === "ask-filu" && overview && (
          <div className="learnerContent homeScreen">
            <AskFiluPage
              band={ageBand}
              conversationScope={signedInLearner?.learnerId}
              conversationContext={overview.activeSubjectId}
              language={language}
              subjectName={overview.availableSubjects.find(subject => subject.id === overview.activeSubjectId)?.name ?? subjectName}
              topic={language === "fr" ? "Ta leçon actuelle" : "Your current lesson"}
              done={overview.subjects[overview.activeSubjectId]?.completed ?? 0}
              total={overview.subjects[overview.activeSubjectId]?.total ?? 0}
              subjectProgress={overview.subjects[overview.activeSubjectId]}
              lessonHref={`${learnHref}&subjectId=${encodeURIComponent(overview.activeSubjectId)}`}
              elements={[]}
            />
          </div>
        )}

        {accountChecked && viewState === "ready" && data && (
          <>
            {view === "setup" && (
              <div className="learnerContent approvedSetup">
                {new URLSearchParams(searchKey).get("returnTo") === "ask-filu" && (
                  <p role="status" className="fState inline">
                    {language === "fr"
                      ? "Termine la configuration de ton profil pour ouvrir FILU."
                      : "Finish learner setup to open Ask FILU."}
                  </p>
                )}
                <ol className="setupSteps" aria-label={setupText.stepsLabel}>
                  {setupText.steps.map((step, index) => (
                    <li
                      key={step}
                      className={`setupStep ${index < 2 ? "complete" : index === 2 ? "active" : "start"}`}
                      aria-current={index === 2 ? "step" : undefined}
                    >
                      <span>{index + 1}</span>
                      <small>{step}</small>
                    </li>
                  ))}
                </ol>

                <section className="approvedSetupIntro">
                  <h1>{setupText.title}</h1>
                  <p>{setupText.intro}</p>
                  <div className="setupNote" aria-hidden="true">
                    {setupText.note[0]}<br />{setupText.note[1]}<br />{setupText.note[2]}
                  </div>
                </section>

                <section className="setupFields">
                  <div className="setupField name">
                    <span className="setupFieldIcon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
                      </svg>
                    </span>
                    <div className="setupFieldBody">
                      <label className="setupFieldLabel" htmlFor="setupName">
                        {setupText.name}
                      </label>
                      <div className="setupInputWrap">
                        <input
                          id="setupName"
                          className="setupInput"
                          type="text"
                          autoComplete="given-name"
                          maxLength={40}
                          value={setupName}
                          onChange={(event) => setSetupName(event.target.value)}
                          placeholder={setupText.namePlaceholder}
                        />
                        {setupName && (
                          <button
                            type="button"
                            className="setupClear"
                            onClick={() => setSetupName("")}
                            aria-label={setupText.clear}
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="setupField level">
                    <span className="setupFieldIcon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path d="M12 4 1 9l11 5 9-4.1V16h2V9L12 4z" />
                        <path d="M5 13.2V17c0 1.7 3.1 3 7 3s7-1.3 7-3v-3.8l-7 3.2-7-3.2z" />
                      </svg>
                    </span>
                    <div className="setupFieldBody">
                      {/* The grade is stored on the server and decides which
                          curriculum the learner sees. */}
                      <SetupClassField
                        mode={setupClass}
                        language={language}
                        value={chosenGrade}
                        gradeName={overview?.gradeName}
                        onChange={setSetupGrade}
                      />
                    </div>
                  </div>
                </section>

                <section className="setupAvatarSection">
                  <div className="setupSectionTitle">
                    <span className="setupAvatarTitleIcon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="11" fill="#9b6bec" />
                        <circle cx="8.5" cy="10" r="1.5" fill="#ffffff" />
                        <circle cx="15.5" cy="10" r="1.5" fill="#ffffff" />
                        <path d="M7.5 14.5c1 2.6 3 3.5 4.5 3.5s3.5-.9 4.5-3.5z" fill="#ffffff" />
                      </svg>
                    </span>
                    <div className="setupAvatarText">
                      <strong id="setupAvatarTitle">{setupText.avatar}</strong>
                      <small>{setupText.avatarHelp}</small>
                    </div>
                  </div>

                  <div
                    className="setupAvatarChoices"
                    role="group"
                    aria-labelledby="setupAvatarTitle"
                  >
                    {LEARNER_AVATARS.map((avatar, index) => (
                      <button
                        key={avatar.id}
                        type="button"
                        className={`setupAvatarChoice ${
                          setupAvatar === avatar.id ? "selected" : ""
                        }`}
                        onClick={() => setSetupAvatar(avatar.id)}
                        aria-pressed={setupAvatar === avatar.id}
                        aria-label={`${setupText.chooseAvatar} ${index + 1}`}
                      >
                        <img className="setupAvatarImg" src={avatar.src} alt="" />
                        {setupAvatar === avatar.id && (
                          <span className="setupAvatarCheck" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                              <path d="M5 12.5l4.5 4.5L19 7.5" />
                            </svg>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="approvedSetupSubjects">
                  <div className="setupLearningHeading">
                    <span className="setupLearningIcon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path d="M12 6c-1.8-1.3-4-1.8-7-1.8v13c3 0 5.2.5 7 1.8 1.8-1.3 4-1.8 7-1.8v-13c-3 0-5.2.5-7 1.8z" />
                      </svg>
                    </span>
                    <div className="setupLearningText">
                      <strong>{setupText.learning}</strong>
                      <small>{setupText.learningHelp}</small>
                    </div>
                  </div>

                  <div className="setupSubjectGridWrap">
                    {setupSubjects.length > 0 ? (
                      <SubjectGrid language={language} subjects={setupSubjects} compact />
                    ) : (
                      subjectsNotice()
                    )}
                  </div>
                </section>

                {setupError ? (
                  <p className="fState inline" role="alert">{setupError}</p>
                ) : null}
                <div className="setupFooterScene">
                  <svg className="setupScene" viewBox="0 0 390 56" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
                    <path d="M0 14C30 2 70-2 110 8C150 18 200 4 260 10C320 16 360 6 390 16V56H0Z" fill="#cfe6fa" />
                    <path d="M0 34C60 24 110 28 170 34C230 40 300 28 390 36V56H0Z" fill="#a6d4fb" />
                    <path d="M250 42H283L282 50Q266 52 251 51Z" fill="#ffd966" />
                    <path d="M0 48C70 43 140 46 210 44C280 42 340 46 390 42V56H0Z" fill="#66b3f8" />
                    <ellipse cx="40" cy="38" rx="26" ry="5" fill="#1f78d6" />
                    <path d="M38 42L35 56H44L41 42Z" fill="#1f78d6" />
                    <ellipse cx="108" cy="46" rx="11" ry="3.5" fill="#2077d4" />
                    <ellipse cx="372" cy="20" rx="16" ry="5" fill="#0a4aa6" />
                    <path d="M371 24L369 56H376L374 24Z" fill="#1f78d6" />
                  </svg>
                  <Link
                    href={afterSetupHref}
                    className="approvedSetupContinue"
                    onClick={finishSetup}
                    aria-disabled={setupSaving}
                    aria-busy={setupSaving}
                  >
                    <span>{setupSaving ? setupText.saving : setupText.continue}</span>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </Link>
                </div>
              </div>
            )}
            {view === "home" && (
              <div className="learnerContent homeScreen homeView">
                <section className="homeGreeting">
                  <h1>{homeText.helloPre}{homeText.helloName ? <span>{homeText.helloName}</span> : null}{homeText.helloPost}</h1>
                  <p>
                    {homeText.greetingA}
                    <br />
                    {homeText.greetingB}
                  </p>
                  <div className="homeNote" aria-hidden="true">
                    {homeText.note.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </div>
                </section>

                <section className="homeContinue" aria-labelledby="home-continue-title">
<img className="homeContinueArt" src={learnerAvatarSrc} alt="" />
                  <span className="homeEyebrow">{copy.continueLearning}</span>
                  <div className="homeContinueHead">
                    <span className={`homeSubjectIcon big ${currentSubject?.key ?? "english"}`}>
                      <SubjectIcon name={currentSubject?.key ?? "english"} />
                    </span>
                    <div>
                      <h2 id="home-continue-title">{subjectLabel(subjectName, language)}</h2>
                      <p>{competencyTitle}</p>
                    </div>
                  </div>

                  <div
                    className="homeTrack"
                    role={progressPercent === null ? undefined : "progressbar"}
                    aria-label={subjectProgressLabel}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressPercent ?? undefined}
                  >
                    <div className="homeTrackFill" style={{ width: `${progressPercent ?? 0}%` }} />
                  </div>
                  <div className="homeTrackMeta">
                    <span>
                      {homeStat ? `${homeStat.completed} ${homeText.of} ${homeStat.total} ${copy.completed}` : progressUnavailable}
                    </span>
                    <strong>{progressPercent === null ? "—" : `${progressPercent}%`}</strong>
                  </div>

                  <Link href={learnHref} className="homeCta">
                    {copy.continueLearning}
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </Link>
                </section>

                {ageBand === "junior-high" && (
                  <MasteryGoalsPanel subjects={subjects} counts={overview?.subjects} language={language} />
                )}

                <section className="homeToday">
                  <div className="homeSectionHead">
                    <h2>{homeText.today}</h2>
                    <Link href={`/dashboard?lang=${language}&view=learning`} className="homeSeeAll">
                      {homeText.seeAll}
                      <Chevron />
                    </Link>
                  </div>

                  {subjectsNotice()}

                  <div className="homeSubjects">
                    {subjects.map((subject) => {
                      const isCurrent = currentSubject?.key === subject.key;
                      return (
                        <Link
                          key={subject.key}
                          href={`/dashboard?lang=${language}&view=learning&subjectId=${subject.subjectId}`}
                          className={`homeSubject ${subject.key}`}
                        >
                          <span className="homeSubjectIcon">
                            <SubjectIcon name={subject.key} />
                          </span>
                          <span className="homeSubjectText">
                            <strong>{subjectLabel(subject.name, language, true)}</strong>
                            <small>{homeText.taglines[subject.key]}</small>
                          </span>
                          <Chevron className="homeChevron" />
                          {isCurrent ? (
                            <span className="homeSubjectProgress">
                              <span className="homeMiniTrack">
                                <span style={{ width: `${progressPercent ?? 0}%` }} />
                              </span>
                              <span className="homeMiniMeta">
                                <span>
                                  {homeStat ? `${homeStat.completed} ${homeText.of} ${homeStat.total} ${homeText.goalsShort}` : progressUnavailable}
                                </span>
                                <strong>{progressPercent === null ? "—" : `${progressPercent}%`}</strong>
                              </span>
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                </section>

                <section className="homeTiles">
                  <Link href={`/dashboard?lang=${language}&view=progress`} className="homeTile progress">
                    <span className="homeTileIcon"><TileIcon name="progress" /></span>
                    <strong>{copy.progress}</strong>
                    <small>{homeText.tileProgress}</small>
                    <Chevron className="homeChevron" />
                  </Link>
                  <Link href={`/dashboard?lang=${language}&view=challenges`} className="homeTile challenge">
                    <span className="homeTileIcon"><TileIcon name="challenge" /></span>
                    <strong>{homeText.challengeTitle}</strong>
                    <small>{homeText.tileChallenge}</small>
                    <Chevron className="homeChevron" />
                  </Link>
                  <Link href={askFiluHref(language, data?.progress.subjectId)} className="homeTile ask">
                    <span className="homeTileIcon"><TileIcon name="ask" /></span>
                    <strong>{copy.askFilu}</strong>
                    <small>{homeText.tileAsk}</small>
                    <Chevron className="homeChevron" />
                  </Link>
                </section>

                <section className="homeFooter">
                  <img src="/images/home/landscape%20footer.png" alt="" />
                  <p>{homeText.footer}</p>
                </section>
              </div>
            )}

            {view === "learning" && (
              <div className={`learnerContent homeScreen ${selectedSubject ? "subjectView" : "learningView"}`}>
                {selectedSubjectId && !selectedSubject ? (
                  overviewState === "loading" ? (
                    subjectsNotice()
                  ) : (
                    <section className="fState inline" role="alert">
                      <h1>{language === "fr" ? "Matière introuvable" : "Subject not found"}</h1>
                      <p>
                        {overviewState === "unavailable"
                          ? copy.overviewUnavailable
                          : language === "fr"
                            ? "Cette matière n’est pas disponible pour ta classe."
                            : "This subject isn’t available for your class."}
                      </p>
                      <div className="fStateActions">
                        {overviewState === "unavailable" ? (
                          <button type="button" className="fButton" onClick={retryOverview}>
                            {copy.retry}
                          </button>
                        ) : null}
                        <Link href={withLang("/dashboard?view=learning", language)} className="fButton secondary">
                          {copy.learning}
                        </Link>
                      </div>
                    </section>
                  )
                ) : !selectedSubject ? (
                  <>
                    <section className="homeGreeting">
                      <h1>
                        {language === "fr" ? "Mon " : "My "}
                        <span>{language === "fr" ? "apprentissage" : "Learning"}</span>
                      </h1>
                      <p>
                        {language === "fr" ? "Explore tes matières" : "Explore your subjects"}
                        <br />
                        {language === "fr" ? "et continue à progresser." : "and keep making progress."}
                      </p>
                      <div className="homeNote" aria-hidden="true">
                        {(language === "fr" ? ["Petits pas,", "grands", "progrès !"] : ["Small", "steps", "big progress!"]).map((word) => (
                          <span key={word}>{word}</span>
                        ))}
                      </div>
                    </section>

                    {subjectsNotice()}

                    <section className="learningNext">
                      <h2>{language === "fr" ? "Suivant recommandé" : "Recommended Next"}</h2>
                      <p className="learningNextSub">{language === "fr" ? "Selon ton apprentissage récent" : "Based on your recent learning"}</p>
                      <div className={`learningNextItem ${currentSubject?.key ?? "english"}`}>
                        <span className="homeSubjectIcon">
                          <SubjectIcon name={currentSubject?.key ?? "english"} />
                        </span>
                        <div>
                          <span className="learningNextTag">{subjectLabel(subjectName, language)}</span>
                          <strong>{competencyTitle}</strong>
                        </div>
                        <span className="learningNextNote" aria-hidden="true">{language === "fr" ? "Tu peux le faire !" : "You can do this!"}</span>
                        <img className="learningNextArt" src={learnerAvatarSrc} alt="" />
                      </div>
                      <Link href={learnHref} className="learningStart">
                        {language === "fr" ? "Commencer" : "Start Learning"}
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </Link>
                    </section>

                    <div className="homeSubjects">
                      {learningSubjects.map((subject) => {
                        const isCurrent = currentSubject?.key === subject.key;
                        const st = overview?.subjects[subject.subjectId];
                        const total = st?.total ?? 0;
                        const done = st?.completed ?? 0;
                        const started = st ? st.tracked > 0 || done > 0 : false;
                        const percent = completionPercent(st);
                        const tone = isCurrent ? "current" : !started ? "new" : total > 0 && done >= total ? "done" : done > 0 ? "good" : "going";
                        return (
                          <Link
                            key={subject.key}
                            href={`/dashboard?lang=${language}&view=learning&subjectId=${subject.subjectId}`}
                            className={`homeSubject ${subject.key}`}
                          >
                            <span className="homeSubjectIcon">
                              <SubjectIcon name={subject.key} />
                            </span>
                            <span className="homeSubjectText">
                              <strong>{subjectLabel(subject.name, language)}</strong>
                              <small>{homeText.taglines[subject.key]}</small>
                            </span>
                            <Chevron className="homeChevron" />
                            <span className="homeSubjectProgress">
                                {started ? (
                                  <>
                                    <span
                                      className="homeMiniTrack"
                                      role={percent === null ? undefined : "progressbar"}
                                      aria-label={`${subjectLabel(subject.name, language)}: ${subjectProgressLabel}`}
                                      aria-valuemin={0}
                                      aria-valuemax={100}
                                      aria-valuenow={percent ?? undefined}
                                    ><span style={{ width: `${percent ?? 0}%` }} /></span>
                                    <span className="homeMiniMeta">
                                      <span>{done} {homeText.of} {total} {homeText.goalsShort}</span>
                                      <strong>{percent === null ? "—" : `${percent}%`}</strong>
                                    </span>
                                  </>
                                ) : null}
                                <span className="learningChip">{CHIP_TEXT[language][tone]}</span>
                              </span>
                          </Link>
                        );
                      })}
                    </div>



                    <section className="homeFooter hand">
                  <img src="/images/home/landscape%20footer.png" alt="" />
                  <p>{language === "fr" ? "Apprendre aujourd’hui pour un avenir plus radieux." : "Learning today for a brighter tomorrow."}</p>
                </section>
                  </>
                ) : (
                  <>
                    <SubjectPage
                      subject={selectedSubject}
                      language={language}
                      overview={overview}
                      currentTitle={currentSubject?.key === selectedSubject.key ? competencyTitle : ""}
                      learnHref={selectedLearnHref}
                      icon={<SubjectIcon name={selectedSubject.key} />}
                      footer={<section className="homeFooter">
                  <img src="/images/home/landscape%20footer.png" alt="" />

                </section>}
                    />
                  </>
                )}
              </div>
            )}
            {view === "progress" && (
              <div className="learnerContent homeScreen">
                <ProgressPage
                  language={language}
                  band={ageBand}
                  overview={overview}
                  overviewState={overviewState}
                  onRetry={retryOverview}
                  current={{
                    subjectName: subjectLabel(subjectName, language),
                    title: competencyTitle,
                    mastery: data.progress.masteryEstimate,
                    confidence: data.progress.confidence,
                    evidenceCount: data.progress.evidenceCount,
                    readiness: data.progress.readiness,
                    progressStatus: data.progress.progressStatus,
                    assessmentScope: data.progress.assessmentScope,
                    learnHref,
                  }}
                  renderIcon={(key) => <SubjectIcon name={key} />}
                />
              </div>
            )}

            {view === "challenges" && (<div className="learnerContent homeScreen"><ChallengesPage language={language} band={ageBand} overview={overview} overviewState={overviewState} onRetry={retryOverview} renderIcon={(key) => <SubjectIcon name={key} />} current={{ subjectId: data?.progress.subjectId ?? "", subjectName, title: competencyTitle, done: completedCompetencies, total: competencyCount, startHref: learnHref }} /></div>)}

      {view === "profile" && (
        <div className="learnerContent homeScreen">
          <ProfilePage
            band={ageBand}
            learnerId={signedInLearner?.learnerId}
            language={language}
            onLanguage={(value) => {
              setLanguage(value);
              return saveSignedInLearnerProfile({ preferredLanguage: value });
            }}
            signedIn={Boolean(signedInLearner)}
            guardianSession={account?.accountKind === "guardian"}
            onSignOut={async () => {
              await signOut();
              window.location.assign(`/login?lang=${language}`);
            }}
            onAvatar={(avatarId: string) => saveSignedInLearnerProfile({ avatarId })}
            name={learnerName}
            onRename={(value: string) => {
              const saved = saveSignedInLearnerProfile({ displayName: value });
              try {
                window.localStorage.setItem("filumire.learnerName", value);
              } catch {
                /* storage unavailable: the name lasts for this visit */
              }
              setLearnerName(value);
              return saved;
            }}
            overview={overview}
            gradeName={overview?.gradeName ?? ""}
          />
        </div>
      )}
          </>
        )}
        </div>

        {account && view !== "profile" && <LearnerSignOut language={language} />}
        {!onboarding && <LearnerBottomNav active={navItemForView(view)} language={language} subjectId={assistantSubjectId} band={ageBand} />}
      </div>

      <style jsx>{`
        .page03Artwork {
          position: relative;
          width: min(100%, 394px);
          margin: 0 auto;
          line-height: 0;
          overflow: hidden;
        }

        .page03ArtworkImage {
          display: block;
          width: 100%;
          height: auto;
        }

        .page03Hotspot {
          position: absolute;
          z-index: 2;
          display: block;
        }

        .page03Back {
          left: 3%;
          top: 1.5%;
          width: 18%;
          height: 5%;
        }

        .page03AskFilu {
          right: 10%;
          top: 1.5%;
          width: 22%;
          height: 5%;
        }

        .page03Continue {
          left: 5%;
          right: 5%;
          top: 78%;
          height: 7%;
        }
        .page03Home,
        .page03Learning,
        .page03Progress,
        .page03Challenges,
        .page03BottomFilu {
          bottom: 0;
          width: 20%;
          height: 8%;
        }

        .page03Home { left: 0; }
        .page03Learning { left: 20%; }
        .page03Progress { left: 40%; }
        .page03Challenges { left: 60%; }
        .page03BottomFilu { left: 80%; }
        .learnerPage {
          min-height: 100vh;
          background: var(--filumire-bg);
          color: var(--filumire-text);
        }

        .learnerShell {
          width: 100%;
          max-width: var(--filumire-mobile-width);
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          margin: 0 auto;
          background: var(--filumire-surface);
          box-shadow: 0 0 0 1px rgba(0, 59, 113, 0.05);
        }

        .learnerContent {
          padding: 24px 18px 28px;
        }

        .learnerWelcome p,
        .pageHeading p {
          margin: 0;
          color: var(--filumire-muted);
          font-size: 13px;
          line-height: 1.5;
        }

        .learnerWelcome h1,
        .pageHeading h1 {
          margin: 5px 0 0;
          color: var(--filumire-navy);
          font-size: 25px;
          line-height: 1.15;
        }

        .continueCard,
        .progressSummaryCard,
        .filuCard,
        .profileCard {
          margin-top: 20px;
          padding: 20px;
          border: 1px solid var(--filumire-border);
          border-radius: var(--filumire-radius-lg);
          background: #ffffff;
          box-shadow: var(--filumire-shadow);
        }

        .sectionEyebrow {
          color: var(--filumire-blue);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .continueCard h2,
        .progressSummaryCard h2,
        .filuCard h2,
        .profileCard h2 {
          margin: 7px 0 0;
          color: var(--filumire-navy);
          font-size: 20px;
          line-height: 1.2;
        }

        .competencyTitle,
        .progressSummaryCard p,
        .filuCard p,
        .profileCard p {
          margin: 7px 0 0;
          color: var(--filumire-muted);
          font-size: 13px;
          line-height: 1.5;
        }



        .learnerProgressTrack {
          width: 100%;
          height: 9px;
          overflow: hidden;
          border-radius: 999px;
          background: #e8f0f5;
        }

        .learnerProgressFill {
          height: 100%;
          border-radius: inherit;
          background: var(--filumire-green);
        }


        .learnerPrimaryButton {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 48px;
          margin-top: 18px;
          padding: 11px 16px;
          border: 0;
          border-radius: 13px;
          background: var(--filumire-blue);
          color: #ffffff;
          font: inherit;
          font-size: 14px;
          font-weight: 800;
          text-align: center;
          text-decoration: none;
        }










        .pageHeading {
          padding-bottom: 4px;
        }

        .challengeCard {
          margin-top: 20px;
          padding: 20px;
          border: 1px solid var(--filumire-border);
          border-radius: var(--filumire-radius-lg);
          background: #ffffff;
          box-shadow: var(--filumire-shadow);
        }

        .challengeTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .challengeCount {
          display: grid;
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          place-items: center;
          border-radius: 14px;
          background: var(--filumire-blue-soft);
          color: var(--filumire-navy);
          font-size: 18px;
          font-weight: 800;
        }

        .challengeCard h2 {
          margin: 18px 0 0;
          color: var(--filumire-navy);
          font-size: 20px;
          line-height: 1.25;
        }

        .challengeCard > p {
          margin: 7px 0 0;
          color: var(--filumire-muted);
          font-size: 13px;
        }

        .challengeProgress {
          display: flex;
          align-items: baseline;
          gap: 5px;
          margin: 18px 0;
          padding: 13px 14px;
          border-radius: var(--filumire-radius-md);
          background: var(--filumire-blue-soft);
          color: var(--filumire-muted);
          font-size: 12px;
        }

        .challengeProgress strong {
          color: var(--filumire-navy);
          font-size: 20px;
        }

        .challengeCard .learnerPrimaryButton {
          width: 100%;
          justify-content: center;
        }
        .progressOverviewCard {
          margin-top: 20px;
          padding: 20px;
          border: 1px solid var(--filumire-border);
          border-radius: var(--filumire-radius-lg);
          background: #ffffff;
          box-shadow: var(--filumire-shadow);
        }

        .progressOverviewTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 16px;
        }

        .progressCompletedBadge {
          display: flex;
          min-width: 76px;
          min-height: 58px;
          align-items: baseline;
          justify-content: center;
          gap: 3px;
          padding: 12px;
          border-radius: var(--filumire-radius-md);
          background: var(--filumire-blue-soft);
          color: var(--filumire-muted);
        }

        .progressCompletedBadge strong {
          color: var(--filumire-navy);
          font-size: 24px;
        }

        .progressCompletedBadge span {
          font-size: 12px;
          font-weight: 700;
        }

        .progressCurrentLearning {
          margin-top: 20px;
          padding: 16px;
          border-radius: var(--filumire-radius-md);
          background: var(--filumire-bg);
        }

        .progressCurrentLearning h2 {
          margin: 7px 0 0;
          color: var(--filumire-navy);
          font-size: 18px;
          line-height: 1.3;
        }

        .progressCurrentLearning p {
          margin: 6px 0 0;
          color: var(--filumire-muted);
          font-size: 13px;
        }

        .progressContinueButton {
          display: flex;
          width: 100%;
          margin-top: 18px;
          justify-content: center;
        }
        .progressNumber {
          margin-bottom: 18px;
          color: var(--filumire-navy);
          font-size: 38px;
          font-weight: 800;
        }

        .filuCard,
        .profileCard {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 14px;
        }

        .filuCard .learnerPrimaryButton {
          flex-basis: 100%;
        }

        .filuMark,
        .profileAvatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 58px;
          height: 58px;
          flex: 0 0 58px;
          border-radius: 50%;
          background: var(--filumire-blue);
          color: #ffffff;
          font-size: 22px;
          font-weight: 800;
        }

        .filuAssistantCard {
          margin-top: 20px;
          padding: 20px;
          border: 1px solid #cfe9f7;
          border-radius: var(--filumire-radius-lg);
          background: linear-gradient(180deg, #f4fbff 0%, #ffffff 46%);
          box-shadow: var(--filumire-shadow);
        }

        .filuAssistantTop {
          display: flex;
          align-items: center;
          gap: 14px;
          padding-bottom: 18px;
          border-bottom: 1px solid var(--filumire-border);
        }

        .filuAssistantTop h2 {
          margin: 4px 0 0;
          color: var(--filumire-navy);
          font-size: 18px;
          line-height: 1.3;
        }

        .filuAssistantTop p {
          margin: 4px 0 0;
          color: var(--filumire-muted);
          font-size: 13px;
        }

        .filuContextLabel {
          color: var(--filumire-blue);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .filuResponse {
          display: grid;
          gap: 12px;
          margin-top: 18px;
        }

        .filuResponseItem {
          padding: 15px 16px;
          border: 1px solid var(--filumire-border);
          border-radius: var(--filumire-radius-md);
          background: #ffffff;
        }

        .filuResponseType {
          display: block;
          margin-bottom: 6px;
          color: var(--filumire-blue);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .filuResponseItem p {
          margin: 0;
          color: var(--filumire-text);
          font-size: 14px;
          line-height: 1.55;
        }

        .filuContinueButton {
          width: 100%;
          margin-top: 18px;
        }
        .profileOverviewCard {
          margin-top: 20px;
          padding: 20px;
          border: 1px solid var(--filumire-border);
          border-radius: var(--filumire-radius-lg);
          background: #ffffff;
          box-shadow: var(--filumire-shadow);
        }

        .profileIdentity {
          display: flex;
          align-items: center;
          gap: 14px;
          padding-bottom: 18px;
          border-bottom: 1px solid var(--filumire-border);
        }

        .profileLabel {
          color: var(--filumire-blue);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .profileIdentity h2 {
          margin: 4px 0 0;
          color: var(--filumire-navy);
          font-size: 20px;
          line-height: 1.25;
        }

        .profileDetails {
          display: grid;
          gap: 12px;
          margin-top: 18px;
        }

        .profileDetail {
          padding: 14px 15px;
          border: 1px solid var(--filumire-border);
          border-radius: var(--filumire-radius-md);
          background: var(--filumire-bg);
        }

        .profileDetail span {
          display: block;
          margin-bottom: 5px;
          color: var(--filumire-muted);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .profileDetail strong {
          display: block;
          color: var(--filumire-navy);
          font-size: 15px;
        }

        .profileDetail p {
          margin: 4px 0 0;
          color: var(--filumire-muted);
          font-size: 12px;
          line-height: 1.45;
        }

        .profileContinueButton {
          width: 100%;
          margin-top: 18px;
        }




        .setupLabel {
          color: var(--filumire-blue);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }




        .setupSectionHeading {
          margin-bottom: 14px;
        }

        .setupSectionHeading h2 {
          margin: 5px 0 0;
          color: var(--filumire-navy);
          font-size: 20px;
          line-height: 1.25;
        }

        /* Page 03 - learner setup */








        .setupSectionHeading h2 {
          margin-top: 4px;
          font-size: 19px;
        }



        .learnerStateCard {
          width: calc(100% - 36px);
          min-height: 260px;
          margin: 28px 18px;
          padding: 25px 21px;
          border: 1px solid var(--filumire-border);
          border-radius: var(--filumire-radius-lg);
          background: #ffffff;
          box-shadow: var(--filumire-shadow);
        }

        .learnerStateCard h1 {
          margin: 0 0 10px;
          color: var(--filumire-navy);
          font-size: 23px;
        }

        .learnerStateCard p {
          margin: 0;
          color: var(--filumire-muted);
          font-size: 13px;
          line-height: 1.55;
        }

        .learnerLoader {
          width: 30px;
          height: 30px;
          margin-bottom: 18px;
          border: 3px solid var(--filumire-border);
          border-top-color: var(--filumire-blue);
          border-radius: 50%;
          animation: learnerSpin 0.8s linear infinite;
        }

        @keyframes learnerSpin {
          to {
            transform: rotate(360deg);
          }
        }










        .progressTrack {
          height: 10px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.78);
        }

        .progressTrack span {
          display: block;
          height: 100%;
          border-radius: inherit;
          transition: width 220ms ease;
        }




        .subjectContinueButton {
          display: flex;
          width: 100%;
          margin-top: 18px;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        @media (min-width: 768px) {
          .learnerShell {
            max-width: 760px;
          }

          .learnerContent {
            padding: 32px;
          }


        }

        @media (min-width: 1100px) {
          .learnerShell {
            max-width: 980px;
          }

          .learnerContent {
            padding: 38px 46px;
          }
        }

        @media (min-width: 768px) {
          .learnerStateCard {
            width: auto;
            max-width: 560px;
            margin: 48px auto;
            padding: 32px;
          }
        }

        /* Laptop and desktop: the navigation is a fixed sidebar
           (globals.css), so the shell fills the remaining width. */
        @media (min-width: 1024px) {
          .learnerPage {
            padding-left: var(--filumire-sidebar-width);
          }

          /* No sidebar during first-time setup, so no gutter, and the
             header shows the logo the sidebar would otherwise carry. */
          .learnerPage.learnerOnboarding {
            padding-left: 0;
          }

          .learnerOnboarding :global(.filumireSetupHeader .filumireHeaderLogo) {
            display: flex;
          }

          .learnerShell {
            max-width: none;
            box-shadow: none;
          }
        }

        .learnerShell:has(.approvedSetup) .filumireBottomNav {
          position: relative;
          bottom: auto;
          z-index: 2;
          box-shadow: none;
        }
        
/* Approved Page 03 visual composition */
        .learnerContent.approvedSetup {
          width: 100%;
          max-width: none;
          padding: 8px 18px 0;
        }

        /* Page 3 progress tracker */
        /* Page 3 progress tracker */
        /* Page 3 progress tracker */
        /* Page 3 progress tracker */
        .approvedSetup .setupSteps {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          margin: 4px 0 12px;
        }

        .approvedSetup .setupStep {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: #1f3f66;
        }

        .approvedSetup .setupStep::before {
          content: "";
          position: absolute;
          top: 13px;
          right: 50%;
          width: 100%;
          height: 2px;
          background: #c3ccd6;
        }

        .approvedSetup .setupStep:first-child::before {
          display: none;
        }

        .approvedSetup .setupStep.complete::before,
        .approvedSetup .setupStep.active::before {
          background: #1fa84f;
        }

        .approvedSetup .setupStep span {
          position: relative;
          z-index: 1;
          display: grid;
          place-items: center;
          width: 22px;
          height: 22px;
          margin: 3px 0;
          border-radius: 50%;
          background: #1fa84f;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
        }

        .approvedSetup .setupStep.active span {
          width: 28px;
          height: 28px;
          margin: 0;
          background: #0b8cf0;
          font-size: 13px;
          box-shadow: 0 0 0 3px rgba(11, 140, 240, 0.15);
        }

        .approvedSetup .setupStep small {
          display: block;
          font-size: 9px;
          font-weight: 600;
          line-height: 1;
        }

        .approvedSetup .setupStep.active small {
          color: #0b8cf0;
          font-weight: 800;
        }

        /* Page 3 heading, copy and note */
        .approvedSetupIntro {
          position: relative;
          margin: 0 0 12px;
          padding-right: 84px;
        }

        .approvedSetupIntro h1 {
          margin: 0;
          color: #063f78;
          font-size: 19px;
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: -0.2px;
          white-space: normal;
        }

        .approvedSetupIntro p {
          max-width: 262px;
          margin: 6px 0 0;
          color: #1f4e79;
          font-size: 11px;
          line-height: 1.3;
        }

        .approvedSetup .setupNote {
          position: absolute;
          top: -8px;
          right: 0;
          width: 82px;
          padding: 12px 8px 14px;
          border-radius: 3px;
          background: #f3f8fc;
          box-shadow: 0 1px 4px rgba(6, 63, 120, 0.08);
          color: #1a8bd8;
          font-size: 11px;
          font-style: italic;
          font-weight: 700;
          line-height: 1.15;
          text-align: center;
          transform: rotate(-5deg);
        }

        .approvedSetup .setupNote::after {
          content: "";
          display: block;
          width: 48px;
          height: 4px;
          margin: 5px auto 0;
          border-radius: 4px;
          background: #ffc42e;
          transform: rotate(-4deg);
        }

        /* Page 3 name and level cards */
        .approvedSetup .setupFields {
          display: grid;
          gap: 8px;
        }

        .approvedSetup .setupField {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px;
          border-radius: 10px;
        }

        .approvedSetup .setupField.name {
          background: #dff0ff;
        }

        .approvedSetup .setupField.level {
          background: #fff4de;
        }

        .approvedSetup .setupFieldIcon {
          display: grid;
          place-items: center;
          flex: 0 0 38px;
          width: 38px;
          height: 38px;
          border-radius: 50%;
        }

        .approvedSetup .setupFieldIcon svg {
          width: 21px;
          height: 21px;
          fill: currentColor;
        }

        .approvedSetup .setupField.name .setupFieldIcon {
          background: #b9dcf7;
          color: #1a7fe0;
        }

        .approvedSetup .setupField.level .setupFieldIcon {
          background: #ffe2a3;
          color: #f08c00;
        }

        .approvedSetup .setupFieldBody {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .approvedSetup :global(.setupFieldLabel) {
          color: #063f78;
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
        }

        .approvedSetup .setupInputWrap {
          position: relative;
        }

        .approvedSetup :global(.setupInput) {
          display: block;
          width: 100%;
          min-height: 44px;
          padding: 0 44px 0 10px;
          border: 1px solid #bcd8ef;
          border-radius: 6px;
          background: #ffffff;
          color: #123f78;
          font: inherit;
          font-size: 13px;
          box-sizing: border-box;
        }

        .approvedSetup :global(.setupInput:focus) {
          outline: 2px solid #0b8cf0;
          outline-offset: 1px;
        }

        .approvedSetup :global(select.setupInput) {
          appearance: none;
          -webkit-appearance: none;
          background: #ffffff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3 6l5 5 5-5' fill='none' stroke='%23567a9e' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 10px center / 14px;
        }

        .approvedSetup .setupClear {
          position: absolute;
          top: 50%;
          right: 0;
          width: 44px;
          height: 44px;
          padding: 0;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: #123f78;
          font-size: 12px;
          line-height: 17px;
          text-align: center;
          cursor: pointer;
          transform: translateY(-50%);
        }

        .approvedSetup :global(.setupFieldHelp) {
          max-width: 215px;
          margin: 0;
          color: #1f4e79;
          font-size: 12px;
          line-height: 1.3;
        }

        /* Page 3 avatar section */
        /* Page 3 avatar section */
        .approvedSetup .setupAvatarSection {
          margin-top: 8px;
          padding: 10px 12px 10px;
          border-radius: 10px;
          background: #efeaff;
        }

        .approvedSetup .setupSectionTitle {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .approvedSetup .setupAvatarTitleIcon {
          display: grid;
          place-items: center;
          flex: 0 0 44px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #dccbf8;
        }

        .approvedSetup .setupAvatarTitleIcon svg {
          width: 28px;
          height: 28px;
        }

        .approvedSetup .setupAvatarText strong {
          display: block;
          color: #0b3b73;
          font-size: 15px;
          font-weight: 800;
          line-height: 1.1;
        }

        .approvedSetup .setupAvatarText small {
          display: block;
          margin-top: 4px;
          color: #1f4e79;
          font-size: 8.5px;
          line-height: 1.25;
        }

        .approvedSetup .setupAvatarChoices {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-top: 8px;
          padding: 0 4px;
        }

        .approvedSetup .setupAvatarChoice {
          position: relative;
          flex: 0 0 auto;
          width: 66px;
          height: 66px;
          padding: 3px;
          border: 0;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-sizing: border-box;
        }

        .approvedSetup .setupAvatarChoice.selected {
          box-shadow: 0 0 0 3px #1479f0;
        }

        .approvedSetup .setupAvatarChoice:focus-visible {
          outline: 2px solid #0b8cf0;
          outline-offset: 4px;
        }

        .approvedSetup .setupAvatarImg {
          display: block;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .approvedSetup .setupAvatarCheck {
          position: absolute;
          right: -4px;
          bottom: -4px;
          display: grid;
          place-items: center;
          width: 24px;
          height: 24px;
          border: 2px solid #ffffff;
          border-radius: 50%;
          background: #1479f0;
          box-sizing: border-box;
        }

        .approvedSetup .setupAvatarCheck svg {
          width: 13px;
          height: 13px;
          fill: none;
          stroke: #ffffff;
          stroke-width: 3;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        /* Page 3 learning strip, landscape and Continue */
        .approvedSetupSubjects {
          margin-top: 8px;
        }

        .approvedSetup .setupLearningHeading {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 12px;
          background: #dff5e7;
        }

        .approvedSetup .setupLearningIcon {
          display: grid;
          place-items: center;
          flex: 0 0 40px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #bfeccf;
          color: #12b350;
        }

        .approvedSetup .setupLearningIcon svg {
          width: 26px;
          height: 26px;
          fill: currentColor;
        }

        .approvedSetup .setupLearningText strong {
          display: block;
          color: #0b3b73;
          font-size: 14px;
          font-weight: 800;
          line-height: 1.1;
        }

        .approvedSetup .setupLearningText small {
          display: block;
          margin-top: 3px;
          color: #1f4e79;
          font-size: 9.5px;
          line-height: 1.25;
        }

        .approvedSetup .setupSubjectGridWrap {
          margin-top: 6px;
        }

        .approvedSetup .setupFooterScene {
          position: relative;
          margin: 4px -18px 0;
          padding: 4px 18px 6px;
        }

        .approvedSetup .setupScene {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          pointer-events: none;
        }

        .approvedSetup :global(.approvedSetupContinue) {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          min-height: 42px;
          border-radius: 10px;
          background: #0b7bff;
          color: #ffffff;
          font-size: 15px;
          font-weight: 800;
          text-decoration: none;
        }

        .approvedSetup :global(.approvedSetupContinue svg) {
          width: 18px;
          height: 18px;
          fill: none;
          stroke: #cfe6ff;
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        @media (max-width: 767px) {
          .approvedSetup .setupAvatarChoices {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            justify-items: center;
          }

          .approvedSetup .setupAvatarChoice {
            width: 100%;
            max-width: 66px;
            height: auto;
            aspect-ratio: 1;
          }
        }

        @media (min-width: 760px) {
          .learnerContent.approvedSetup {
            padding: 8px 18px 0;
          }
        }

        @media (min-width: 1100px) {
          .learnerContent.approvedSetup {
            padding: 8px 18px 0;
          }
        }

        /* Tablet and up: the setup form becomes a centred, readable
           column instead of the full-width phone composition. */
        @media (min-width: 768px) {
          .learnerContent.approvedSetup {
            max-width: 720px;
            margin: 0 auto;
            padding: 24px 32px 0;
          }

          .approvedSetup .setupSteps {
            margin: 4px 0 24px;
          }

          .approvedSetup .setupStep small {
            font-size: 12px;
          }

          .approvedSetupIntro {
            margin-bottom: 20px;
            padding-right: 140px;
          }

          .approvedSetupIntro h1 {
            font-size: 28px;
          }

          .approvedSetupIntro p {
            max-width: 460px;
            font-size: 15px;
          }

          .approvedSetup .setupNote {
            top: -6px;
            right: 6px;
            width: 112px;
            font-size: 14px;
          }

          .approvedSetup .setupFields {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }

          .approvedSetup .setupField {
            padding: 16px;
            border-radius: 14px;
          }

          .approvedSetup :global(.setupFieldLabel) {
            font-size: 14px;
          }

          .approvedSetup :global(.setupInput) {
            height: 42px;
            font-size: 15px;
          }

          .approvedSetup :global(.setupFieldHelp) {
            max-width: none;
            font-size: 12px;
          }

          .approvedSetup .setupAvatarSection,
          .approvedSetupSubjects {
            margin-top: 14px;
          }

          .approvedSetup .setupAvatarSection {
            padding: 16px 18px;
            border-radius: 14px;
          }

          .approvedSetup .setupAvatarText strong {
            font-size: 17px;
          }

          .approvedSetup .setupAvatarText small,
          .approvedSetup .setupLearningText small {
            font-size: 12.5px;
          }

          .approvedSetup .setupAvatarChoices {
            justify-content: flex-start;
            gap: 22px;
            margin-top: 14px;
          }

          .approvedSetup .setupAvatarChoice {
            width: 84px;
            height: 84px;
          }

          .approvedSetup .setupLearningHeading {
            padding: 12px 16px;
          }

          .approvedSetup .setupLearningText strong {
            font-size: 16px;
          }

          .approvedSetup .setupSubjectGridWrap {
            margin-top: 10px;
          }

          .approvedSetup .setupFooterScene {
            margin: 16px -32px 0;
            padding: 24px 32px 28px;
          }

          .approvedSetup :global(.approvedSetupContinue) {
            max-width: 360px;
            min-height: 48px;
            margin: 0 auto;
            font-size: 16px;
          }
        }
      `}</style>

      <style jsx global>{`
        .filumireSubjectGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .filumireSubjectCard {
          display: flex;
          min-height: 126px;
          flex-direction: column;
          align-items: flex-start;
          padding: 14px;
          border: 2px solid transparent;
          border-radius: var(--filumire-radius-md);
          color: var(--filumire-navy);
          text-decoration: none;
        }

        .filumireSubjectBadge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 12px;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
        }

        .filumireSubjectName {
          margin-top: 12px;
          font-size: 13px;
          font-weight: 800;
        }

        .filumireSubjectAction {
          margin-top: auto;
          padding-top: 7px;
          color: var(--filumire-muted);
          font-size: 10px;
          font-weight: 700;
        }

        @media (min-width: 768px) {
          .filumireSubjectGrid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (max-width: 1023px) {
          .learnerShell:has(.approvedSetup) .filumireBottomNav {
            position: relative;
            bottom: auto;
            z-index: 2;
            box-shadow: none;
          }
        }
        `}</style>
    </main>
  );
}

export default function LearnerDashboard() {
  return (
    <Suspense fallback={<main className="learnerUi"><LearnerLoadingState /></main>}>
      <LearnerDashboardView />
    </Suspense>
  );
}
