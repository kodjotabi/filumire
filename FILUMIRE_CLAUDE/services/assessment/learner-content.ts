/*
 * Tranche 4E: what a learner's device may receive for a piece of
 * content.
 *
 * 1. Answer keys and diagnostic metadata never leave the server.
 * 2. Multiple-choice options are shuffled. Authored content lists the
 *    correct answer first in about 99% of questions; shown in that
 *    order, a learner who always picks the first option would pass
 *    nearly everything and mastery would be manufactured.
 *
 * The order is stable for one learner and one item (a reload shows
 * the same order) and differs between learners and items. Answers
 * are evaluated by their text, so the order never affects marking.
 */

const SERVER_ONLY_METADATA = [
  "expectedResponse",
  "diagnosticRules",
  "rubricCriteria",
  "rubricAnswerGuide",
  "misconceptionPatterns",
] as const;

/* FNV-1a: a small, stable string hash. */
function hash(text: string): number {
  let value = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }

  return value >>> 0;
}

/* mulberry32: a small seeded generator, enough for ordering options. */
function seededRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function orderOptionsForLearner(
  options: string[],
  learnerId: string,
  itemKey: string,
): string[] {
  const random = seededRandom(hash(`${learnerId}|${itemKey}`));
  const ordered = [...options];

  for (let index = ordered.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [ordered[index], ordered[swap]] = [ordered[swap], ordered[index]];
  }

  return ordered;
}

export function prepareLearnerContent<
  T extends {
    id?: string;
    assessmentItemId?: string;
    metadata?: Record<string, string>;
  } | undefined,
>(content: T, learnerId: string): T {
  if (!content?.metadata) {
    return content;
  }

  const metadata: Record<string, string> = { ...content.metadata };

  for (const key of SERVER_ONLY_METADATA) {
    delete metadata[key];
  }

  if (metadata.options) {
    try {
      const options = JSON.parse(metadata.options) as unknown;

      if (
        Array.isArray(options) &&
        options.every((option) => typeof option === "string")
      ) {
        metadata.options = JSON.stringify(
          orderOptionsForLearner(
            options,
            learnerId,
            content.assessmentItemId ?? content.id ?? "",
          ),
        );
      }
    } catch {
      /* Malformed options are passed through untouched. */
    }
  }

  return { ...content, metadata } as T;
}
