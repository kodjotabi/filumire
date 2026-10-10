"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { LearnerBottomNav } from "../../components/filumire/LearnerBottomNav";
import { LanguageToggle } from "../../components/filumire/LanguageToggle";
import { useLanguage } from "../../components/filumire/language";
import {
  accountErrorMessage,
  activeLearner,
  applyLearnerProfileToDevice,
  fetchAccount,
  destinationFor,
  hasAccountSession,
  signIn,
} from "../../services/account-client";

function ArrowRight() {
  return (
    <svg className="btnArrow" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/*
 * Built-in FILUMIRE sign-in (services/account): parents and
 * guardians sign in with their email address, learners with the
 * username their parent chose. After sign-in a learner goes to
 * their learning (or first-time setup), a guardian to the family
 * page. Local development builds also keep a clearly labelled way
 * in as the built-in test learner.
 */
const LOCAL_TESTING = process.env.NODE_ENV !== "production";

const TEXT = {
  en: {
    back: "Back",
    backLabel: "Back to FILUMIRE home",
    home: "FILUMIRE home",
    adult: ["Parent / Teacher", "Login"],
    welcome: "Welcome",
    welcomeAccent: "back",
    greeting: "Great to see you again!",
    intro: ["Sign in to continue your learning", "journey with FILUMIRE."],
    signIn: "Sign In",
    cardIntro: "Enter your details to continue.",
    identity: "Email (parents) or username (learners)",
    identityPlaceholder: "Email or username",
    signingIn: "Signing in…",
    missing: "Enter your email or username and your password.",
    forgot:
      "Learners: ask your parent or guardian to set a new password from their family page. Parents: password reset by email is not available in this test version yet.",
    password: "Password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    forgotLink: "Forgot your password?",
    newTitle: "New to FILUMIRE?",
    newBody: "Parents and guardians create the family account, then add each learner.",
    create: "Create Account",
    localTitle: "Local testing",
    localBody:
      "Development build only. Opens FILUMIRE as the built-in test learner (in-memory data, reset when the server restarts). This is not a real sign-in and never appears in production.",
    setup: "Set up learner",
    continueTest: "Continue as test learner",
    landscape: "A brighter tomorrow for every learner.",
    skip: "Skip to sign in",
  },
  fr: {
    back: "Retour",
    backLabel: "Retour à l'accueil FILUMIRE",
    home: "Accueil FILUMIRE",
    adult: ["Parents /", "enseignants"],
    welcome: "Bon",
    welcomeAccent: "retour",
    greeting: "Ravi de te revoir !",
    intro: ["Connecte-toi pour continuer", "ton parcours avec FILUMIRE."],
    signIn: "Connexion",
    cardIntro: "Saisis tes informations pour continuer.",
    identity: "E-mail (parents) ou identifiant (apprenants)",
    identityPlaceholder: "E-mail ou identifiant",
    signingIn: "Connexion…",
    missing: "Saisis ton e-mail ou ton identifiant et ton mot de passe.",
    forgot:
      "Apprenants : demande à ton parent ou tuteur de choisir un nouveau mot de passe depuis sa page famille. Parents : la réinitialisation par e-mail n'est pas encore disponible dans cette version de test.",
    password: "Mot de passe",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    forgotLink: "Mot de passe oublié ?",
    newTitle: "Nouveau sur FILUMIRE ?",
    newBody: "Les parents et tuteurs créent le compte famille, puis ajoutent chaque apprenant.",
    create: "Créer un compte",
    localTitle: "Test local",
    localBody:
      "Version de développement uniquement. Ouvre FILUMIRE avec l'apprenant de test intégré (données en mémoire, effacées au redémarrage du serveur). Ce n'est pas une vraie connexion et cela n'apparaît jamais en production.",
    setup: "Configurer l'apprenant",
    continueTest: "Continuer avec l'apprenant de test",
    landscape: "Un avenir plus brillant pour chaque apprenant.",
    skip: "Aller à la connexion",
  },
} as const;

export default function LoginPage() {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [language, setLanguage] = useLanguage();
  const t = TEXT[language];

  // Already signed in on this browser: go straight on.
  useEffect(() => {
    if (!hasAccountSession()) return;

    let active = true;
    fetchAccount()
      .then((account) => {
        if (active && account) {
          router.replace(destinationFor(account, language));
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!login.trim() || !password) {
      setMessage(t.missing);
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      await signIn(login, password);
      const account = await fetchAccount();

      if (!account) {
        throw new Error("Session not established.");
      }

      const learner = activeLearner(account);
      if (learner) {
        applyLearnerProfileToDevice(learner);
      }

      setPassword("");
      router.push(destinationFor(account, learner?.preferredLanguage ?? language));
    } catch (error) {
      setMessage(accountErrorMessage(error, language));
      setBusy(false);
    }
  }

  return (
    <main className="loginPage" lang={language}>
      <a className="filumireSkipLink" href="#sign-in">
        {t.skip}
      </a>

      <header className="topbar">
        <Link href={`/?lang=${language}`} className="back" aria-label={t.backLabel}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12H5M11 5l-7 7 7 7" />
          </svg>
          {t.back}
        </Link>

        <Link href={`/?lang=${language}`} className="logoLink" aria-label={t.home}>
          <img className="logo" src="/filumire-logo-white.svg" alt="FILUMIRE" />
        </Link>

        <LanguageToggle language={language} onChange={setLanguage} variant="compact" />

        <Link href={`/adult?lang=${language}`} className="adultLink">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="8.5" cy="7.5" r="3.6" />
            <circle cx="16.5" cy="8.5" r="3" />
            <path d="M1.5 20c0-3.9 3-6.4 7-6.4s7 2.5 7 6.4z" />
            <path d="M16 14.2c3.4 0 6.5 1.9 6.5 5.3V20H17c0-2.3-.4-4.3-1-5.8z" />
          </svg>
          <span>{t.adult[0]}<br />{t.adult[1]}</span>
        </Link>
      </header>

      <section className="hero">
        <img className="heroArt" src="/images/login/page02-hero-art.jpg" alt="" />
        <h1 className="heroTitle">{t.welcome} <span>{t.welcomeAccent}</span></h1>
        <p className="heroGreeting">{t.greeting}</p>
        <p className="heroIntro">{t.intro[0]}<br />{t.intro[1]}</p>
      </section>

      <section className="signInCard" id="sign-in" aria-labelledby="sign-in-title">
        <h2 id="sign-in-title">{t.signIn}</h2>
        <p className="cardIntro">{t.cardIntro}</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="filumire-identity">{t.identity}</label>
          <div className="field">
            <svg className="fieldIcon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="4.2" />
              <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
            </svg>
            <input
              id="filumire-identity"
              name="identity"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={t.identityPlaceholder}
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              required
            />
          </div>

          <label htmlFor="filumire-password">{t.password}</label>
          <div className="field">
            <svg className="fieldIcon" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="2.4" />
              <path className="stroke" d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            <input
              id="filumire-password"
              name="password"
              type={passwordVisible ? "text" : "password"}
              autoComplete="current-password"
              placeholder={t.password}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              className="showPassword"
              onClick={() => setPasswordVisible((visible) => !visible)}
              aria-label={passwordVisible ? t.hidePassword : t.showPassword}
              aria-pressed={passwordVisible}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 12s3.7-7 10-7 10 7 10 7-3.7 7-10 7S2 12 2 12z" />
                <circle className="dot" cx="12" cy="12" r="3" />
                {passwordVisible ? <path d="M4 4l16 16" /> : null}
              </svg>
            </button>
          </div>

          <button
            type="button"
            className="forgot"
            onClick={() => setMessage(t.forgot)}
          >
            {t.forgotLink}
          </button>

          <button type="submit" className="signInButton" disabled={busy} aria-busy={busy}>
            {busy ? t.signingIn : t.signIn} {busy ? null : <ArrowRight />}
          </button>

          {/* Always mounted so screen readers announce each message. */}
          <p className="authMessage" role="status" aria-live="polite">
            {message}
          </p>
        </form>
      </section>

      <section className="newAccount">
        <h2>{t.newTitle}</h2>
        <p>{t.newBody}</p>
        <Link href={`/register?lang=${language}`} className="createButton">
          {t.create} <ArrowRight />
        </Link>
      </section>

      {LOCAL_TESTING ? (
        <section className="localTesting" aria-label={t.localTitle}>
          <h2>{t.localTitle}</h2>
          <p>{t.localBody}</p>
          <div className="localTestingLinks">
            <Link href={`/dashboard?lang=${language}&view=setup`}>
              {t.setup}
            </Link>
            <Link href={`/dashboard?lang=${language}`}>
              {t.continueTest}
            </Link>
          </div>
        </section>
      ) : null}

      <section className="landscape">
        <img src="/images/home/landscape%20footer.png" alt="" />
        <p>{t.landscape}</p>
      </section>

      <LearnerBottomNav active="home" language={language} variant="inline" />


      <style>{`
        .loginPage { width: 100%; max-width: 390px; min-height: 844px; margin: 0 auto; background: #ffffff; color: var(--ui-ink); font-family: inherit; }
        .topbar { height: 72px; padding: 0 26px 0 24px; display: flex; align-items: center; gap: 17px; background: var(--ui-bar); color: #ffffff; }
        .back { width: 38px; height: 42px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; border-radius: 8px; background: var(--ui-back); color: #ffffff; text-decoration: none; font-size: 10px; font-weight: 700; line-height: 1; }
        .back svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
        .logo { width: 103px; height: auto; max-height: 44px; object-fit: contain; }
        .adultLink { margin-left: auto; display: flex; align-items: center; gap: 8px; color: #ffffff; text-decoration: none; font-size: 11px; font-weight: 700; line-height: 1.2; text-align: left; }
        .adultLink svg { width: 24px; height: 24px; flex: none; fill: currentColor; }
        .hero { position: relative; width: 100%; aspect-ratio: 3129 / 1806; overflow: hidden; }
        .heroArt { position: absolute; inset: 0; width: 100%; height: 100%; display: block; object-fit: cover; }
        .heroTitle { position: absolute; top: 27px; left: 24px; margin: 0; color: var(--ui-ink); font-size: 26px; line-height: 1.15; font-weight: 800; letter-spacing: -0.5px; white-space: nowrap; }
        .heroTitle span { color: var(--ui-brand); }
        .heroGreeting { position: absolute; top: 57px; left: 28px; margin: 0; color: var(--ui-ink); font-size: 14px; line-height: 1.2; font-weight: 500; }
        .heroIntro { position: absolute; top: 83px; left: 28px; margin: 0; color: var(--ui-ink); font-size: 10.5px; line-height: 1.55; font-weight: 500; }
        .signInCard { width: 342px; margin: 0 auto; padding: 10px; border-radius: 16px; background: var(--ui-blue-tint); box-sizing: border-box; }
        .signInCard h2, .newAccount h2 { margin: 0; color: var(--ui-ink); font-size: 20px; line-height: 1.2; font-weight: 800; }
        .cardIntro, .newAccount p { margin: 4px 0 10px; color: var(--ui-ink-soft); font-size: 12px; line-height: 1.35; font-weight: 500; }
        form label { display: block; margin: 10px 0 5px; color: var(--ui-ink); font-size: 12px; font-weight: 700; }
        .field { height: 34px; display: flex; align-items: center; gap: 10px; padding: 0 12px; border: 1px solid var(--ui-line); border-radius: 9px; background: #ffffff; box-sizing: border-box; }
        .fieldIcon { width: 18px; height: 18px; flex: none; fill: var(--ui-ink); }
        .fieldIcon .stroke { fill: none; stroke: var(--ui-ink); stroke-width: 2.4; stroke-linecap: round; }
        .field input { min-width: 0; flex: 1; border: 0; outline: 0; background: transparent; color: var(--ui-ink); font: inherit; font-size: 12px; }
        .field input::placeholder { color: var(--ui-ink-soft); opacity: 0.7; }
        .showPassword { width: 26px; height: 26px; display: grid; place-items: center; border: 0; padding: 0; background: transparent; cursor: pointer; }
        .showPassword svg { width: 20px; height: 20px; fill: none; stroke: var(--ui-ink); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
        .showPassword svg .dot { fill: var(--ui-ink); stroke: none; }
        .forgot { display: block; margin: 5px 0 6px auto; border: 0; padding: 0; background: transparent; color: var(--ui-ink); font-family: inherit; font-size: 11px; font-weight: 600; cursor: pointer; }
        .signInButton, .createButton { width: 100%; height: 36px; display: flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 9px; color: #ffffff; font-family: inherit; font-size: 15px; font-weight: 800; cursor: pointer; }
        .signInButton { background: var(--ui-blue); }
        .signInButton[disabled] { opacity: 0.7; cursor: progress; }
        .createButton { text-decoration: none; box-sizing: border-box; }
        .createButton { background: var(--ui-green); }
        .btnArrow { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
        .authMessage { margin: 8px 0 0; color: var(--ui-ink-soft); font-size: 11px; line-height: 1.35; text-align: center; }
        .newAccount { width: 342px; margin: 8px auto 0; padding: 10px; border-radius: 16px; background: var(--ui-green-tint); box-sizing: border-box; }
        .localTesting { width: 342px; margin: 8px auto 0; padding: 10px; border: 1px dashed var(--ui-line); border-radius: 16px; background: #fffaf0; box-sizing: border-box; }
        .localTesting h2 { margin: 0; color: var(--ui-ink); font-size: 14px; font-weight: 800; }
        .localTesting p { margin: 4px 0 8px; color: var(--ui-ink-soft); font-size: 11px; line-height: 1.35; }
        .localTestingLinks { display: flex; gap: 8px; }
        .localTestingLinks a { flex: 1; padding: 8px 6px; border-radius: 9px; background: #ffffff; border: 1px solid var(--ui-line); color: var(--ui-ink); font-size: 12px; font-weight: 700; text-align: center; text-decoration: none; }
        @media (max-width: 360px) { .signInCard, .newAccount, .localTesting { width: calc(100% - 24px); } }
        .landscape { position: relative; width: 100%; height: 68px; margin-top: 8px; overflow: hidden; }
        .landscape img { position: absolute; left: 0; top: 0; width: 100%; height: auto; display: block; }
        .landscape p { position: absolute; top: 6px; left: 0; right: 0; z-index: 1; margin: 0; color: var(--ui-ink); font-size: 9px; line-height: 1; font-weight: 600; text-align: center; }
        .landscape p::after { content: ""; display: block; width: 36px; height: 3px; margin: 3px auto 0; background: var(--ui-brush); transform: rotate(-3deg); }
        .loginPage { display: flex; flex-direction: column; min-height: 100dvh; }
        .loginPage .landscape { margin-top: auto; }
        /* The global nav is sticky (bottom: 0) for the scrolling app screens; on this single flowing page it must sit in the flow at the end, or it floats over the form on shorter viewports. */
        .loginPage .filumireBottomNav { position: static; margin-top: 0; }
        @media (min-width: 391px) { .loginPage { box-shadow: 0 0 0 1px #e5e5e5; } }

        /* Tablet: a wider centred column with larger type and fields */
        @media (min-width: 768px) {
          .loginPage { max-width: 640px; box-shadow: 0 0 0 1px #e5e5e5, 0 12px 40px rgba(0, 59, 113, 0.08); }
          .topbar { padding: 0 32px; }
          .logo { width: 128px; }
          .adultLink { font-size: 13px; }
          .heroTitle { top: 44px; left: 40px; font-size: 40px; }
          .heroGreeting { top: 96px; left: 42px; font-size: 19px; }
          .heroIntro { top: 130px; left: 42px; font-size: 14.5px; }
          .signInCard, .newAccount, .localTesting { width: calc(100% - 64px); padding: 20px 22px; border-radius: 20px; }
          .newAccount, .localTesting { margin-top: 14px; }
          .signInCard { margin-top: 20px; }
          .signInCard h2, .newAccount h2 { font-size: 24px; }
          .cardIntro, .newAccount p { font-size: 14px; }
          form label { margin-top: 14px; font-size: 14px; }
          .field { height: 48px; border-radius: 12px; }
          .field input { font-size: 15px; }
          .forgot { margin: 10px 0 12px auto; font-size: 13px; }
          .signInButton, .createButton { height: 48px; border-radius: 12px; font-size: 16px; }
          .authMessage { font-size: 13px; }
          .localTesting h2 { font-size: 16px; }
          .localTesting p { font-size: 13px; }
          .localTestingLinks a { padding: 12px 8px; font-size: 14px; }
          .landscape { height: 120px; margin-top: 24px; }
          .landscape p { top: 12px; font-size: 13px; }
        }

        /* Laptop and desktop: artwork and welcome on the left, sign-in
           on the right; header, landscape and navigation span the page. */
        @media (min-width: 1024px) {
          .loginPage {
            display: grid;
            max-width: none;
            grid-template-columns: minmax(40px, 1fr) minmax(0, 672px) minmax(428px, 528px) minmax(40px, 1fr);
            grid-template-areas:
              "top top top top"
              ". hero card ."
              ". hero new ."
              ". hero local ."
              ". hero . ."
              "land land land land"
              "nav nav nav nav";
            grid-template-rows: auto auto auto auto 1fr auto auto;
            box-shadow: none;
          }
          .topbar { grid-area: top; padding: 0 max(40px, calc((100% - 1200px) / 2)); }
          .hero { grid-area: hero; align-self: stretch; min-height: 520px; margin-top: 40px; border-radius: 28px; aspect-ratio: auto; }
          .heroTitle { top: 48px; left: 48px; font-size: 48px; }
          .heroGreeting { top: 112px; left: 50px; font-size: 22px; }
          .heroIntro { top: 150px; left: 50px; font-size: 16px; }
          .signInCard, .newAccount, .localTesting { width: auto; margin-left: 48px; margin-right: 0; }
          .signInCard { grid-area: card; margin-top: 40px; }
          .newAccount { grid-area: new; }
          .localTesting { grid-area: local; }
          .landscape { grid-area: land; height: clamp(120px, 12vw, 180px); margin-top: 48px; }
          .landscape p { top: 16px; font-size: 15px; }
          .loginPage .filumireBottomNav { grid-area: nav; padding: 0 max(40px, calc((100% - 1200px) / 2)); }
          .loginPage .filumireNavItem { flex-direction: row; gap: 10px; font-size: 14px; }
        }
        /* Overhaul: logo link, language switch, quiet empty messages */
        .topbar { gap: 12px; }
        .logoLink { display: flex; align-items: center; }
        .loginPage .filumireLangSwitch { margin-left: auto; }
        .loginPage .adultLink { margin-left: 0; }
        .authMessage:empty { margin: 0; }
        .loginPage[lang="fr"] .heroTitle { font-size: 24px; }
        @media (min-width: 768px) {
          .loginPage[lang="fr"] .heroTitle { font-size: 38px; }
        }
        @media (min-width: 1024px) {
          .loginPage[lang="fr"] .heroTitle { font-size: 44px; }
        }
      `}</style>
    </main>
  );
}
