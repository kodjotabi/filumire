/*
 * Private review: FILUMIRE_ACCESS_MODE=reviewers limits accounts to
 * the owner's list FILUMIRE_REVIEWER_EMAILS ("email:guardian,email:teacher",
 * plus one optional supplemental entry, at most twenty in total). Only listed
 * adults may register or sign in, and learners only when the guardian
 * who created them is listed. Refusals reuse the ordinary errors, so
 * nobody can learn who is on the list. An invalid list admits no one.
 * One email holds one role; a reviewer who needs both roles uses a
 * second address (e.g. name+teacher@…) as a second entry, or the
 * all-roles test period below. An entry with no role (just "email") is
 * a test-period reviewer: admitted, with every role, only while the
 * period runs, and refused everywhere once it ends.
 *
 * Leaf module (environment only, no store or principal imports), so the
 * principal service can check reviewer roles without an import cycle.
 */
export const MAX_REVIEWERS = 20;

export type ReviewerRole = "guardian" | "teacher";

/* "all": listed without a role, for the all-roles test period only. */
export type ReviewerEntry = ReviewerRole | "all";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function reviewerModeActive(): boolean {
  return process.env.FILUMIRE_ACCESS_MODE === "reviewers";
}

/** The parsed list, or undefined when it is invalid (fail closed). */
export function reviewerList(): ReadonlyMap<string, ReviewerEntry> | undefined {
  const baseEntries = (process.env.FILUMIRE_REVIEWER_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  // Keep the original protected list intact; validate the combined list.
  const additionalEntries = (process.env.FILUMIRE_REVIEWER_EMAILS_ADDITIONAL ?? "")
    .split(",").map(entry => entry.trim()).filter(Boolean);
  const entries = [...baseEntries, ...additionalEntries];
  const list = new Map<string, ReviewerEntry>();

  if (baseEntries.length === 0 || additionalEntries.length > 1 || entries.length > MAX_REVIEWERS) {
    return undefined;
  }

  for (const entry of entries) {
    const separator = entry.lastIndexOf(":");
    const role = separator < 0 ? "all" : entry.slice(separator + 1).trim().toLowerCase();

    if (role !== "guardian" && role !== "teacher" && role !== "all") {
      return undefined;
    }

    // Same rule as normaliseEmail(), without its validation error.
    const email = (separator < 0 ? entry : entry.slice(0, separator)).trim().toLowerCase();
    if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return undefined;
    }

    if (list.has(email)) {
      return undefined;
    }

    list.set(email, role);
  }

  return list;
}

export function isListedReviewer(
  email: string,
  role: ReviewerRole,
  now: number = Date.now(),
): boolean {
  const entry = reviewerList()?.get(email);
  return entry === role || (entry === "all" && allRolesPeriodActive(now));
}

/*
 * All-roles test period (owner decision 28 Oct 2026): until
 * FILUMIRE_REVIEWER_ACCESS_UNTIL, a reviewer listed as a guardian also
 * uses the teacher workspace with the same email, for the learners that
 * reviewer created; a reviewer listed without a role is admitted only
 * during the period. The value is a date (YYYY-MM-DD, inclusive, UTC) or
 * an ISO date-time with a time zone. Missing, invalid, past, or outside
 * reviewer mode: the privilege is off (fail closed) and every account
 * keeps only its own role.
 */
export function reviewerAllRolesUntil(): number | undefined {
  const value = (process.env.FILUMIRE_REVIEWER_ACCESS_UNTIL ?? "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const start = Date.parse(`${value}T00:00:00Z`);
    // Reject impossible dates such as 2026-02-31, which Date rolls over.
    return Number.isNaN(start) || new Date(start).toISOString().slice(0, 10) !== value
      ? undefined
      : start + 24 * 60 * 60 * 1000;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(value)) {
    const end = Date.parse(value);
    return Number.isNaN(end) ? undefined : end;
  }

  return undefined;
}

function allRolesPeriodActive(now: number): boolean {
  const until = reviewerAllRolesUntil();
  return reviewerModeActive() && until !== undefined && now < until;
}

export function reviewerHasAllRoles(
  email: string,
  accountKind: string,
  now: number = Date.now(),
): boolean {
  return (
    accountKind === "guardian" &&
    allRolesPeriodActive(now) &&
    isListedReviewer(email, "guardian", now)
  );
}
