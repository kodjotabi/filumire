import type { Language } from "./language";

/*
 * The public FILUMIRE website origin. It comes from
 * NEXT_PUBLIC_FILUMIRE_PUBLIC_SITE_URL so a Preview links to its paired
 * website Preview; anything unsafe falls back to https://filumire.com.
 */
export function publicSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_FILUMIRE_PUBLIC_SITE_URL ?? "https://filumire.com";
  try {
    const url = new URL(configured);
    if (!url.username && !url.password && (url.protocol === "https:" ||
      (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) return url.origin;
  } catch { /* Use the existing public website. */ }
  return "https://filumire.com";
}

/*
 * A page of the public website in the visitor's language. Website links
 * open in the same tab: the sign-in session lives on the learner origin
 * and is still there when the visitor comes back.
 */
export function publicSiteHref(path: string, language: Language): string {
  const page = path === "/" ? "" : path;
  return `${publicSiteOrigin()}${language === "fr" ? `/fr${page}` : page || "/"}`;
}

/*
 * Way back to the public FILUMIRE website, in the visitor's language.
 * The app's own progress is saved by the server, so leaving loses no answers.
 */
export function PublicHomeLink({ language, className }: { language: Language; className?: string }) {
  return <a className={`filumirePublicHome${className ? ` ${className}` : ""}`} href={publicSiteHref("/", language)}
    aria-label={language === "fr" ? "Retour au site web FILUMIRE" : "Back to the FILUMIRE website"}>
    <img src="/filumire-f.svg" alt="" width="24" height="24" />
    <span aria-hidden="true">{language === "fr" ? "Site web" : "Website"}</span>
  </a>;
}
