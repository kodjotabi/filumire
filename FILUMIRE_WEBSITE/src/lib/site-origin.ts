/** Preview metadata follows its own deployment; local inspection keeps its local origin. */
export function siteOrigin(env: Record<string, string | undefined> = process.env): string {
  if (env.VERCEL_ENV === "preview" && env.VERCEL_URL) return "https://" + env.VERCEL_URL;
  return env.NEXT_PUBLIC_FILUMIRE_SITE_URL || (env.VERCEL_URL ? "https://" + env.VERCEL_URL : "http://127.0.0.1:3147");
}
