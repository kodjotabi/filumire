"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { LearnerBottomNav } from "../../components/filumire/LearnerBottomNav";

function ArrowRight() {
  return (
    <svg className="btnArrow" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/*
 * Sign-in status: the server issues sessions only from an external
 * identity provider token (services/identity issueProductionSession,
 * POST /api/session/issue). No provider is connected and there is no
 * username/password check, so this form cannot sign anyone in yet and
 * says so. Local development builds offer a clearly labelled way into
 * the app as the development test learner instead.
 */
const SIGN_IN_PENDING =
  "Sign-in is not connected yet. FILUMIRE accounts will be issued through a secure identity service that has not been set up in this version, so no username or password can be checked.";

const CREATE_ACCOUNT_PENDING =
  "Account creation is not available yet. It will open when the FILUMIRE identity service is connected.";

const PASSWORD_RECOVERY_PENDING =
  "Password recovery is not available yet. It will be provided by the FILUMIRE identity service.";

const LOCAL_TESTING = process.env.NODE_ENV !== "production";

export default function LoginPage() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [language, setLanguage] = useState<"en" | "fr">("en");

  useEffect(() => {
    setLanguage(
      new URLSearchParams(window.location.search).get("lang") === "fr"
        ? "fr"
        : "en",
    );
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(SIGN_IN_PENDING);
  }

  return (
    <main className="loginPage">
      <header className="topbar">
        <Link href="/" className="back" aria-label="Back to FILUMIRE home">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12H5M11 5l-7 7 7 7" />
          </svg>
          Back
        </Link>

        <img className="logo" src="/filumire-logo-white.svg" alt="FILUMIRE" />

        <Link href="/adult" className="adultLink">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="8.5" cy="7.5" r="3.6" />
            <circle cx="16.5" cy="8.5" r="3" />
            <path d="M1.5 20c0-3.9 3-6.4 7-6.4s7 2.5 7 6.4z" />
            <path d="M16 14.2c3.4 0 6.5 1.9 6.5 5.3V20H17c0-2.3-.4-4.3-1-5.8z" />
          </svg>
          <span>Parent / Teacher<br />Login</span>
        </Link>
      </header>

      <section className="hero">
        <img className="heroArt" src="/images/login/page02-hero-art.jpg" alt="" />
        <h1 className="heroTitle">Welcome <span>back</span></h1>
        <p className="heroGreeting">Great to see you again!</p>
        <p className="heroIntro">Sign in to continue your learning<br />journey with FILUMIRE.</p>
      </section>

      <section className="signInCard">
        <h2>Sign In</h2>
        <p className="cardIntro">Enter your details to continue.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="filumire-identity">Email or username</label>
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
              placeholder="Email or Username"
            />
          </div>

          <label htmlFor="filumire-password">Password</label>
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
              placeholder="Password"
            />
            <button
              type="button"
              className="showPassword"
              onClick={() => setPasswordVisible((visible) => !visible)}
              aria-label={passwordVisible ? "Hide password" : "Show password"}
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
            onClick={() => setMessage(PASSWORD_RECOVERY_PENDING)}
          >
            Forgot your password?
          </button>

          <button type="submit" className="signInButton">
            Sign In <ArrowRight />
          </button>

          {message ? (
            <p className="authMessage" role="status">
              {message}
            </p>
          ) : null}
        </form>
      </section>

      <section className="newAccount">
        <h2>New to FILUMIRE?</h2>
        <p>Create an account and start your learning journey today.</p>
        <button
          type="button"
          className="createButton"
          onClick={() => setMessage(CREATE_ACCOUNT_PENDING)}
        >
          Create Account <ArrowRight />
        </button>
      </section>

      {LOCAL_TESTING ? (
        <section className="localTesting" aria-label="Local testing">
          <h2>Local testing</h2>
          <p>
            Development build only. Opens FILUMIRE as the built-in test
            learner (in-memory data, reset when the server restarts). This
            is not a real sign-in and never appears in production.
          </p>
          <div className="localTestingLinks">
            <Link href={`/dashboard?lang=${language}&view=setup`}>
              Set up learner
            </Link>
            <Link href={`/dashboard?lang=${language}`}>
              Continue as test learner
            </Link>
          </div>
        </section>
      ) : null}

      <section className="landscape">
        <img src="/images/home/landscape%20footer.png" alt="" />
        <p>A brighter tomorrow for every learner.</p>
      </section>

      <LearnerBottomNav active="home" language={language} />

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
      `}</style>
    </main>
  );
}
