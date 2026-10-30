"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { FiluAvatar } from "./SubjectIcon";
import { ReadAloudControls } from "./ReadAloudControls";
import {
  clearConversation, readConversation, saveConversation, sendConversation, fetchConversationContext,
  ConversationRequestError, type SessionConversation,
} from "../../services/conversation-client";
import { CONVERSATION_TTL_MS, MAX_QUESTION_LENGTH, type ConversationRequest, type ConversationContextResponse } from "../../../../packages/ai/conversation";
import { conversationSafety, privateQuestionLabel } from "../../../../packages/ai/conversation-safety";

const copy = {
  en: {
    notice: "FILU helps using your lesson materials. It is not a person and may not understand every question. Keep names, addresses, passwords and contact details private. This chat expires after 30 minutes and is not saved to your account.",
    intro: "Ask about your lesson, then ask a follow-up. During scored activities, FILU guides your thinking without giving or marking answers.",
    question: "Your question for FILU", placeholder: "What would you like help with?", send: "Send", retry: "Retry", clear: "Clear conversation",
    loading: "FILU is preparing a response…", chat: "Conversation with FILU", you: "You", mock: "FILU",
    explain: "Explain this", hint: "Give me a hint", example: "Show an example", practice: "Let me practise", simpler: "Make it simpler", actions: "Ways FILU can help", edit: "Edit question",
    protected: "Your scored answer stays your own. FILU can explain ideas,offer a different example and give non-revealing hints.",
    practising: "Practice in this chat does not change your marks or progress.",
    slow: "FILU is taking too long to answer. Your question is kept: press Retry.",
    unavailable: "Open a lesson first so FILU can use your learning context.",
    noLearner: "FILU could not confirm who is learning. Reload the page, or sign in again.", network: "Your question has not received a response. Check your connection, then retry.",
    provider: "FILU could not prepare a response. Please retry.", auth: "Your session has ended. Sign in again to continue.",
    changed: "Your lesson or conversation session changed. Send your question again using the current context.",
    rate: "Please wait before retrying. Too many questions were sent.", expired: "This conversation has expired. You can start a new one.",
  },
  fr: {
    notice: "FILU t'aide avec le contenu de tes leçons. Ce n'est pas une personne et il peut ne pas comprendre toutes les questions. Garde ton nom, ton adresse, tes mots de passe et tes coordonnées privés. Cette conversation expire après 30 minutes et n'est pas enregistrée dans ton compte.",
    intro: "Pose une question sur ta leçon, puis une question de suivi. Pendant une activité évaluée, FILU guide ta réflexion sans donner ni valider les réponses.",
    question: "Ta question pour FILU", placeholder: "Sur quoi voudrais-tu de l’aide ?", send: "Envoyer", retry: "Réessayer", clear: "Effacer la conversation",
    loading: "FILU prépare une réponse…", chat: "Conversation avec FILU", you: "Toi", mock: "FILU",
    explain: "Explique-moi", hint: "Donne-moi un indice", example: "Montre un exemple", practice: "Je veux m'entraîner", simpler: "Explique plus simplement", actions: "Comment FILU peut aider", edit: "Modifier la question",
    protected: "Ta réponse évaluée reste la tienne. FILU peut expliquer les idées, proposer un autre exemple et donner des indices sans révéler la réponse.",
    practising: "L'entraînement dans cette conversation ne change ni tes notes ni ta progression.",
    slow: "FILU met trop de temps à répondre. Ta question est gardée : appuie sur Réessayer.",
    unavailable: "Ouvre d’abord une leçon pour que FILU utilise ton contexte d’apprentissage.",
    noLearner: "FILU n’a pas pu confirmer qui apprend. Recharge la page ou reconnecte-toi.", network: "Ta question n’a pas reçu de réponse. Vérifie ta connexion, puis réessaie.",
    provider: "FILU n’a pas pu préparer de réponse. Réessaie.", auth: "Ta session est terminée. Reconnecte-toi pour continuer.",
    changed: "Ta leçon ou ta session de conversation a changé. Envoie à nouveau ta question avec le contexte actuel.",
    rate: "Attends avant de réessayer. Trop de questions ont été envoyées.", expired: "Cette conversation a expiré. Tu peux en commencer une nouvelle.",
  },
};

export function FiluConversation({ language, scope: learnerId, contextKey, onContext }: { language: "en" | "fr"; scope?: string; contextKey?: string; onContext?: (value: ConversationContextResponse) => void }) {
  const scope = learnerId ? JSON.stringify([learnerId, contextKey ?? ""]) : undefined;
  const t = copy[language];
  const [conversation, setConversation] = useState<SessionConversation>({ scope: scope ?? "", expiresAt: 0 });
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<keyof typeof copy.en | "">("");
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const generation = useRef(0);
  const guard = useRef({ begin: () => ++generation.current, accepts: (ticket: number) => ticket === generation.current, invalidate: () => { generation.current++; } });
  const busyRef = useRef(false);
  const controller = useRef<AbortController | undefined>(undefined);
  const log = useRef<HTMLDivElement>(null);
  const latestQuestion = useRef<HTMLElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const askedHere = useRef(false);
  const [contextInfo, setContextInfo] = useState<ConversationContextResponse | null>(null);

  useEffect(() => {
    if (!scope) return;
    const abort = new AbortController();
    setContextInfo(null);
    void fetchConversationContext(language, abort.signal).then(value => {
      if (abort.signal.aborted) return;
      setContextInfo(value); onContext?.(value);
    }).catch(() => { /* POST enforces context; do not block safety guidance on metadata failure. */ });
    return () => abort.abort();
  }, [scope, language, onContext]);

  useEffect(() => {
    const requestGuard = guard.current;
    setConversation(scope ? readConversation(scope) : { scope: "", expiresAt: 0 });
    setDraft(""); setError(""); setBusy(false); setRetryAt(0); busyRef.current = false;
    return () => { requestGuard.invalidate(); controller.current?.abort(); };
  }, [scope]);
  useEffect(() => {
    if (!conversation.expiresAt || !scope) return;
    const timer = setTimeout(() => {
      guard.current.invalidate(); controller.current?.abort(); clearConversation(); busyRef.current = false;
      setBusy(false); setConversation({ scope, expiresAt: 0 }); setError("expired");
    }, Math.max(0, conversation.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [conversation.expiresAt, scope]);
  useEffect(() => {
    if (retryAt <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  useEffect(() => {
    // Start each turn at the question, not at the voice controls below its reply.
    // Keep long replies scrollable without moving the page or keyboard viewport.
    const transcript = log.current;
    if (!transcript) return;
    const question = latestQuestion.current;
    if (transcript.scrollHeight <= transcript.clientHeight + 1) {
      // Phones: the transcript is part of the page, so bring the learner's own
      // question into view after they send, never on first load.
      if (question && askedHere.current) question.scrollIntoView({ block: "start", behavior: "smooth" });
      if (!busy) askedHere.current = false;
      return;
    }
    transcript.scrollTop = question
      ? Math.max(0, transcript.scrollTop + question.getBoundingClientRect().top - transcript.getBoundingClientRect().top - transcript.clientTop - 12)
      : 0;
  }, [conversation, busy]);

  const current = conversation.scope === scope ? conversation : { scope: scope ?? "", expiresAt: 0 };
  async function submit(retry?: ConversationRequest, selectedQuestion?: string) {
    if (!scope || busyRef.current || Date.now() < retryAt || error === "auth" || (!retry && !(selectedQuestion ?? draft).trim())) return;
    busyRef.current = true; askedHere.current = true; setBusy(true); setError("");
    const ticket = guard.current.begin();
    const pending = retry ?? {
      question: (selectedQuestion ?? draft).trim(), language, requestId: crypto.randomUUID(), historyToken: current.response?.historyToken,
    };
    const next: SessionConversation = { ...current, expiresAt: current.expiresAt > Date.now() ? current.expiresAt : Date.now() + CONVERSATION_TTL_MS, pending };
    setConversation(next); saveConversation(next); setDraft("");
    controller.current = new AbortController();
    try {
      const response = await sendConversation(pending, controller.current.signal);
      if (!guard.current.accepts(ticket)) return;
      const completed = { scope, expiresAt: response.expiresAt, response };
      setConversation(completed); saveConversation(completed);
    } catch (failure) {
      if (!guard.current.accepts(ticket)) return;
      const problem = failure instanceof ConversationRequestError ? failure : new ConversationRequestError("temporarily_unavailable", 503);
      if (problem.status === 401) {
        clearConversation(); setConversation({ scope, expiresAt: 0 }); setError("auth");
      } else if (problem.status === 409) {
        const reset = ["invalid_history", "history_expired"].includes(problem.code);
        const recovered = { ...next, pending: undefined, response: reset ? undefined : next.response };
        setConversation(recovered); saveConversation(recovered); setDraft(pending.question); setError(problem.code === "context_unavailable" ? "unavailable" : "changed");
      } else if (problem.status === 400 || problem.status === 413) {
        const recovered = { ...next, pending: undefined };
        setConversation(recovered); saveConversation(recovered); setDraft(pending.question); setError("provider");
      } else {
        setError(problem.status === 429 ? "rate" : problem.code === "timeout" ? "slow" : problem.status === 0 ? "network" : "provider");
        if (problem.status === 429) setRetryAt(Date.now() + Math.max(1, problem.retryAfterSeconds) * 1000);
      }
    } finally {
      if (guard.current.accepts(ticket)) { busyRef.current = false; setBusy(false); }
    }
  }
  function clear() {
    guard.current.invalidate(); controller.current?.abort(); busyRef.current = false;
    clearConversation(); setConversation({ scope: scope ?? "", expiresAt: 0 }); setBusy(false); setDraft(""); setError("");
  }
  function editPending() {
    if (!current.pending || busy) return;
    const recovered = { ...current, pending: undefined };
    setDraft(current.pending.question); setConversation(recovered); saveConversation(recovered); setError(""); field.current?.focus();
  }
  function onSubmit(event: FormEvent) { event.preventDefault(); void submit(current.pending); }
  const waiting = retryAt > now;
  const latestQuestionIndex = current.response?.messages.reduce((last, message, index) => message.role === "user" ? index : last, -1);
  return (
    <section className="filuConversation" aria-label={t.chat}>
      <p className="mockNotice" id="filu-privacy-notice">{t.notice}</p>
      {(current.response?.assessmentProtected ?? contextInfo?.assessmentProtected) && <p className="filuStatus" role="status">{t.protected}</p>}
      {current.response?.practiceActive && <p className="filuStatus" role="status">{t.practising}</p>}
      {/* The conversation comes first and the question box follows it, as in
          any chat: a reply always appears just above where the learner types. */}
      <div className="transcript" ref={log} role="log" aria-live="polite" aria-relevant="additions text" aria-busy={busy} tabIndex={0}>
        <p className="transcriptIntro">{scope ? t.intro : t.noLearner}</p>
        {current.response?.messages.map((message, index) => (
          <article ref={!current.pending && index === latestQuestionIndex ? latestQuestion : undefined} className={`message ${message.role}`} key={`${index}-${message.role}`} lang={message.language}>
            {message.role === "assistant" && <FiluAvatar className="conversationAvatar" />}
            <div><strong>{message.role === "user" ? t.you : t.mock}</strong><p>{message.text}</p>{message.role === "assistant" && <ReadAloudControls learnerId={learnerId} text={message.text} language={message.language} surface="filu" />}</div>
          </article>
        ))}
        {current.pending && <article ref={latestQuestion} className="message user" lang={current.pending.language}><div><strong>{t.you}</strong><p>{conversationSafety(current.pending.question) ? privateQuestionLabel(current.pending.language) : current.pending.question}</p></div></article>}
        {busy && <p className="filuStatus" role="status">{t.loading}</p>}
      </div>
      {error && <p className="filuError" role="alert" id="filu-request-error">{t[error]}</p>}

      {scope && !current.pending && error !== "auth" && (
        <div className="quickActions" role="group" aria-label={t.actions}>
          {[t.explain, t.example, t.hint, t.simpler, t.practice].map(label => (
            <button key={label} type="button" className="quickAction" disabled={busy || waiting} onClick={() => void submit(undefined, label)}>{label}</button>
          ))}
        </div>
      )}
      <form className="filuQuestion" onSubmit={onSubmit} aria-busy={busy}>
        <label htmlFor="filu-question">{t.question}</label>
        <div className="compose">
          <textarea ref={field} id="filu-question" rows={2} maxLength={MAX_QUESTION_LENGTH} value={draft} placeholder={t.placeholder}
            aria-describedby={error ? "filu-privacy-notice filu-request-error" : "filu-privacy-notice"}
            disabled={!scope || busy || Boolean(current.pending) || error === "auth"} onChange={(event) => setDraft(event.target.value)}
            enterKeyHint="send" onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(current.pending); }
            }} />
          <button type="submit" disabled={!scope || busy || waiting || error === "auth" || (!current.pending && !draft.trim())}>{busy ? "…" : current.pending ? t.retry : t.send}</button>
        </div>
      </form>

      <div className="chatTools">
        {current.pending && !busy && <button type="button" className="clearChat" onClick={editPending}>{t.edit}</button>}
        {error === "auth" && <Link className="clearChat" href={`/login?lang=${language}`}>{language === "fr" ? "Se reconnecter" : "Sign in again"}</Link>}
        {(current.response?.messages.length || current.pending) ? <button className="clearChat" type="button" onClick={clear}>{t.clear}</button> : null}
      </div>
      <style jsx>{`
        .filuConversation { color: #253e44; margin: 12px 0; display: flex; flex-direction: column; gap: 12px; }
        .mockNotice { margin: 0; font-size: 13px; line-height: 1.5; padding: 10px 14px; background: #f0f7f5; border-radius: 14px; }
        .filuStatus { margin: 0; padding: 10px 14px; border-radius: 12px; background: #fff6e0; color: #5a3d00; font-size: 15px; line-height: 1.5; }
        .transcript .filuStatus { background: transparent; padding: 4px 0; color: #4b5d61; }
        .filuError { margin: 0; padding: 10px 14px; border-radius: 12px; background: #fdecec; color: #8a1f1f; font-weight: 600; }
        .transcriptIntro { margin: 0; color: #4b5d61; font-size: 15px; line-height: 1.5; }
        .quickActions { display: flex; flex-wrap: wrap; gap: 8px; }
        .quickActions .quickAction { min-height: 40px; padding: 8px 14px; border-radius: 999px; background: #edf6f2; color: #135a47; border: 1px solid #b9d9cd; font-size: 15px; font-weight: 600; }
        .chatTools { display: flex; flex-wrap: wrap; gap: 8px; }
        .chatTools:empty { display: none; }
        .transcript { max-height: min(60dvh, 560px); overflow-y: auto; overflow-anchor: none; overscroll-behavior: contain; padding: 14px; border: 1px solid #d4e5df; border-radius: 18px; background: white; }
        .message { display: flex; gap: 10px; margin: 16px 0; align-items: flex-start; }
        .message > div { border-radius: 16px; padding: 12px 16px; background: #f1f6f4; min-width: 0; max-width: 90%; }
        .message.user { justify-content: flex-end; }
        .message.user > div { background: #e4f4ef; }
        .message.assistant > div { flex: 1; min-width: 0; max-width: 100%; }
        .message :global(.readAloud) { min-width: 0; max-width: 100%; }
        .message :global(.readAloud label) { min-width: 0; max-width: 100%; }
        .message :global(.readAloud select) { min-width: 0; max-width: 100%; }
        .message p { margin: 8px 0 0; white-space: pre-wrap; overflow-wrap: break-word; line-height: 1.65; font-size: 16px; }
        .message strong { font-size: 13px; }
        label { display: block; font-weight: 700; margin: 0 0 8px; }
        .compose { display: flex; gap: 10px; align-items: stretch; }
        textarea { min-width: 0; flex: 1; resize: vertical; padding: 12px; border: 1px solid #91b8aa; border-radius: 12px; font: inherit; font-size: 16px; max-height: 160px; }
        button { min-height: 44px; padding: 10px 18px; border: 0; border-radius: 12px; background: #176651; color: white; font: inherit; font-weight: 700; cursor: pointer; }
        button:disabled { opacity: .55; cursor: default; }
        .clearChat { color: #176651; background: #edf6f2; }
        :focus-visible { outline: 3px solid #277dca; outline-offset: 3px; }
        /* Phones: one page scroll, not a small scroll box inside the page. */
        @media (max-width: 480px) {
          .transcript { padding: 10px; max-height: none; overflow: visible; }
          .compose button { padding: 10px 14px; }
          .message > div { max-width: 100%; padding: 10px 12px; }
          .message :global(.conversationAvatar) { display: none; }
        }
      `}</style>
    </section>
  );
}
