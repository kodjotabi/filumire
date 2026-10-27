"use client";

import { useState } from "react";

import {
  accountErrorMessage,
  leaveLearnerAsTeacher,
} from "../../services/account-client";
import type { Language } from "./language";

const TEXT = {
  en: {
    title: "Stop teaching a learner",
    intro: (name: string) =>
      `You will no longer see ${name}'s progress or work. ${name}'s learning and the family's access are not affected.`,
    start: (name: string) => `Stop teaching ${name}`,
    confirm: (name: string) =>
      `Stop teaching ${name}? To link again you will need a new code from ${name}'s parent or guardian.`,
    yes: "Yes, stop teaching",
    cancel: "Cancel",
    leaving: "Removing…",
  },
  fr: {
    title: "Ne plus suivre un apprenant",
    intro: (name: string) =>
      `Vous ne verrez plus la progression ni le travail de ${name}. L’apprentissage de ${name} et l’accès de la famille ne changent pas.`,
    start: (name: string) => `Ne plus suivre ${name}`,
    confirm: (name: string) =>
      `Ne plus suivre ${name} ? Pour l’associer de nouveau, il vous faudra un nouveau code du parent ou tuteur de ${name}.`,
    yes: "Oui, ne plus suivre",
    cancel: "Annuler",
    leaving: "Retrait…",
  },
};

/*
 * For a signed-in teacher: end their own link to the selected
 * learner, after an explicit confirmation. The server checks that
 * this teacher is linked; nothing else changes.
 */
export function TeacherLeaveLearner({
  language,
  learnerId,
  learnerName,
  onLeft,
}: {
  language: Language;
  learnerId: string;
  learnerName: string;
  onLeft: () => void;
}) {
  const t = TEXT[language];
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function leave() {
    setBusy(true);
    setMessage("");
    try {
      await leaveLearnerAsTeacher(learnerId);
      setConfirming(false);
      onLeft();
    } catch (error) {
      setMessage(accountErrorMessage(error, language));
    }
    setBusy(false);
  }

  return (
    <section className="tlvPanel" aria-labelledby="teacher-leave-title">
      <h2 id="teacher-leave-title">{t.title}</h2>
      <p className="tlvText">{t.intro(learnerName)}</p>
      {confirming ? (
        <div className="tlvConfirm" role="group" aria-label={t.title}>
          <p>{t.confirm(learnerName)}</p>
          <div className="tlvActions">
            <button type="button" className="tlvButton danger" disabled={busy} aria-busy={busy} onClick={() => void leave()}>
              {busy ? t.leaving : t.yes}
            </button>
            <button type="button" className="tlvButton quiet" disabled={busy} onClick={() => setConfirming(false)}>
              {t.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="tlvActions">
          <button type="button" className="tlvButton quiet" onClick={() => setConfirming(true)}>
            {t.start(learnerName)}
          </button>
        </div>
      )}
      <p className="tlvMessage" role="status">{message}</p>
      <style>{`
        .tlvPanel { display: grid; gap: 10px; padding: 16px; border-radius: 16px; background: #fff; border: 1px solid var(--ui-line, #dfe7f2); }
        .tlvPanel h2 { margin: 0; font-size: 18px; font-weight: 800; color: var(--ui-ink, #14213d); }
        .tlvText { margin: 0; font-size: 14px; color: var(--ui-ink-soft, #4a5d7a); }
        .tlvConfirm { display: grid; gap: 8px; }
        .tlvConfirm p { margin: 0; font-weight: 700; color: var(--ui-ink, #14213d); }
        .tlvActions { display: flex; flex-wrap: wrap; gap: 8px; }
        .tlvButton { min-height: 44px; padding: 0 16px; border: 0; border-radius: 999px; font: inherit; font-weight: 700; cursor: pointer; }
        .tlvButton.quiet { background: var(--ui-blue-tint, #e8f0fb); color: var(--ui-blue, #1f5fbf); }
        .tlvButton.danger { background: #b42318; color: #fff; }
        .tlvButton:disabled { opacity: 0.6; cursor: default; }
        .tlvMessage { margin: 0; font-size: 14px; color: #b42318; }
        .tlvMessage:empty { display: none; }
      `}</style>
    </section>
  );
}
