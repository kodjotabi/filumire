// Local test harness only, bundled in memory by basic7-materials-pilot.browser.mjs.
// No Next route or learner onboarding entry imports this file.
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnswerCorrectionPanel } from "../../apps/learner/components/filumire/AnswerCorrectionPanel";
import { correctionFor } from "../../apps/learner/services/learning-presentation";
import { readPendingSubmission, writePendingSubmission, clearPendingSubmission } from "../../apps/learner/services/pending-submission";

function Pilot() {
  const [language, setLanguage] = useState<"en" | "fr">(new URL(location.href).searchParams.get("lang") === "fr" ? "fr" : "en");
  const [identity, setIdentity] = useState<any>();
  const [step, setStep] = useState<any>();
  const [held, setHeld] = useState<any>();
  const [correction, setCorrection] = useState<any>();
  const [phase, setPhase] = useState<"explain" | "retry" | "done">("explain");
  const [choice, setChoice] = useState("");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState<any>();
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Record<string, string>>({});
  const [practical, setPractical] = useState("");
  const t = (en: string, fr: string) => language === "en" ? en : fr;
  async function request(body?: any) {
    const response = await fetch(`/api/learning?sessionId=${identity.sessionId}&subjectId=${identity.subjectId}`, {
      method: body ? "POST" : "GET", headers: { "content-type": "application/json", "x-filumire-learner-id": identity.learnerId, "x-filumire-language": language },
      ...(body ? { body: JSON.stringify({ sessionId: identity.sessionId, competencyId: identity.competencyId, ...body }) } : {}),
    });
    const result = await response.json(); if (!response.ok) throw Error(result.error ?? "Learning request failed");
    return result;
  }
  async function resume() {
    const queued = readPendingSubmission(); if (!queued || queued.learnerId !== identity?.learnerId) return;
    const result = await request({ ...queued, interactionType: "assessment" });
    clearPendingSubmission(queued.clientRequestId); setStep(result); setStatus(t("Answer synchronised", "Réponse synchronisée"));
  }
  useEffect(() => { fetch("/test/new").then((r) => r.json()).then(setIdentity); }, []);
  useEffect(() => { if (identity) request().then(setStep); }, [identity]);
  useEffect(() => { if (!identity) return; const handler = () => { resume().catch((e) => setStatus(e.message)); }; window.addEventListener("online", handler); return () => window.removeEventListener("online", handler); }, [identity, language]);
  async function proceed() {
    setBusy(true);
    try {
      if (held) { setStep(held); setHeld(undefined); setCorrection(undefined); setChoice(""); return; }
      setStep(step.decision.interventionId ? await request({ interactionType: "acknowledge", interventionId: step.decision.interventionId }) : await request());
      setChoice("");
    } finally { setBusy(false); }
  }
  async function submit() {
    setBusy(true);
    const queued = { ...identity, assessmentItemId: step.content.assessmentItemId, response: choice, clientRequestId: crypto.randomUUID(), interventionId: step.decision.interventionId, queuedAt: new Date().toISOString() };
    try {
      const result = await request({ ...queued, interactionType: phase === "retry" && correction ? "corrective_retry" : "assessment" });
      const value = correctionFor(result, step.content.assessmentItemId);
      if (value) { setCorrection(value); setHeld(result); setPhase(value.retryOutcome ? "done" : "explain"); }
      else { setStep(result); setChoice(""); }
    } catch (e) {
      // Queue ordinary answers only, as in the Learner App. Never score locally.
      if (!navigator.onLine && !correction) { writePendingSubmission(queued); setStatus(t("Offline: answer saved for reconnection", "Hors ligne : réponse gardée pour la reconnexion")); }
      else setStatus(String(e));
    } finally { setBusy(false); }
  }
  if (!step) return <p>Loading isolated Science pilot…</p>;
  const options: string[] = JSON.parse(step.content?.metadata?.options ?? "[]");
  const complete = step.learnerState.competencies[0].readinessState?.readyForAdvancement;
  return <main style={{ maxWidth: 760, margin: "auto", padding: 16, fontFamily: "sans-serif", lineHeight: 1.6, overflowWrap: "anywhere" }}>
    <h1>{t("Basic 7 Science · isolated pilot", "Sciences, Basic 7 · pilote isolé")}</h1>
    <button onClick={() => setLanguage(language === "en" ? "fr" : "en")}>English / Français</button>
    {correction && <p role="note">{t("The current question stays in its original language during this guided retry.", "La question actuelle reste dans sa langue d'origine pendant cet essai guidé.")}</p>}
    <article data-item={step.content?.assessmentItemId ?? ""} data-action={step.decision.action} data-complete={String(Boolean(complete))}>
      <h2>{step.content?.title ?? t("Learning checks complete", "Vérifications terminées")}</h2><p>{step.content?.body}</p>
      {correction && <AnswerCorrectionPanel correction={correction} phase={phase} language={language} busy={busy} onRetry={() => { setPhase("retry"); setChoice(""); }} onContinue={proceed} />}
      {options.length > 0 && (!correction || phase === "retry") && <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <fieldset><legend>{t("Choose an answer", "Choisis une réponse")}</legend>{options.map((option) => <label key={option} style={{ display: "block", padding: 10 }}><input type="radio" name="answer" value={option} checked={choice === option} onChange={() => setChoice(option)} /> {option}</label>)}</fieldset>
        <button disabled={busy || !choice} type="submit">{t("Submit answer", "Envoyer la réponse")}</button>
      </form>}
      {!options.length && !complete && <button disabled={busy} onClick={proceed}>{t("Continue", "Continuer")}</button>}
    </article>
    <p role="status">{status}</p>
    <button onClick={async () => setProgress(await (await fetch(`/test/progress?learnerId=${identity.learnerId}`)).json())}>{t("View progress", "Voir les progrès")}</button>
    {progress && <p data-testid="progress">{t("Quiz mastery", "Maîtrise du quiz")}: {progress.mastery.masteredCompetencies}/1. {t("Practical activity requires teacher review.", "L'activité pratique exige une vérification par l'enseignant.")}</p>}
    <section><h2>{t("Observation table and discussion", "Tableau d'observation et discussion")}</h2>
      <p>{t("Record texture, appearance, colour and shape for a stone, water and air; group by state and discuss differences. Write 'not observed' when needed.", "Note texture, aspect, couleur et forme pour pierre, eau et air ; classe par état et discute des différences. Écris « non observé » si nécessaire.")}</p>
      <form onSubmit={async (e) => { e.preventDefault(); const response = await fetch("/test/observation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...identity, language, response: JSON.stringify(rows) }) }); if (!response.ok) throw Error("Observation submission failed"); setPractical(t("Awaiting teacher review", "En attente de vérification par l'enseignant")); }}>
        {["stone", "water", "air"].map((material) => <fieldset key={material}><legend>{t(material, { stone: "pierre", water: "eau", air: "air" }[material]!)}</legend>{["texture", "appearance", "colour", "shape", "state"].map((property) => <label style={{ display: "block" }} key={property}>{t(property, { texture: "texture", appearance: "aspect", colour: "couleur", shape: "forme", state: "état" }[property]!)} <input required aria-label={`${material}-${property}`} value={rows[`${material}-${property}`] ?? ""} onChange={(e) => setRows({ ...rows, [`${material}-${property}`]: e.target.value })} style={{ maxWidth: "100%" }} /></label>)}</fieldset>)}
        <label>{t("Discuss differences and give examples", "Discute les différences et donne des exemples")}<textarea required aria-label="discussion" onChange={(e) => setRows({ ...rows, discussion: e.target.value })} /></label>
        <button type="submit">{t("Send for teacher review", "Envoyer à l'enseignant")}</button>
      </form><p data-testid="practical-status">{practical}</p>
    </section>
  </main>;
}
createRoot(document.getElementById("root")!).render(<Pilot />);
