# FILUMIRE public website

This checkout is the public website only. It does not depend on FILUMIRE_CORE, the learner app or a database.

## Local validation and inspection

Run from C:\Users\tabi\Desktop\filumire\FILUMIRE_WEBSITE:

```powershell
npm run typecheck
npm test
npm run build
npm start -- --hostname 127.0.0.1 --port 3147
```

Inspect http://127.0.0.1:3147 and http://127.0.0.1:3147/fr. In a second terminal, run `npm run test:links`. No deployment is needed. No dependencies were added for bilingual completion.

## English and French

English retains the existing paths. Every public page has its equivalent under /fr. Both locales render the same templates in src/components/pages. The shared translation catalogue covers retained copy, text fragments and accessibility labels; src/lib/translate.tsx localizes the element tree and internal links. Interactive navigation and drafts use the same catalogue plus localized inquiry categories. The source-coverage tests fail when new retained JSX copy or content data has no French translation.

Language links retain the current path, inquiry query and client-side section anchor. Reloading and internal navigation preserve language through the URL. LanguageState updates the document language on client transitions; middleware sets it on initial requests. Canonical/hreflang metadata and sitemap.xml include both locales. French and English have page-not-found and error recovery.

## Access configuration

Copy .env.example to .env.local only with approved values. Configure each URL AND its matching NEXT_PUBLIC_FILUMIRE_*_PUBLIC_APPROVED=true flag. URL syntax validation is separate from owner approval. Empty, unsafe or unapproved destinations show on-site access guidance. A protected Vercel Preview is not an approved public service. No learner URL or credentials are invented or enabled.

Set NEXT_PUBLIC_FILUMIRE_SITE_URL to the approved public-website origin before any future Preview build; the default is the exact local inspection URL. Public configuration is embedded at build time, so rebuild after changing it.

## Contact configuration and data handling

The owner confirmed three defaults: info@filumire.com for families/general/learner inquiries, schools@filumire.com for teachers and school pilots, and hello@filumire.com for curriculum and partnerships. Optional address overrides still require their matching NEXT_PUBLIC_FILUMIRE_*_EMAIL_VERIFIED=true flag; blank values or false flags retain the confirmed defaults. Website testing does not verify mailbox delivery.

The form validates locally and prepares a draft in memory. It does not submit to a server, use browser storage or send an email. If a verified recipient is absent, visitors can review, edit, copy and download a draft with a recipient-to-confirm notice. Contact FILUMIRE opens the on-site form with the category preselected. Compose in Webmail reveals explicit Gmail, Outlook and Zoho Mail choices in both languages; no provider opens automatically. HTTPS provider links share only the public recipient address, not form contents. Visitors may need to sign in, then copy their reviewed draft into the composer and check the recipient. Copy Email Address includes a manual-selection fallback. Open in Email App is an optional secondary mailto action carrying the prepared draft; the visitor decides whether to send it. Reloading clears page memory; browser history may restore page state. Copy/download deliberately writes through the visitor’s browser or device.

## Manual browser checks

Browser automation was unavailable in this session. At the URLs above, inspect both languages at 390, 768 and 1440 px. Check long French labels, card alignment, whitespace, illustrations, footer landscape and horizontal overflow. Use the menu button, Tab, Shift+Tab and Escape; confirm focus moves into the menu and returns to its button with Escape. Tab from the page start to reveal the skip link and jump to the main content.

From Families and Schools, follow inquiry CTAs, switch language and confirm the category remains selected. Navigate Back/Forward and reload deep links, including /fr/how-it-works#meet-filu, /fr/about#laws and /fr/contact?inquiry=school-pilot. Test empty/invalid fields, a message under 10 characters, accented multiline text, review, edit, copy, clipboard-denied fallback and download. For each of the three contact groups, use Contact FILUMIRE and check the selected category, then open Compose in Webmail. With your own signed-in provider session, check the recipient in Gmail, Outlook and Zoho Mail without sending anything. Sign-in or regional provider redirects can clear recipient prefill; the displayed address and copy action remain available. Check Copy Email Address, deny clipboard access to verify manual selection, and inspect the optional email-app draft. Open /missing and /fr/missing to test recovery.

## Preservation

The parent git repository reports this entire website as untracked. No commit or staging was performed. Original page/layout/component snapshots are retained in .local-backups/bilingual-completion-2026-10-11; the prior functional-completion backup and all existing backup files remain. Artwork, logos, fonts and dependency versions are retained. All edits, generated build files and local reports are inside this website directory. No deployment, mail delivery, database access or modification of separate projects is performed.

## Authorized Production release

The owner-authorized Production build is READY in filumire-website and HTTPS responses at https://filumire.com have been checked. Both languages share that website; /fr is an internal locale route. The www 308 redirect is configured in Vercel but its Cloudflare CNAME remains outstanding. Native email delivery and real browser/mobile QA are incomplete. See PRODUCTION_RELEASE.md for exact evidence, limitations and the required DNS record. Earlier Preview reports remain historical records.
