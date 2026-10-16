import { LEARNER_GRADES } from "./grades";

/*
 * The class field of the learner's first-time setup.
 *
 * - loading: the learner's stored class has not arrived yet, so
 *   nothing editable is shown (a class the guardian chose must not
 *   flash up as a dropdown first).
 * - locked: the guardian chose the class; it is shown, not edited.
 *   The server refuses a different class from the learner as well.
 * - choose: the learner picks a class.
 * - readonly: the local test learner (no account); shown only.
 */
export type SetupClassMode = "loading" | "locked" | "choose" | "readonly";

type Language = "en" | "fr";

export const SETUP_CLASS_TEXT = {
  en: {
    level: "Your class",
    levelHelp: "Your class is set by your school. FILUMIRE uses it to choose learning that is right for you.",
    levelUnknown: "Set by your school",
    levelChoose: "Choose your class. FILUMIRE uses it to choose learning that is right for you.",
    levelGuardian: "Your parent or guardian chose your class. FILUMIRE uses it to choose learning that is right for you.",
    levelLoading: "Loading your class…",
    levelPlaceholder: "Choose your class",
  },
  fr: {
    level: "Ta classe",
    levelHelp: "Ta classe est définie par ton école. FILUMIRE s’en sert pour choisir ce qui te convient.",
    levelUnknown: "Définie par ton école",
    levelChoose: "Choisis ta classe. FILUMIRE s’en sert pour choisir ce qui te convient.",
    levelGuardian: "Ton parent ou tuteur a choisi ta classe. FILUMIRE s’en sert pour choisir ce qui te convient.",
    levelLoading: "Chargement de ta classe…",
    levelPlaceholder: "Choisis ta classe",
  },
} as const;

type ClassOverview = {
  gradeId: string;
  gradeSetByGuardian?: boolean;
  availableSubjects: ReadonlyArray<{ id: string; discipline: string }>;
  gradeSubjects?: Record<string, ReadonlyArray<{ id: string; discipline: string }>>;
} | null | undefined;

/*
 * Which class field to show. `accountPending` is true while the
 * signed-in account is still being read, `overviewPending` while
 * the learner's overview is on its way; when the overview failed
 * instead, the learner may choose (the server still enforces a
 * guardian's class).
 */
export function setupClassMode(input: {
  accountPending: boolean;
  signedIn: boolean;
  overviewPending: boolean;
  overview: ClassOverview;
}): SetupClassMode {
  if (input.accountPending) return "loading";
  if (!input.signedIn) return "readonly";
  if (input.overviewPending) return "loading";
  if (input.overview?.gradeSetByGuardian) return "locked";
  return "choose";
}

/*
 * The class setup will save. A guardian's class always wins; a
 * learner who finished onboarding before keeps their class until
 * they pick another; a new learner without a class must pick.
 */
export function setupGradeValue(input: {
  mode: SetupClassMode;
  picked: string;
  overview: ClassOverview;
  onboardingComplete: boolean;
}): string {
  const stored = input.overview?.gradeId ?? "";
  if (input.mode === "loading") return "";
  if (input.mode === "locked") return stored;
  if (input.picked) return input.picked;
  return input.onboardingComplete ? stored : "";
}

/*
 * The subjects setup shows: those of the class being chosen when
 * it differs from the stored one, otherwise the stored class's.
 */
export function setupSubjectsFor(
  overview: ClassOverview,
  gradeId: string,
): ReadonlyArray<{ id: string; discipline: string }> {
  if (!overview) return [];
  if (gradeId && gradeId !== overview.gradeId && overview.gradeSubjects?.[gradeId]) {
    return overview.gradeSubjects[gradeId];
  }
  return overview.availableSubjects;
}

export function SetupClassField({
  mode,
  language,
  value,
  gradeName,
  onChange,
}: {
  mode: SetupClassMode;
  language: Language;
  value: string;
  gradeName?: string;
  onChange: (gradeId: string) => void;
}) {
  const text = SETUP_CLASS_TEXT[language];

  if (mode === "choose") {
    return (
      <>
        <label className="setupFieldLabel" htmlFor="setupLevel">
          {text.level}
        </label>
        <select
          id="setupLevel"
          className="setupInput"
          value={value}
          required
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="" disabled>
            {text.levelPlaceholder}
          </option>
          {LEARNER_GRADES.map((grade) => (
            <option key={grade.id} value={grade.id}>
              {grade.name[language]}
            </option>
          ))}
        </select>
        <p className="setupFieldHelp">
          {text.levelChoose}
        </p>
      </>
    );
  }

  const shown =
    mode === "loading"
      ? text.levelLoading
      : mode === "locked"
        ? LEARNER_GRADES.find((grade) => grade.id === value)?.name[language] ?? gradeName ?? ""
        : gradeName || text.levelUnknown;

  return (
    <>
      <span className="setupFieldLabel" id="setupLevelLabel">
        {text.level}
      </span>
      <output
        className="setupInput setupReadonly"
        aria-labelledby="setupLevelLabel"
        aria-busy={mode === "loading" || undefined}
        data-class-mode={mode}
      >
        {shown}
      </output>
      {mode !== "loading" && (
        <p className="setupFieldHelp">
          {mode === "locked" ? text.levelGuardian : text.levelHelp}
        </p>
      )}
    </>
  );
}
