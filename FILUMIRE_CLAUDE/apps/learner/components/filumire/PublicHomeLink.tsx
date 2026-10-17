import type { Language } from "./language";

/*
 * Way back to the public FILUMIRE website, in the visitor's language.
 * The origin comes from NEXT_PUBLIC_FILUMIRE_PUBLIC_SITE_URL; the app's
 * own progress is saved by the server, so leaving loses no answers.
 */
export function PublicHomeLink({ language, className }: { language: Language; className?: string }) {
  const configured = process.env.NEXT_PUBLIC_FILUMIRE_PUBLIC_SITE_URL ?? "https://filumire.com";
  let origin = "https://filumire.com";
  try {
    const url = new URL(configured);
    if (!url.username && !url.password && (url.protocol === "https:" ||
      (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) origin = url.origin;
  } catch { /* Use the existing public website. */ }
  return <a className={`filumirePublicHome${className ? ` ${className}` : ""}`} href={`${origin}${language === "fr" ? "/fr" : "/"}`}
    aria-label={language === "fr" ? "Retour au site web FILUMIRE" : "Back to the FILUMIRE website"}>
    <img src="/filumire-f.svg" alt="" width="24" height="24" />
    <span aria-hidden="true">{language === "fr" ? "Site web" : "Website"}</span>
  </a>;
}
