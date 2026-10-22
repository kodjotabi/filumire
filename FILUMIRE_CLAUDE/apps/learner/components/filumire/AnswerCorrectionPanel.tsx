"use client";
import { useEffect, useRef } from "react";
import type { AnswerCorrection } from "../../services/learning-client";
import type { Language } from "./language";
import { ReadAloudControls } from "./ReadAloudControls";

export type CorrectionPhase = "explain" | "retry" | "done";

const copy = {
  en: {
    correctedTitle: "You corrected your mistake.",
    title: "Not quite yet. Let’s fix it together.", chose: "You chose:", why: "Why this answer is not right", idea: "The key idea",
    noExplanation: "This answer does not match what the question asks. Read the question again slowly and think about the key idea below.",
    retry: "Try the question again", retryHint: "Choose a different answer below. Your first answer is crossed out.",
    skip: "Continue without retrying", next: "Continue",
    right: "Yes, that’s right! You corrected your mistake.", rightNote: "This counts as guided practice. FILUMIRE will check this idea again later on your own.",
    wrong: "Not yet. That’s okay — mistakes help us learn.", wrongNote: "FILU will teach this idea again in your next steps.",
    used: "You have already used your retry for this question.",
    again: "Read FILU’s explanation again",
    more: "Read more",
  },
  fr: {
    correctedTitle: "Tu as corrigé ton erreur.",
    title: "Pas encore tout à fait. Corrigeons ensemble.", chose: "Tu as choisi :", why: "Pourquoi cette réponse n’est pas juste", idea: "L’idée clé",
    noExplanation: "Cette réponse ne correspond pas à ce que demande la question. Relis la question lentement et pense à l’idée clé ci-dessous.",
    retry: "Réessayer la question", retryHint: "Choisis une autre réponse ci-dessous. Ta première réponse est barrée.",
    skip: "Continuer sans réessayer", next: "Continuer",
    right: "Oui, c’est juste ! Tu as corrigé ton erreur.", rightNote: "Cela compte comme un entraînement guidé. FILUMIRE revérifiera cette idée plus tard, quand tu travailleras seul.",
    wrong: "Pas encore. Ce n’est pas grave — les erreurs nous aident à apprendre.", wrongNote: "FILU t’enseignera de nouveau cette idée dans tes prochaines étapes.",
    used: "Tu as déjà utilisé ton nouvel essai pour cette question.",
    again: "Relire l’explication de FILU",
    more: "Lire la suite",
  },
};

/**
 * Shown on the question's own screen after a wrong answer: what was chosen,
 * why it is not right, the key idea, then one retry before moving on.
 */
export function AnswerCorrectionPanel({ correction, phase, language, busy, onRetry, onContinue, learnerId, speechLanguage }: {
  correction: AnswerCorrection; phase: CorrectionPhase; language: Language; busy: boolean;
  onRetry: () => void; onContinue: () => void;
  /** Read-aloud of the shown explanation, in the lesson content's language. */
  learnerId?: string; speechLanguage?: "en" | "fr";
}) {
  const t = copy[language];
  const heading = useRef<HTMLHeadingElement | null>(null);
  const result = useRef<HTMLParagraphElement | null>(null);
  // During the retry the page focuses the answers instead.
  useEffect(() => { if (phase !== "retry") (phase === "done" ? result : heading).current?.focus(); }, [phase]);
  const outcome = correction.retryOutcome;
  // Children read two focused sentences first; the full authored text stays one tap away.
  const text = (passage: { body: string; short?: string }) => {
    const short = passage.short?.trim();
    return short && short !== passage.body.trim()
      ? <><p>{short}</p><details className="more"><summary>{t.more}</summary><p>{passage.body}</p></details></>
      : <p>{passage.body}</p>;
  };
  const teaching = <>
    <div className="passage">
      <h3>{t.why}</h3>
      {correction.explanation ? text(correction.explanation) : <p>{t.noExplanation}</p>}
    </div>
    {correction.concept && <div className="passage idea">
      <h3>{t.idea}</h3>
      {text(correction.concept)}
    </div>}
  </>;
  // Reads what is shown first: the short explanation and key idea.
  const spoken = [correction.explanation ? correction.explanation.short?.trim() || correction.explanation.body : t.noExplanation, correction.concept && (correction.concept.short?.trim() || correction.concept.body)].filter(Boolean).join(" ");
  return <section className={`answerCorrection ${outcome ?? "incorrect"}`} aria-labelledby="answer-correction-title" data-phase={phase}>
    <h2 id="answer-correction-title" ref={heading} tabIndex={-1}>{phase === "done" && outcome === "correct" ? t.correctedTitle : t.title}</h2>
    <p className="chosen">{t.chose} <q>{correction.chosen}</q></p>
    {phase === "explain" ? teaching : <details className="again"><summary>{t.again}</summary>{teaching}</details>}
    {phase === "explain" && speechLanguage && <ReadAloudControls learnerId={learnerId} text={spoken} language={speechLanguage} surface="correction" />}
    {phase === "explain" && <div className="actions">
      {correction.retryAvailable
        ? <button type="button" className="primary" onClick={onRetry} disabled={busy}>{t.retry} <span aria-hidden="true">↻</span></button>
        : <p role="status">{t.used}</p>}
      <button type="button" className={correction.retryAvailable ? "secondary" : "primary"} onClick={onContinue} disabled={busy}>{correction.retryAvailable ? t.skip : t.next}</button>
    </div>}
    {phase === "retry" && <p className="hint" role="status">{t.retryHint}</p>}
    {phase === "done" && <div className="actions">
      <p ref={result} tabIndex={-1} className={`result ${outcome}`} role="status"><strong>{outcome === "correct" ? t.right : t.wrong}</strong> {outcome === "correct" ? t.rightNote : t.wrongNote}</p>
      <button type="button" className="primary" onClick={onContinue} disabled={busy}>{t.next} <span aria-hidden="true">→</span></button>
    </div>}
    <style jsx>{`
      .answerCorrection { margin: 16px 0; padding: 16px; border-radius: 14px; border: 2px solid #f0b429; background: #fffaf0; color: #3d2c00; overflow-wrap: break-word; }
      .answerCorrection.correct { border-color: #12b350; background: #f0fbf4; color: #0f3d22; }
      h2 { margin: 0 0 8px; font-size: 18px; line-height: 1.35; } h2:focus, .result:focus { outline: 3px solid #277dca; outline-offset: 3px; }
      h3 { margin: 0 0 4px; font-size: 15px; }
      p { margin: 6px 0; line-height: 1.5; font-size: 16px; }
      .chosen q { font-weight: 700; text-decoration: line-through; text-decoration-thickness: 2px; }
      .passage { margin-top: 12px; padding: 12px; border-radius: 10px; background: #fff; border: 1px solid #f3dca2; }
      .passage.idea { border-color: #b5d4c5; background: #f7fcf9; color: #24463b; }
      .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; align-items: center; }
      .actions p { flex-basis: 100%; }
      button { min-height: 44px; padding: 10px 16px; font: inherit; font-weight: 700; border-radius: 10px; cursor: pointer; }
      button.primary { background: #003b71; color: #fff; border: 2px solid #003b71; }
      button.secondary { background: #fff; color: #003b71; border: 2px solid #003b71; }
      button:disabled { opacity: .6; cursor: default; }
      button:focus-visible { outline: 3px solid #277dca; outline-offset: 3px; }
      .hint { font-weight: 600; }
      .more summary { padding: 10px 0; cursor: pointer; font-weight: 700; text-decoration: underline; }
      .again { margin-top: 10px; } .again summary { padding: 12px 0; font-weight: 700; cursor: pointer; text-decoration: underline; }
      :global(.learnerUi[data-appearance="dark"]) .answerCorrection { background: #3a3220; color: #fff4d6; border-color: #d9a520; }
      :global(.learnerUi[data-appearance="dark"]) .answerCorrection.correct { background: #1f3a2a; color: #dbf7e6; border-color: #3fcf7a; }
      :global(.learnerUi[data-appearance="dark"]) .passage { background: #203752; color: #e5efff; border-color: #839fbe; }
      @media (max-width: 480px) { .answerCorrection { padding: 12px; } .actions button { flex: 1 1 100%; } }
    `}</style>
  </section>;
}
