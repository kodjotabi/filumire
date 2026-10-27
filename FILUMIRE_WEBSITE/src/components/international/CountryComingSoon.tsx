import Link from "next/link";
import { localizeHref, type Locale } from "@/lib/locale";
import { COUNTRIES, INTERNATIONAL_COPY, type CountryId } from "@/lib/international";
import { FILUMIRE_CONFIG } from "@/lib/constants";
import { InternationalFrame } from "./InternationalShell";

/** Clear placeholder destination until a country-specific experience exists; no curriculum or learning routes. */
export function CountryComingSoon({ country: id, locale }: { country: CountryId; locale: Locale }) {
  const copy = INTERNATIONAL_COPY[locale];
  const country = COUNTRIES.find(entry => entry.id === id)!;
  const name = country.name[locale];
  return (
    <InternationalFrame locale={locale} className="intl-soon-page">
      <section className="intl-soon" aria-labelledby="intl-soon-title">
        <p className="intl-soon-eyebrow">{copy.soonEyebrow}</p>
        <h1 id="intl-soon-title" className="intl-soon-title">FILUMIRE {name}</h1>
        <p className="intl-soon-body">{copy.soonBody(name)}</p>
        <div className="intl-soon-actions">
          <Link href={localizeHref("/", locale)} className="intl-soon-primary">{copy.soonBack}</Link>
          <a href={"mailto:" + FILUMIRE_CONFIG.meta.inquiriesEmail} className="intl-soon-secondary">{copy.soonContact}</a>
        </div>
      </section>
    </InternationalFrame>
  );
}
