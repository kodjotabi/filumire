/** Explicit webmail choices. Only the public recipient is shared in the URL. */
export const WEBMAIL_PROVIDERS = ["Gmail", "Outlook", "Zoho Mail"] as const;
export type WebmailProvider = typeof WEBMAIL_PROVIDERS[number];
export function webmailComposeUrl(provider: WebmailProvider, recipient: string): string {
  if (!/^[^\s@<>?&#]+@[^\s@<>?&#]+\.[^\s@<>?&#]+$/.test(recipient)) throw new Error("Invalid email recipient");
  const mailto = encodeURIComponent("mailto:" + recipient);
  switch (provider) {
    // Google's documented protocol handler, also shipped by Firefox.
    case "Gmail": return "https://mail.google.com/mail/?extsrc=mailto&url=" + mailto;
    // Outlook.com's registered webmail protocol handler.
    case "Outlook": return "https://outlook.live.com/mail/0/deeplink/compose?mailtouri=" + mailto;
    // Zoho Mail's compose handler accepts an encoded mailto in ct.
    case "Zoho Mail": return "https://mail.zoho.com/zm/comp.do?ct=" + mailto;
    default: throw new Error("Unsupported webmail provider");
  }
}
