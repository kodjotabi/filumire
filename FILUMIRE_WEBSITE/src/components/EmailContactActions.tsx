"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { localizeHref, type Locale } from "@/lib/locale";
import { text } from "@/lib/translate";
import type { InquiryCategory } from "@/lib/inquiries";
import { WEBMAIL_PROVIDERS, webmailComposeUrl } from "@/lib/webmail";

export function EmailContactActions({ recipient, initialCategory, locale = "en", mailto }: { recipient: string; initialCategory?: InquiryCategory; locale?: Locale; mailto?: string | null }) {
  const [status, setStatus] = useState("");
  const addressRef = useRef<HTMLInputElement>(null);
  const t = (value: string) => text(value, locale);
  async function copyAddress() {
    try { await navigator.clipboard.writeText(recipient); setStatus(t("Email address copied. No email has been sent.")); }
    catch { addressRef.current?.focus(); addressRef.current?.select(); setStatus(t("Copy is unavailable. The address is selected so you can copy it manually.")); }
  }
  return <div className="email-contact-actions">
    {initialCategory && <Link className="btn btn-primary" href={localizeHref("/contact?inquiry=" + initialCategory + "#inquiry-form",locale)}>{t("Contact FILUMIRE")}</Link>}
    {recipient ? <>
      <label className="sr-only" htmlFor={"contact-address-" + (initialCategory || "draft")}>{t("Email recipient")}</label>
      <input ref={addressRef} id={"contact-address-" + (initialCategory || "draft")} className="contact-address" value={recipient} readOnly autoComplete="off" />
      <details className="webmail-options"><summary className="btn btn-outline">{t("Compose in Webmail")}</summary>
        <p className="form-note">{t("Choose your provider. It opens in a new tab with the recipient prefilled where supported. You may need to sign in. Opening a composer does not send an email.")}</p>
        <div className="action-row">{WEBMAIL_PROVIDERS.map(provider => <a key={provider} className="btn btn-outline" href={webmailComposeUrl(provider,recipient)} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={provider + " — " + t("opens in a new tab")}>{provider}</a>)}</div>
        <p className="form-note">{t("Write your message in the composer and check the recipient before sending. If sign-in clears the recipient, paste the address shown above.")}</p>
      </details>
      <div className="action-row"><button type="button" className="btn btn-outline" onClick={copyAddress}>{t("Copy Email Address")}</button><a className="text-link email-app-link" href={mailto || "mailto:" + recipient}>{t("Open in Email App")}</a></div>
      <p className="form-status" role="status">{status}</p>
    </> : <p className="form-note">{t("Recipient awaiting verification")}</p>}
  </div>;
}
