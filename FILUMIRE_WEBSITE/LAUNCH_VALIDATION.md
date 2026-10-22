# FILUMIRE public website — correction and launch validation

Date: 11 October 2026. Scope: C:\Users\tabi\Desktop\filumire\FILUMIRE_WEBSITE only. No deployment was performed.

## A. Implemented corrections and affected files

- All ten public pages now have English and French routes, using the same retained page templates. Shared translation covers headings, paragraphs, cards, CTAs, navigation, footer, accessibility labels, forms, categories, validation and draft actions. Header and footer language switching use a shared location hook to retain the current page, inquiry query and section anchor. Language is retained in route URLs through navigation and reload.
- Document language, page titles/descriptions, canonical/hreflang, sitemap and robots are locale-aware. Both languages have shared not-found recovery and translated error/retry handling. Explicit route adapters avoid the catch-all streaming failure observed during validation.
- Literal checklist entities were replaced with decorative accessible check symbols. Section spacing and footer landscape height were reduced, preserving the artwork. Button wrapping, mobile inputs/touch targets, responsive grids and long French labels received CSS corrections. Menu opening focuses the first link; Escape restores focus to its button. The skip link remains out of normal layout and appears on keyboard focus. Source foreground contrast checks were corrected for green/amber emphasis.
- Public copy uses plainer explanations of mistakes, learning rules, FILU and educational responsibilities. The ten educational commitments remain available. Curriculum distinguishes planned educational scope from a verified lesson inventory. FILU copy explicitly avoids claiming unrestricted generative AI integration. Privacy and safety statements stay within public-site evidence and design intent.
- Each portal requires a safe URL and explicit owner approval flag. No protected Preview is inserted automatically. Unapproved roles lead to meaningful access guidance and the appropriate inquiry category.
- The owner subsequently confirmed info@filumire.com, schools@filumire.com and hello@filumire.com. These are now the defaults for general/family, school/teacher and curriculum/partner inquiries respectively. Verified environment overrides remain available. Drafts validate category, required name/email, email format, optional field limits and a trimmed message of 10–3,000 characters. Errors identify and focus the affected field. Draft review/edit/copy/download remain available without a recipient; An optional secondary email-app action uses the configured recipient. No server submission, website storage, backend mail service or test email was introduced.

Affected website files:

- English and French route adapters: src/app/page.tsx and src/app/{how-it-works,curriculum,for-families,for-schools,about,contact,access,partners,privacy}/page.tsx, plus the equivalent src/app/fr routes.
- Shared page templates: src/components/pages/{home,how-it-works,curriculum,for-families,for-schools,about,contact,access,partners,privacy}.tsx.
- Shared UI: src/components/layout/Navbar.tsx, Footer.tsx, src/components/AccessLink.tsx, ContactInquiry.tsx, LanguageState.tsx and Recovery.tsx.
- Routing/content/configuration: src/lib/locale.ts, useLocaleNavigation.ts, translate.tsx, translations.ts, pages.tsx, content.ts, constants.ts, destinations.ts and inquiries.ts; src/middleware.ts.
- Layout and recovery: src/app/layout.tsx, globals.css, not-found.tsx, error.tsx, fr/layout.tsx and fr/not-found.tsx. Discovery: src/app/sitemap.ts and robots.ts.
- Validation and handoff: scripts/check-links.mjs, tests/bilingual.test.mjs, tests/webmail.test.mjs, .env.example, README.md and this report. Existing inquiry tests remain and pass.

No image, illustration, logo, font, package version or learner source was edited. Existing backup files remain. Available original source snapshots are in .local-backups/bilingual-completion-2026-10-11, alongside the retained previous functional-completion backup. The entire website was already untracked in the parent git repository; no staging or commit was performed. An outside-project git-status comparison during work was unchanged across 632 pre-existing entries; all subsequent writes also remained inside this website.

## B. English/French coverage and switching

| Page | English | French |
|---|---|---|
| Home | / | /fr |
| How It Works / FILU / learning sequence | /how-it-works | /fr/how-it-works |
| Curriculum | /curriculum | /fr/curriculum |
| Families | /for-families | /fr/for-families |
| Schools / teachers / pilots | /for-schools | /fr/for-schools |
| About / principles | /about | /fr/about |
| Contact | /contact | /fr/contact |
| Access | /access | /fr/access |
| Partners | /partners | /fr/partners |
| Privacy | /privacy | /fr/privacy |

PASS: all 20 adapters use the same templates and corresponding metadata. Source catalogue coverage tests include retained JSX copy, accessibility labels and shared content data. A rendered-copy comparison found no unexpected English text on French pages; shared proper names, curriculum identifiers and words valid in both languages remain.

PASS: pure routing tests switch every page both ways while preserving inquiry query and section hash. HTTP checks confirm category-preserving language links in server-rendered Contact pages and no English internal-link leakage on French pages. All seven inquiry categories are tested in both locales.

UNVERIFIED: actual browser language clicks, client document-language updates, reload journeys and browser Back/Forward. These behaviors are implemented; no browser pass is claimed.

## C. Final validation results

| Check | Status | Evidence / limit |
|---|---|---|
| Standalone TypeScript | PASS | tsc --noEmit --incremental false, exit 0 |
| Production build | PASS | Next.js 15.5.27, final explicit routes, exit 0 |
| Existing + new regression tests | PASS | 17 passed, 0 failed |
| Pages and inquiry deep links | PASS | 35 HTTP page responses, including 20 locale pages and contact query variants |
| Header/footer/page links and section targets | PASS | 69 unique links: 57 internal, 3 mailto, 9 explicit webmail links; every internal hash has a rendered target |
| Local images | PASS | 18 unique image resources return 200 and image content types |
| Generated assets | PASS | 31 unique JS/CSS/font assets checked; CSS-referenced bundled fonts also fetched successfully |
| Metadata and discovery | PASS | lang, title, canonical and actual English/French alternate links checked; sitemap contains all 20 locale routes |
| Category preselection | PASS | 14 valid locale/category combinations; unknown category falls back to general |
| Draft validation and generation | PASS | field errors, message limits, category validation, Unicode/multiline text and encoded mailto payloads tested |
| Safe destination handling | PASS | unapproved URLs fall back; unsafe URLs rejected; empty mailbox produces a draft without mailto |
| Not-found recovery | PASS | English and French return localized HTML with HTTP 404; French dotted unknown path also verified |
| Named foreground contrast pairs | PASS | source calculations: body 12.05:1, muted text 8.52:1, primary button 6.66:1, green on white 5.52:1, green badge 4.83:1, amber label 5.97:1, announcement link 7.43:1 |
| Responsive layout at 390/768/1440 px | UNVERIFIED | breakpoints and wrapping corrected in source; no rendered browser measurements or screenshots |
| Menu/skip-link/focus/keyboard journeys | UNVERIFIED | implementation and semantic HTML reviewed; no browser interaction run |
| Review/edit/copy/download/email-app UI actions | UNVERIFIED | draft logic tested and handlers reviewed; OS/browser behavior not exercised |
| Screen-reader/complete computed contrast audit | UNVERIFIED | labels, error associations, language and headings inspected statically; assistive technology not run |
| Mailbox delivery and portal sign-in | UNVERIFIED | addresses confirmed by owner; delivery and portal sign-in not exercised; no test messages |
| Scope/deployment protection | PASS | no source writes outside website, database calls, external messages or deployment mutations |

The final production build was started locally at http://127.0.0.1:3147 and tested over HTTP. The owned test server is stopped during handoff. Validation logs are retained in .local-backups/launch-validation; use build-static-routes.log, tests-final.log, typecheck-final.log and http-final.log for the final results. Earlier failed checks in other logs were corrected before this report.

## D. External dependencies and owner decisions

1. Provide an approved, publicly usable learner sign-in URL, parent portal URL and teacher portal URL, or explicitly retain inquiry-based access. Set each matching approval flag only after public usability is verified. No credentials are requested or invented.
2. Read-only Vercel metadata confirmed the separate filumire-learner project: latest READY Preview https://filumire-learner-ijse07pc2-tabicrentsil-6879s-projects.vercel.app, branch filumire-interface-testing, commit a59b9fdf12380bc261f364fbafe1b03d41a02741. Project metadata reports live=false and SSO protection enabled for all_except_custom_domains. This is not verified public Production access and was not connected to website buttons. No learner project setting or deployment was changed.
3. Address approval is resolved by the owner’s additional requirement: info@filumire.com, schools@filumire.com and hello@filumire.com are active defaults. No test email was sent. Mail delivery and a signed-in composer retaining its recipient still require an owner/browser check; do not infer delivery from opening a draft.
4. Set NEXT_PUBLIC_FILUMIRE_SITE_URL to the approved public-website Preview origin before a future build. The current metadata/sitemap origin is the exact local test URL. Use only the separate filumire-website Vercel project and this website directory when a future Preview is explicitly authorized. No deployment is part of this task.
5. Complete the manual browser checklist below. The Browser connection returned “No browser is available”; no connector troubleshooting or substitute browser automation was undertaken.
6. Decide how the currently untracked website should be versioned and reviewed before a future controlled Preview. No parent-repository changes were staged.

## E. Exact local visual inspection

From C:\Users\tabi\Desktop\filumire\FILUMIRE_WEBSITE, run:

~~~powershell
npm start -- --hostname 127.0.0.1 --port 3147
~~~

English: http://127.0.0.1:3147
French: http://127.0.0.1:3147/fr

Short manual browser plan:

1. At 390, 768 and 1440 px, inspect all ten pages in both languages for long French labels, card alignment, balanced whitespace, landscape height, readable text and horizontal overflow.
2. Open the mobile menu, Tab through it, use Escape, and confirm focus returns to its button. Confirm hidden links are not focusable. Tab from the page start to reveal the skip link and activate it.
3. Switch language from header AND footer on /how-it-works#meet-filu, /about#laws and /contact?inquiry=school-pilot. Confirm the equivalent page, section and category; use Back/Forward and reload the French deep link.
4. Follow Families, Schools, Curriculum, Access and Partners inquiry links. Test required fields, invalid email, whitespace-only name/message, 9-character and valid 10-character messages, accented multiline text, draft review, edit, copy and download. Deny clipboard access to confirm manual-copy fallback.
5. For each contact group in both languages, activate Contact FILUMIRE and confirm the category. Expand Compose in Webmail and choose Gmail, Outlook and Zoho Mail in turn. With your own signed-in session, verify the intended recipient; do not send a test message. Check Copy Email Address including clipboard-denied selection fallback. Review a draft, copy its text into the webmail composer, and inspect the optional email-app draft. Confirm external portal links only appear when their role is approved and state that they open a new tab.
6. Visit /missing and /fr/missing; verify useful localized recovery. Confirm the privacy notice warns against sharing children’s records or passwords and never suggests that a draft was submitted.

## F. Unresolved defects and launch limits

No confirmed implementation defect remains in the completed automated/static/HTTP checks.

- HIGH, external launch dependency: public role-specific access URLs are not approved. Safe guidance fallbacks are active; unavailable portals are not advertised as live. The three contact addresses are now owner-confirmed.
- MEDIUM, verification gap: real responsive rendering, keyboard/focus behavior, browser history and clipboard/download/email-app interactions and authenticated provider prefill remain unverified. Complete manual QA before declaring launch validation complete.
- MEDIUM, release preparation: approve the future website origin and a version-control/review path for this currently untracked checkout before controlled Preview deployment.

This handoff does not certify learner functionality, offline operation, unrestricted AI, lesson completeness, mailbox delivery or educational outcomes. The public copy asks visitors to confirm those platform details.

## Direct webmail enhancement — final validation amendment

Additional implementation: src/components/EmailContactActions.tsx, src/lib/webmail.ts; changes to ContactInquiry.tsx, contact/privacy shared templates, constants.ts, translations.ts, globals.css, .env.example, tests/bilingual.test.mjs, tests/webmail.test.mjs, scripts/check-links.mjs and README.md. Source snapshots and validation logs are in .local-backups/webmail-enhancement-2026-10-11.

- PASS: Contact FILUMIRE is an internal category-preserving form link. No primary contact action invokes mailto or chooses an external provider automatically.
- PASS: Gmail, Outlook and Zoho Mail are explicit HTTPS links inside an accessible native disclosure. They open a new tab with noopener/noreferrer and no referrer. All three confirmed recipients round-trip through each provider parameter; checks cover every inquiry category in both languages. No name, email, subject or message from the form is placed in a webmail URL. Visitors copy the reviewed draft themselves.
- PASS: Copy Email Address has an announced result and focuses/selects the visible address when clipboard access fails. The optional Open in Email App link remains conventional mailto. Draft review/edit/copy/download and field validation are preserved. Sign-in and no-email-sent explanations are translated.
- PASS: final TypeScript, production build, 17 regression tests and the exact production site's HTTP checks. HTTP results: 35 page variants, 69 links, 14 locale/category selections, 18 images, 31 generated assets, localized 404 recovery. These checks inspect rendered HTML and URL payloads, not interactive browser behavior.
- UNVERIFIED: live provider responses and recipient fields after sign-in. Node HTTPS requests failed in this restricted environment; attempts to open all three composer URLs through the web research tool were inaccessible. No provider account was accessed and no message was sent. Browser automation was unavailable, so 390/768/1440 px rendering, native disclosure keyboard behavior, clipboard fallback and OS email handling need the manual checks above.

Format evidence: [Google's documented Gmail handler](https://developer.chrome.com/blog/getting-gmail-to-handle-all-mailto-links-with-registerprotocolhandler/) and [Firefox's shipped handler](https://searchfox.org/mozilla-central/source/uriloader/exthandler/HandlerList.sys.mjs) use extsrc=mailto and encoded url. [Mozilla's Outlook handler issue](https://bugzilla.mozilla.org/show_bug.cgi?id=1923610) records Outlook's mailtouri compose handler. [Zoho's official help](https://www.zoho.com/mail/help/defaultcomposer.html) confirms webmail handler recipient population; the exact /zm/comp.do?ct= handler is evidenced by a firsthand URL in [Zoho's mailto support discussions](https://help.zoho.com/portal/de/community/tag/mailto). Zoho's current public help does not publish the exact endpoint, so current endpoint compatibility is specifically UNVERIFIED, rather than claimed as a provider-certified API. Keep address copy and email-app alternatives available if a provider changes its handler or clears prefill during login.

Confirmed outside-project git status remained unchanged for this enhancement. No source outside the website, application, database, deployment, package version or account was changed.
