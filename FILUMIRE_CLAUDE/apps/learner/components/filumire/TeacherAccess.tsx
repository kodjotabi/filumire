"use client";

import { useState } from "react";

import {
  accountErrorMessage,
  createTeacherCode,
  listLearnerTeachers,
  removeLearnerTeacher,
  type LinkedTeacher,
} from "../../services/account-client";
import type { Language } from "./language";

const TEXT = {
  en: {
    open: "Teacher access",
    close: "Hide teacher access",
    intro: (name: string) =>
      `Teachers you link can see ${name}'s learning progress and leave notes. They cannot change ${name}'s details or sign in as ${name}.`,
    none: "No teacher is linked.",
    loading: "Loading…",
    remove: "Remove",
    removed: (teacher: string) => `${teacher} no longer has access.`,
    linkedSince: (date: string) => `Linked ${date}`,
    create: "Create a code for a teacher",
    creating: "Creating…",
    codeTitle: "Code for the teacher",
    codeHelp: (date: string) =>
      `Give this code to the teacher. It works once, until ${date}. Creating a new code cancels this one.`,
  },
  fr: {
    open: "Accès enseignant",
    close: "Masquer l’accès enseignant",
    intro: (name: string) =>
      `Les enseignants que tu ajoutes peuvent voir la progression de ${name} et laisser des notes. Ils ne peuvent pas modifier les informations de ${name} ni se connecter à sa place.`,
    none: "Aucun enseignant n’est associé.",
    loading: "Chargement…",
    remove: "Retirer",
    removed: (teacher: string) => `${teacher} n’a plus accès.`,
    linkedSince: (date: string) => `Associé le ${date}`,
    create: "Créer un code pour un enseignant",
    creating: "Création…",
    codeTitle: "Code pour l’enseignant",
    codeHelp: (date: string) =>
      `Donne ce code à l’enseignant. Il ne sert qu’une fois, jusqu’au ${date}. Créer un nouveau code annule celui-ci.`,
  },
};

function formatDate(value: string, language: Language): string {
  return new Date(value).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "long",
  });
}

/*
 * On the guardian's learner card: which teachers can see this
 * learner, removing them, and creating a one-time link code.
 */
export function TeacherAccess({
  learnerId,
  learnerName,
  language,
}: {
  learnerId: string;
  learnerName: string;
  language: Language;
}) {
  const t = TEXT[language];
  const [open, setOpen] = useState(false);
  const [teachers, setTeachers] = useState<LinkedTeacher[] | null>(null);
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);

  async function load() {
    try {
      setTeachers(await listLearnerTeachers(learnerId));
    } catch (error) {
      setOk(false);
      setMessage(accountErrorMessage(error, language));
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    setMessage("");
    if (next) void load();
  }

  async function newCode() {
    setBusy(true);
    setMessage("");
    try {
      setCode(await createTeacherCode(learnerId));
    } catch (error) {
      setOk(false);
      setMessage(accountErrorMessage(error, language));
    }
    setBusy(false);
  }

  async function remove(teacher: LinkedTeacher) {
    setBusy(true);
    setMessage("");
    try {
      await removeLearnerTeacher(learnerId, teacher.principalId);
      setOk(true);
      setMessage(t.removed(teacher.displayName || teacher.email));
      await load();
    } catch (error) {
      setOk(false);
      setMessage(accountErrorMessage(error, language));
    }
    setBusy(false);
  }

  return (
    <div className="taBox">
      <button type="button" className="acButton quiet" aria-expanded={open} onClick={toggle}>
        {open ? t.close : t.open}
      </button>

      {open ? (
        <div className="taBody">
          <p className="acSmall">{t.intro(learnerName)}</p>

          {teachers === null ? (
            <p className="acSmall">{t.loading}</p>
          ) : teachers.length === 0 ? (
            <p className="acSmall">{t.none}</p>
          ) : (
            <ul className="taList">
              {teachers.map((teacher) => (
                <li key={teacher.principalId}>
                  <div>
                    <strong>{teacher.displayName || teacher.email}</strong>
                    <span>{teacher.email}</span>
                    <span>{t.linkedSince(formatDate(teacher.linkedAt, language))}</span>
                  </div>
                  <button
                    type="button"
                    className="acButton secondary"
                    disabled={busy}
                    onClick={() => remove(teacher)}
                  >
                    {t.remove}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {code ? (
            <div className="taCode" role="status">
              <span>{t.codeTitle}</span>
              <strong>{code.code}</strong>
              <p>{t.codeHelp(formatDate(code.expiresAt, language))}</p>
            </div>
          ) : null}

          <button type="button" className="acButton" disabled={busy} aria-busy={busy} onClick={newCode}>
            {busy ? t.creating : t.create}
          </button>
        </div>
      ) : null}

      <p className={`acMessage${ok ? " ok" : ""}`} role="status">
        {message}
      </p>

      <style>{`
        .taBox { display: grid; gap: 8px; }
        .taBody { display: grid; gap: 10px; }
        .taList { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
        .taList li { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; border-radius: 12px; background: #f5f9ff; }
        .taList li div { display: grid; gap: 2px; }
        .taList strong { font-size: 15px; }
        .taList span { font-size: 13px; color: #4a5d7a; overflow-wrap: anywhere; }
        .taCode { display: grid; gap: 4px; padding: 12px; border-radius: 12px; background: #eef9ee; }
        .taCode span { font-size: 13px; font-weight: 700; color: #33476a; }
        .taCode strong { font-size: 26px; letter-spacing: 0.12em; font-family: ui-monospace, Menlo, Consolas, monospace; color: #14213d; }
        .taCode p { margin: 0; font-size: 13px; color: #33476a; }
      `}</style>
    </div>
  );
}
