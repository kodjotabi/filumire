export type Locale = "en" | "fr";
export const PAGE_ROUTES = ["/", "/ghana", "/cote-divoire", "/nigeria", "/how-it-works", "/curriculum", "/for-families", "/for-schools", "/about", "/contact", "/access", "/partners", "/privacy", "/pricing"] as const;
export function localeOf(path: string): Locale { return /^\/fr(?:\/|[?#]|$)/.test(path) ? "fr" : "en"; }
export function localizeHref(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const match = href.match(/^([^?#]*)(.*)$/)!;
  const path = match[1].replace(/^\/fr(?=\/|$)/, "") || "/";
  return (locale === "fr" ? "/fr" + (path === "/" ? "" : path) : path) + match[2];
}
