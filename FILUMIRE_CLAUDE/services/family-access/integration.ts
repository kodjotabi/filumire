/** Same-origin return journeys only. Not a cross-domain session handoff. */
const RETURN_PATHS = new Set(["/family", "/adult", "/teacher", "/dashboard", "/learn", "/login", "/register"]);
export function safeAccountReturnPath(value: unknown, language: "en" | "fr" = "en"): string {
  const fallback = `/family?lang=${language}`;
  if (typeof value !== "string" || value.length > 512 || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) return fallback;
  try {
    const parsed = new URL(value, "https://filumire.invalid");
    if (parsed.origin !== "https://filumire.invalid" || !RETURN_PATHS.has(parsed.pathname) || parsed.hash) return fallback;
    // Do not propagate arbitrary tokens, identity flags or nested redirect parameters.
    const lang = parsed.searchParams.get("lang");
    return `${parsed.pathname}?lang=${lang === "fr" || lang === "en" ? lang : language}`;
  } catch { return fallback; }
}
