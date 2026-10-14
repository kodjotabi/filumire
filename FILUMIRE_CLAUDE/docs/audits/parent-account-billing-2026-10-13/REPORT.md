# FILUMIRE Parent Account and Billing correction

Protected Preview: https://filumire-website-8v3thtzhy-tabicrentsil-6879s-projects.vercel.app/account

Deployment: `dpl_6gSmXivMdVxxJT8fVwjbeTM6dAnN`, READY, Preview, existing `filumire-website` project. Vercel Authentication remains enabled (`all_except_custom_domains`). Anonymous access returns 302 to Vercel sign-in. Production remains `dpl_Dmho6o9p1iktU6iZjf8z7pDcbS3B`; domain assignments are unchanged.

## Corrections

- Reproduced a genuinely disabled button in English and French at 320, 768 and 1280 pixels. Initial billing-service unavailability incorrectly prevented submitting a parent sign-in request. Button availability now follows email validity, guardian confirmation and loading state; an unavailable server returns its existing localized configuration error.
- Added distinct enabled and disabled styling, loading button text and accessible busy state. Requests trim surrounding email whitespace and report success only when the server explicitly returns `sent: true`. Existing success copy describes SMTP acceptance, not confirmed inbox delivery.
- Corrected same-tab email-link handling: changes to the URL fragment now show the confirmation interface and remove the token from the address bar. Server-side authentication protections are unchanged.
- Reduced account-page top spacing to 24 pixels and placed the heading before the development notice. Hardened the skip link's offscreen positioning while retaining keyboard visibility and focus transfer to main content. An unfocused skip-link overlap did not reproduce in the current source; focused and unfocused behaviour was verified after the correction.

Runtime changes are limited to `src/components/subscriptions/ParentAccount.tsx`, its existing `subscriptions.module.css`, and the shared skip-link rules in `src/app/globals.css` in `C:/Users/tabi/Desktop/filumire/FILUMIRE_WEBSITE`.

## Preservation and verification

Original website source, local backups and local environment configuration were preserved in `.vercel/parent-account-audit/original-website.zip` within the learner workspace. Tests ran on an isolated source copy with its local credentials removed. Local website records and existing database files were not opened or modified. No production authentication, billing, SMS, DNS or domain configuration changed.

- Existing automated regression suite: **65 passed, zero failures**. Covers bilingual routing, contact safeguards, subscriptions, parent authentication, token expiration/reuse/browser binding, session revocation, ownership, learner progress, Paystack test/live restrictions, request limits and delivery failure handling. The initial sandbox run encountered `spawn EPERM`; the authorized rerun passed.
- Website TypeScript check: **passed**.
- Local production build: **passed**, including type checking and all 31 generated pages.
- Vercel production build for the Preview: **passed**.
- Running application tests: **six configurations**, English/French at 320/768/1280 pixels, repeated successfully against the local production build. Tested invalid email, missing guardian consent, visibly enabled submission, loading, simulated mail acceptance, browser-bound confirmation, sign-out/cookie removal, simulated mail failure, retry, keyboard skip navigation and horizontal overflow. Used an in-memory database and simulated outbox; no real email was sent and no test subscriptions or authenticated sessions remained.
- Deployed Preview browser tests: **six configurations passed**, including bilingual content, enabled submission, honest HTTP 503 `configuration` response, layout, keyboard skip navigation and no browser JavaScript exceptions. Captured screenshots and visually inspected mobile French and deployed tablet English layouts.
- Verified all **166 source files** against the corrected local website and deployment dry-run hashes. Upload additionally includes `.vercelignore`; recovery snapshots, environment files and test databases are excluded. Source fingerprint: `872fa9f87f56b29a0558c67e328b4c011b5ee70d7b7a8257255ca4d64ec5abfb`.

## Remaining limitations and warnings

**Real parent sign-in/email delivery is not operational on this Preview.** Preview has no configured environment variables, and the existing billing adapter intentionally rejects local SQLite storage on Vercel. Valid form submission now clearly reports this limitation rather than silently disabling the button. A hosted account-storage integration and approved mail configuration are separate work; neither was introduced or activated here. Real inbox receipt was not verified.

The existing development build emits React key warnings in the shared Navbar/Footer translation rendering. The isolated nested build also reports Next.js workspace-root inference warnings because multiple lockfiles exist; the Vercel build succeeds. Neither prompted unrelated refactoring.

Evidence and detailed JSON results are stored under `.vercel/parent-account-audit/`; test drivers are `scripts/test-parent-account.mjs` and `scripts/check-parent-preview.mjs`. The short-lived Vercel token used for protected browser testing was kept in process memory and was not printed or included in the deployment.

Stopped after protected Preview deployment and verification. Production requires separate approval.
