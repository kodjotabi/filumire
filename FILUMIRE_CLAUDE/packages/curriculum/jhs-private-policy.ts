import manifest from './jhs-private-manifest.json';

/** Server-only opt-in for the local private rehearsal. Never available on any Vercel
 * deployment (Production or Preview); scripts/deploy-guard.mjs also refuses such builds. */
export function isPrivateJhsEnabled(): boolean {
  return process.env.FILUMIRE_JHS_MODE === 'private-presentation'
    && !process.env.VERCEL
    && !process.env.VERCEL_ENV;
}
export const PRIVATE_JHS_SCOPE = manifest;
export function privateJhsGrade(id: string): boolean {
  return isPrivateJhsEnabled() && manifest.some(row => row.gradeId === id);
}
export function privateJhsSubject(id: string): boolean {
  return isPrivateJhsEnabled() && manifest.some(row => row.subjectId === id);
}
