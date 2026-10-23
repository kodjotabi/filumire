import manifest from './jhs-private-manifest.json';

/** Server-only opt-in for the Basic 7-9 private presentation (owner decision 23 Oct 2026):
 * - local rehearsal (no Vercel variables);
 * - a Vercel Preview, which stays behind Vercel Authentication;
 * - Vercel Production only in private reviewer mode (FILUMIRE_ACCESS_MODE=reviewers).
 * Any other Vercel environment, or Vercel without a known environment, stays off.
 * scripts/deploy-guard.mjs refuses the same combinations at build time. */
export function isPrivateJhsEnabled(): boolean {
  if (process.env.FILUMIRE_JHS_MODE !== 'private-presentation') return false;
  if (!process.env.VERCEL && !process.env.VERCEL_ENV) return true;
  if (process.env.VERCEL_ENV === 'preview') return true;
  return process.env.VERCEL_ENV === 'production' && process.env.FILUMIRE_ACCESS_MODE === 'reviewers';
}
export const PRIVATE_JHS_SCOPE = manifest;
export function privateJhsGrade(id: string): boolean {
  return isPrivateJhsEnabled() && manifest.some(row => row.gradeId === id);
}
export function privateJhsSubject(id: string): boolean {
  return isPrivateJhsEnabled() && manifest.some(row => row.subjectId === id);
}
