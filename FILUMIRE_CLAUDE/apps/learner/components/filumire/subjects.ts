/*
 * Presentation metadata only. Which subjects a learner sees is
 * decided by the server (the curriculum framework's available
 * subjects for the learner's grade, returned in the learning
 * overview). This file maps each subject's stable discipline key
 * to how it looks; it never decides which subjects exist.
 */
export type FilumireSubjectKey =
  | "english"
  | "mathematics"
  | "science"
  | "computing";

type FilumireSubjectPresentation = {
  name: string;
  shortLabel: string;
  accent: string;
  softAccent: string;
};

export const SUBJECT_PRESENTATION: Readonly<
  Record<FilumireSubjectKey, FilumireSubjectPresentation>
> = {
  english: {
    name: "English",
    shortLabel: "EN",
    accent: "#e85d75",
    softAccent: "#fff0f3",
  },
  mathematics: {
    name: "Mathematics",
    shortLabel: "MA",
    accent: "#009fe3",
    softAccent: "#eaf7fd",
  },
  science: {
    name: "Science",
    shortLabel: "SC",
    accent: "#46b649",
    softAccent: "#eef9ee",
  },
  computing: {
    name: "Computing",
    shortLabel: "CO",
    accent: "#7a63c7",
    softAccent: "#f2effb",
  },
};

export type FilumireSubject = FilumireSubjectPresentation & {
  key: FilumireSubjectKey;
  subjectId: string;
};

export function isFilumireSubjectKey(
  value: string,
): value is FilumireSubjectKey {
  return Object.prototype.hasOwnProperty.call(SUBJECT_PRESENTATION, value);
}

/*
 * Builds the displayable subject list from the server's
 * available subjects, in the server's order, matching on the
 * stable discipline key (never on display names).
 */
export function toFilumireSubjects(
  available?: ReadonlyArray<{ id: string; discipline: string }> | null,
): FilumireSubject[] {
  return (available ?? []).flatMap((subject) =>
    isFilumireSubjectKey(subject.discipline)
      ? [
          {
            key: subject.discipline,
            subjectId: subject.id,
            ...SUBJECT_PRESENTATION[subject.discipline],
          },
        ]
      : [],
  );
}

export function findFilumireSubject(
  subjects: readonly FilumireSubject[],
  subjectId?: string | null,
) {
  return subjects.find(
    (subject) => subject.subjectId === subjectId,
  );
}

export function subjectLabel(name: string, language?: string, short?: boolean): string {
  if (language !== "fr") return name;
  const map: Record<string, string> = { english: "Anglais", mathematics: "Mathématiques", science: "Sciences", computing: "Informatique" };
  if (short && language === "fr" && name.toLowerCase() === "mathematics") return "Maths";
  return map[name.toLowerCase()] ?? name;
}
