"use client";
import { useEffect, useRef } from "react";
import type { LessonClosure } from "../../../../packages/contracts/lesson-closure";
import type { LearningResponse } from "../../services/learning-client";
import { closureNextStep, closureReview } from "../../services/lesson-closure-presentation";
import { ReadAloudControls } from "./ReadAloudControls";
import { OutlineVisuals } from "./OutlineVisual";

const copy = {
  en: {
    summary: "Your lesson summary", covered: "What you covered", example: "Example you studied",
    boundary: "You finished this teaching activity. That does not yet show that you have mastered the topic.",
    missing: "A summary in this language is not available for this lesson. Your completed activity is still recorded.",
    review: "Your recommended review", next: "Your next learning step", seeReview: "See my recommended review", back: "Read my summary again", start: "Continue to the recommended activity",
    check: "Let’s check the idea you have just studied.", targeted: "Practise the idea with the activity FILUMIRE has chosen for you.",
    reinforce: "Try another explanation or guided activity to strengthen this idea.", prerequisite: "Review an earlier idea that will help with this topic.",
    retention: "Check what you remember from an earlier topic.", transfer: "Try using the idea in a different situation.",
    progress: "Continue to the next activity chosen by FILUMIRE. Moving on does not always mean the previous topic is mastered.",
    finished: "The adaptive engine has confirmed the end of this learning sequence.", support: "Ask your teacher for help with the topics that need support. Your recorded work is kept.", continue: "Continue with the current activity chosen by FILUMIRE.",
    strong: "Your recorded evidence shows strong understanding. Keep following FILUMIRE’s next step.", partial: "You have shown some understanding. The next activity will help check the part that still needs practice.",
    errors: "Some parts have been tricky. FILUMIRE is using your recorded answers to guide what comes next.", unknown: "Reading a lesson is a start. The next activity helps us find out what you understand.",
    optional: "Optional quick practice", reflect: "Explain the key idea in one sentence, or talk through the example you studied. This reflection is not scored.",
    later: "FILUMIRE will check your memory when its spaced-review policy recommends it. This summary does not schedule a new test.", audio: "Read this summary aloud",
  },
  fr: {
    summary: "Le résumé de ta leçon", covered: "Ce que tu as étudié", example: "L’exemple que tu as étudié",
    boundary: "Tu as terminé cette activité d’apprentissage. Cela ne montre pas encore que tu maîtrises le thème.",
    missing: "Le résumé de cette leçon n’est pas disponible dans cette langue. Ton activité terminée reste enregistrée.",
    review: "Ta révision recommandée", next: "Ta prochaine étape", seeReview: "Voir ma révision recommandée", back: "Relire mon résumé", start: "Continuer vers l’activité recommandée",
    check: "Vérifions l’idée que tu viens d’étudier.", targeted: "Entraîne-toi avec l’activité que FILUMIRE a choisie pour toi.",
    reinforce: "Essaie une autre explication ou une activité guidée pour renforcer cette idée.", prerequisite: "Revois une idée précédente qui t’aidera dans ce thème.",
    retention: "Vérifie ce dont tu te souviens dans un thème précédent.", transfer: "Essaie d’utiliser cette idée dans une autre situation.",
    progress: "Continue vers l’activité choisie par FILUMIRE. Avancer ne signifie pas toujours que le thème précédent est maîtrisé.",
    finished: "Le moteur adaptatif a confirmé la fin de cette séquence d’apprentissage.", support: "Demande à ton enseignant de t’aider dans les thèmes difficiles. Ton travail enregistré est conservé.", continue: "Continue avec l’activité actuelle choisie par FILUMIRE.",
    strong: "Tes réponses enregistrées montrent une bonne compréhension. Suis la prochaine étape choisie par FILUMIRE.", partial: "Tu as montré une certaine compréhension. L’activité suivante aidera à vérifier ce qui demande encore de l’entraînement.",
    errors: "Certaines parties ont été difficiles. FILUMIRE utilise tes réponses enregistrées pour choisir la suite.", unknown: "Lire une leçon est un début. L’activité suivante nous aide à découvrir ce que tu comprends.",
    optional: "Petit entraînement facultatif", reflect: "Explique l’idée principale en une phrase, ou décris l’exemple que tu as étudié. Cette réflexion n’est pas évaluée.",
    later: "FILUMIRE vérifiera ta mémoire quand sa règle de révision espacée le recommandera. Ce résumé ne programme pas de nouveau test.", audio: "Écouter ce résumé",
  },
};
export function LessonClosureCard({ closure, decision, phase, onPhase, onContinue, busy = false, onReadAloud, learnerId, visualContextSafe = false }: {
  closure: LessonClosure; decision: LearningResponse["decision"]; phase: "summary" | "review";
  onPhase: (phase: "summary" | "review") => void; onContinue: () => void; busy?: boolean;
  onReadAloud?: (text: string, language: "en" | "fr") => void;
  learnerId?: string;
  visualContextSafe?: boolean;
}) {
  const t = copy[closure.language];
  const focus = useRef<HTMLElement>(null);
  useEffect(() => { focus.current?.focus(); }, [closure.interventionId, phase]);
  const next = closureNextStep(decision);
  return <section className="closureCard" ref={focus} tabIndex={-1} lang={closure.language} aria-labelledby="closure-heading">
    <h2 id="closure-heading">{phase === "summary" ? t.summary : t.review}</h2>
    {phase === "summary" ? <>
      <p className="boundary">{t.boundary}</p>
      {closure.summary.available ? <>
        <h3>{closure.summary.title}</h3>
        {visualContextSafe && ["teach", "remediate", "advance", "complete"].includes(decision.action) && <OutlineVisuals visuals={closure.summary.visuals} competencyId={closure.competencyId} language={closure.language} stage="Reflect" />}
        {closure.summary.concepts.length > 0 && <><h4>{t.covered}</h4><ul>{closure.summary.concepts.map((text, index) => <li key={index}>{text}</li>)}</ul></>}
        {closure.summary.examples.length > 0 && <><h4>{t.example}</h4>{closure.summary.examples.map((text, index) => <p key={index}>{text}</p>)}</>}
        {onReadAloud && <button type="button" onClick={() => onReadAloud(closure.summary.narration, closure.language)}>{t.audio}</button>}
        {learnerId && <ReadAloudControls learnerId={learnerId} text={closure.summary.narration} language={closure.language} surface="summary" />}
      </> : <p>{t.missing}</p>}
      <button type="button" onClick={() => onPhase("review")} disabled={busy}>{t.seeReview}</button>
    </> : <>
      <p>{t[closureReview(closure)]}</p>
      {closureReview(closure) === "strong" && <details><summary>{t.optional}</summary><p>{t.reflect}</p></details>}
      <h3>{t.next}</h3><p>{t[next]}</p>
      {closure.evidence.retentionDueAt && closure.evidence.acquisition === "established" && next !== "retention" && <p>{t.later}</p>}
      <div className="actions"><button type="button" onClick={onContinue} disabled={busy}>{t.start}</button><button className="secondary" type="button" onClick={() => onPhase("summary")} disabled={busy}>{t.back}</button></div>
    </>}
    <style jsx>{`
      .closureCard { padding: 24px; margin: 18px 0; border: 1px solid #c8e1d7; border-radius: 20px; background: #f7fcf9; color: #24463b; line-height: 1.65; }
      h2 { color: #0f2a6b; margin: 0 0 16px; font-size: 24px; } h3,h4 { margin: 16px 0 8px; }
      p,li { font-size: 17px; overflow-wrap: break-word; white-space: pre-wrap; } li { margin-bottom: 10px; }
      .boundary { font-size: 15px; padding: 12px; background: white; border-radius: 12px; } ul { padding-left: 22px; }
      button { min-height: 44px; padding: 12px 18px; border: 0; border-radius: 12px; background: #176651; color: white; font: inherit; font-weight: 700; cursor: pointer; }
      button:disabled { opacity: .6; cursor: default; } .actions { display: flex; flex-wrap: wrap; gap: 12px; } .secondary { color: #176651; background: #e4f1eb; }
      :focus-visible { outline: 3px solid #277dca; outline-offset: 3px; } details { padding: 12px; background: white; border-radius: 12px; } summary { cursor: pointer; }
      @media (max-width: 480px) { .closureCard { padding: 16px; } .actions button { width: 100%; } }
    `}</style>
  </section>;
}
