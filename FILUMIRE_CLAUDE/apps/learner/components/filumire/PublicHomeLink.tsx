import type { Language } from "./language";

export function PublicHomeLink({ language }: { language: Language }) {
  const configured = process.env.NEXT_PUBLIC_FILUMIRE_PUBLIC_SITE_URL ?? "https://filumire.com";
  let origin = "https://filumire.com";
  try {
    const url = new URL(configured);
    if (!url.username && !url.password && (url.protocol === "https:" ||
      (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) origin = url.origin;
  } catch { /* Use the existing public website. */ }
  return <a className="filumirePublicHome" href={`${origin}${language === "fr" ? "/fr" : "/"}`}
    aria-label={language === "fr" ? "Site FILUMIRE" : "FILUMIRE website"}>
    <img src="/filumire-f.svg" alt="" width="28" height="28" />
  </a>;
}
