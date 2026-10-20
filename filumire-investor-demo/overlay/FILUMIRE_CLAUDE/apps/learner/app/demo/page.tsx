"use client";
import { useState } from "react";
import { DEMO_LEARNERS, DEMO_TEACHER } from "./learners";

// Investor demo only: choose a fictional learner instead of signing in.
const copy = {
  en: { title: "Choose a learner", lead: "This is an offline demonstration of FILUMIRE with fictional learners. Nothing is sent over the internet; progress stays on this laptop.", start: "Start learning as", teaching: "Teaching language", languages: { en: "English", fr: "French" }, starting: "Opening…", failed: "The demo could not open this learner. Please try again.", switchLang: "Français", switchLabel: "Afficher en français", adults: "Adults", guardian: "Parent or guardian", guardianText: "Demo Family: see all three learners’ progress and manage their accounts.", teacher: "Teacher", teacherText: "linked to all three learners: class overview and reviews.", openAs: "Open as", reset: "Reset demo", resetAsk: "Erase all demo progress and start again with the fictional learners?", resetYes: "Yes, reset", resetNo: "Cancel", resetDone: "The demo is back to its starting point.", resetFailed: "The demo could not be reset. Please try again." },
  fr: { title: "Choisis un apprenant", lead: "Ceci est une démonstration hors ligne de FILUMIRE avec des apprenants fictifs. Rien n’est envoyé sur Internet ; la progression reste sur cet ordinateur.", start: "Apprendre en tant que", teaching: "Langue d’enseignement", languages: { en: "anglais", fr: "français" }, starting: "Ouverture…", failed: "La démonstration n’a pas pu ouvrir cet apprenant. Réessaie.", switchLang: "English", switchLabel: "Show in English", adults: "Adultes", guardian: "Parent ou tuteur", guardianText: "Famille de démonstration : voir les progrès des trois apprenants et gérer leurs comptes.", teacher: "Enseignant(e)", teacherText: "liée aux trois apprenants : vue de la classe et révisions.", openAs: "Ouvrir en tant que", reset: "Réinitialiser la démo", resetAsk: "Effacer toute la progression de la démo et recommencer avec les apprenants fictifs ?", resetYes: "Oui, réinitialiser", resetNo: "Annuler", resetDone: "La démo est revenue à son point de départ.", resetFailed: "La démo n’a pas pu être réinitialisée. Réessaie." },
};

export default function DemoPicker() {
  const [language, setLanguage] = useState<"en" | "fr">("en");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [resetStep, setResetStep] = useState<"idle" | "confirm" | "done" | "failed">("idle");
  const t = copy[language];
  async function start(key: string) {
    setBusy(key); setError(false);
    try {
      const response = await fetch("/api/demo/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ learner: key, language }) });
      if (!response.ok) throw new Error(String(response.status));
      const { redirect } = await response.json();
      window.location.assign(redirect);
    } catch { setError(true); setBusy(null); }
  }
  async function reset() {
    try {
      const response = await fetch("/api/demo/state", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "reset" }) });
      if (!response.ok) throw new Error(String(response.status));
      setResetStep("done");
    } catch { setResetStep("failed"); }
  }
  return <main className="demoPicker" lang={language}>
    <header>
      <img src="/filumire-logo.svg" alt="FILUMIRE" width="180" height="48" />
      <button type="button" className="lang" onClick={() => setLanguage(language === "en" ? "fr" : "en")} aria-label={t.switchLabel}>{t.switchLang}</button>
    </header>
    <h1>{t.title}</h1>
    <p className="lead">{t.lead}</p>
    <ul>
      {DEMO_LEARNERS.map((learner) => <li key={learner.key}>
        <button type="button" onClick={() => void start(learner.key)} disabled={busy !== null} aria-busy={busy === learner.key}>
          <img src={learner.avatar} alt="" width="96" height="96" />
          <strong>{learner.name}</strong>
          <span>{learner.grade[language]}</span>
          <span className="tag">{t.teaching}: {t.languages[learner.language]}</span>
          <span className="go">{busy === learner.key ? t.starting : `${t.start} ${learner.name} →`}</span>
        </button>
      </li>)}
    </ul>
    <h2>{t.adults}</h2>
    <ul className="adults">
      <li><button type="button" onClick={() => void start("guardian")} disabled={busy !== null} aria-busy={busy === "guardian"}>
        <img src="/images/avatars/avatar-glasses.png" alt="" width="64" height="64" /><strong>{t.guardian}</strong><span className="tag">{t.guardianText}</span>
        <span className="go">{busy === "guardian" ? t.starting : `${t.openAs} ${t.guardian.toLowerCase()} →`}</span></button></li>
      <li><button type="button" onClick={() => void start("teacher")} disabled={busy !== null} aria-busy={busy === "teacher"}>
        <span className="initial" aria-hidden="true">M</span><strong>{t.teacher}</strong><span className="tag">{DEMO_TEACHER.name}, {t.teacherText}</span>
        <span className="go">{busy === "teacher" ? t.starting : `${t.openAs} ${DEMO_TEACHER.name} →`}</span></button></li>
    </ul>
    <p role="status" className="error">{error ? t.failed : ""}</p>
    <section className="reset" aria-label={t.reset}>
      {resetStep === "confirm"
        ? <><p>{t.resetAsk}</p><button type="button" className="danger" onClick={() => void reset()}>{t.resetYes}</button> <button type="button" onClick={() => setResetStep("idle")}>{t.resetNo}</button></>
        : <button type="button" onClick={() => setResetStep("confirm")} disabled={busy !== null}>{t.reset}</button>}
      <p role="status">{resetStep === "done" ? t.resetDone : resetStep === "failed" ? t.resetFailed : ""}</p>
    </section>
    <style jsx>{`
      .demoPicker { min-height: 100vh; box-sizing: border-box; padding: 24px 16px 48px; max-width: 980px; margin: 0 auto; color: #12304f; font-size: 16px; }
      header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 24px; }
      header img { max-width: 60vw; height: auto; }
      .lang { min-height: 44px; padding: 8px 16px; border-radius: 22px; border: 2px solid #003b71; background: #fff; color: #003b71; font: inherit; font-weight: 700; cursor: pointer; }
      h1 { font-size: 28px; margin: 0 0 8px; color: #003b71; }
      .lead { margin: 0 0 24px; line-height: 1.5; max-width: 640px; }
      ul { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
      li button { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 20px 16px; border-radius: 18px; border: 2px solid #d5e4f2; background: #fff; color: inherit; font: inherit; cursor: pointer; box-shadow: 0 4px 14px rgba(0, 59, 113, .08); }
      li button:hover:not(:disabled), li button:focus-visible { border-color: #003b71; outline: none; box-shadow: 0 0 0 3px #277dca55; }
      li button:disabled { opacity: .7; cursor: default; }
      li img { border-radius: 50%; background: #eef5fb; }
      strong { font-size: 22px; color: #003b71; }
      .tag { font-size: 14px; color: #3d5a76; }
      .go { margin-top: 10px; padding: 10px 16px; border-radius: 12px; background: #003b71; color: #fff; font-weight: 700; }
      h2 { font-size: 20px; color: #003b71; margin: 32px 0 12px; }
      .initial { width: 64px; height: 64px; border-radius: 50%; background: #e7f0fa; color: #003b71; display: grid; place-items: center; font-size: 28px; font-weight: 800; }
      .adults .tag { text-align: center; }
      .error { color: #9b1c1c; min-height: 1.5em; }
      .reset { margin-top: 32px; padding-top: 16px; border-top: 1px solid #d5e4f2; }
      .reset button { min-height: 44px; padding: 8px 16px; border-radius: 10px; border: 2px solid #003b71; background: #fff; color: #003b71; font: inherit; font-weight: 700; cursor: pointer; margin: 4px 8px 4px 0; }
      .reset button.danger { background: #9b1c1c; border-color: #9b1c1c; color: #fff; }
      @media (max-width: 480px) { h1 { font-size: 24px; } }
    `}</style>
  </main>;
}
