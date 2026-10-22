// Test preview only. Never imported by Next.js or general learner navigation.
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { AnswerCorrectionPanel } from "../../apps/learner/components/filumire/AnswerCorrectionPanel";
import { correctionFor } from "../../apps/learner/services/learning-presentation";
import { writePendingSubmission, readPendingSubmission, clearPendingSubmission } from "../../apps/learner/services/pending-submission";

function Materials() {
  const params = new URL(location.href).searchParams;
  const [language, setLanguage] = useState<"en" | "fr">(params.get("lang") === "fr" ? "fr" : "en");
  const [identity, setIdentity] = useState<any>(), [step, setStep] = useState<any>(), [held, setHeld] = useState<any>();
  const [correction, setCorrection] = useState<any>(), [phase, setPhase] = useState<"explain" | "retry" | "done">("explain");
  const [response, setResponse] = useState(""), [status, setStatus] = useState(""), [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<any>();
  const t = (en: string, fr: string) => language === "en" ? en : fr;
  async function request(body?: any) {
    const reply = await fetch(`/api/learning?sessionId=${identity.sessionId}&subjectId=${identity.subjectId}`, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", "x-filumire-language": language }, ...(body ? { body: JSON.stringify({ sessionId: identity.sessionId, competencyId: identity.competencyId, ...body }) } : {}) });
    const data = await reply.json(); if (!reply.ok) throw Error(data.error); return data;
  }
  function accept(result: any, itemId: string) {
    if (result.pendingTeacherReview) { setPending(true); setStatus(t("Awaiting teacher review", "En attente de l'enseignant")); return; }
    const value = correctionFor(result, itemId);
    if (value) { setHeld(result); setCorrection(value); setPhase(value.retryOutcome ? "done" : "explain"); }
    else { setStep(result); setResponse(""); }
  }
  useEffect(() => { fetch(`/test/new?topic=${params.get("topic") ?? "0"}`).then(r => r.json()).then(setIdentity); }, []);
  useEffect(() => { if (identity) request().then(setStep); }, [identity]);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  useEffect(() => {
    if (!identity) return;
    const sync = async () => {
      const queued = readPendingSubmission(); if (!queued || queued.learnerId !== identity.learnerId) return;
      const result = await request({ ...queued, interactionType: "assessment" });
      clearPendingSubmission(queued.clientRequestId); accept(result, queued.assessmentItemId); setStatus(t("Answer synchronised", "Réponse synchronisée"));
    };
    const handler = () => { sync().catch(e => setStatus(String(e))); };
    window.addEventListener("online", handler); return () => window.removeEventListener("online", handler);
  }, [identity, language]);
  async function proceed() {
    if (held) { setStep(held); setHeld(undefined); setCorrection(undefined); setResponse(""); return; }
    setStep(await request({ interactionType: "acknowledge", interventionId: step.decision.interventionId })); setResponse("");
  }
  async function submit() {
    const queued = { ...identity, assessmentItemId: step.content.assessmentItemId, response, clientRequestId: crypto.randomUUID(), interventionId: step.decision.interventionId, queuedAt: new Date().toISOString() };
    try { accept(await request({ ...queued, interactionType: correction && phase === "retry" ? "corrective_retry" : "assessment" }), queued.assessmentItemId); }
    catch (e) { if (!navigator.onLine && !correction) { writePendingSubmission(queued); setStatus(t("Offline: answer queued", "Hors ligne : réponse en attente")); } else setStatus(String(e)); }
  }
  if (!step) return <p>Loading isolated JHS preview…</p>;
  const options: string[] = JSON.parse(step.content?.metadata?.options ?? "[]");
  return <main style={{ maxWidth: 900, margin: "auto", padding: 20, lineHeight: 1.65, fontFamily: "system-ui", color: "#183642", overflowWrap: "anywhere" }}>
    <header><h1>{identity.gradeLabel ? `Basic ${identity.gradeLabel} · ${identity.subjectLabel}` : t("JHS 1 · Science", "JHS 1 · Sciences")}</h1><p>{t("Unpublished development preview · fictional learner · teacher review required", "Aperçu de développement non publié · élève fictif · examen par l’enseignant requis")}</p><button onClick={() => setLanguage(language === "en" ? "fr" : "en")}>{language === "en" ? "Français" : "English"}</button></header>
    <nav aria-label="Materials topics">{identity.topics.map((topic: any, i: number) => <a style={{ display: "block", padding: 8 }} key={topic.id} href={`/?topic=${i}&lang=${language}`}>{topic.title[language]}</a>)}</nav>
    <article style={{ borderTop: "3px solid #327a82", marginTop: 20 }}><h2>{step.content?.title}</h2><p data-testid="body" style={{ whiteSpace: "pre-wrap" }}>{step.content?.body}</p>
      {correction && <AnswerCorrectionPanel correction={correction} phase={phase} language={language} busy={false} onRetry={() => { setPhase("retry"); setResponse(""); }} onContinue={proceed} />}
      {!pending && options.length > 0 && (!correction || phase === "retry") && <form onSubmit={e => { e.preventDefault(); submit(); }}><fieldset><legend>{t("Choose an answer", "Choisir une réponse")}</legend>{options.map(option => <label key={option} style={{ display: "block", padding: 10 }}><input type="radio" name="answer" value={option} checked={response === option} onChange={() => setResponse(option)} />{option}</label>)}</fieldset><button disabled={!response} type="submit">{t("Submit answer", "Envoyer la réponse")}</button></form>}
      {!pending && step.content?.metadata?.evaluationMethod === "trusted_rubric_evaluation" && <form onSubmit={e => { e.preventDefault(); submit(); }}><label>{t("Your independent work (teacher inspection required)", "Ton travail autonome (examen par l'enseignant requis)")}<textarea aria-label="Independent work" rows={8} value={response} onChange={e => setResponse(e.target.value)} style={{ display: "block", width: "100%", boxSizing: "border-box" }} /></label><button disabled={!response} type="submit">{t("Send for teacher review", "Envoyer à l'enseignant")}</button></form>}
      {!step.content?.assessmentItemId && <button onClick={proceed}>{t("Continue", "Continuer")}</button>}
    </article><p role="status">{status}</p><button onClick={async () => setProgress(await (await fetch(`/test/progress?learnerId=${identity.learnerId}`)).json())}>{t("View progress", "Voir les progrès")}</button>{progress && <p data-testid="progress">{t("Recorded evidence", "Éléments enregistrés")}: {progress.evidenceCount}. {t("Pending work is not mastery.", "Le travail en attente ne démontre pas la maîtrise.")}</p>}
  </main>;
}
createRoot(document.getElementById("root")!).render(<Materials />);
