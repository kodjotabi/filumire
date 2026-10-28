/* Confirmed FILUMIRE mailboxes (the contact form routes every enquiry to info server-side). */
export const FILUMIRE_CONFIG = {
 siteName: "FILUMIRE", defaultLocale: "en" as const, supportedLocales: ["en", "fr"] as const,
 meta: {
 inquiriesEmail: "info@filumire.com",
 partnershipsEmail: "hello@filumire.com",
 schoolsEmail: "schools@filumire.com",
 },
};
export type { Locale } from "./locale";
