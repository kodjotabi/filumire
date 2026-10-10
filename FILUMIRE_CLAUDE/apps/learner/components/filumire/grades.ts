/*
 * The classes a learner can be placed in, for the account and
 * setup forms. Mirrors the supported grades of the Ghana pilot
 * curriculum version (packages/curriculum-framework); the server
 * validates every choice, so a stale entry here is rejected rather
 * than stored. Kept local because the framework module pulls the
 * whole curriculum into the browser bundle.
 */
export const LEARNER_GRADES = [
  { id: "level-gh-basic-4-pilot", name: { en: "Basic 4", fr: "Basic 4" } },
  { id: "level-gh-basic-5-pilot", name: { en: "Basic 5", fr: "Basic 5" } },
  { id: "level-gh-basic-6-pilot", name: { en: "Basic 6", fr: "Basic 6" } },
] as const;
