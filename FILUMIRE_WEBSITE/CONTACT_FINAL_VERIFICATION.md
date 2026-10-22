# FILUMIRE Contact — final verification before deployment

Date: 12 October 2026. Workspace: FILUMIRE_WEBSITE. **DEPLOYMENT READY: NO.**

## Contact corrections — verified

/contact and /fr/contact return 200 in local development and render one form with Name, Email, Message and Send Message in the correct language. School/partnership legacy query links also return that same form. No category selector, subject field, optional visible fields, contact panels, webmail or email-app actions remain. Existing FILUMIRE section/container classes, colours, typography, spacing and button/form patterns are retained. The form has no outer card border/shadow or added illustration.

Source review confirms labelled required controls, validation error associations/focus, live feedback and confirmation focus. Responsive rules retain a fluid 640px maximum width, full-width controls, 16px input text and existing site breakpoints. No browser is connected: real checks at 390/768/1440px, keyboard behavior and visual overflow are UNVERIFIED. HTTP/source checks are not browser verification.

## SMTP compatibility — mismatch fixed locally

The owner reports these Production keys: FILUMIRE_SMTP_HOST=smtppro.zoho.com; FILUMIRE_SMTP_PORT=465; FILUMIRE_SMTP_USER=info@filumire.com; FILUMIRE_SMTP_PASSWORD configured securely; FILUMIRE_CONTACT_FROM=info@filumire.com; FILUMIRE_CONTACT_ENABLED=true.

The code previously read FILUMIRE_SMTP_FROM, which would reject that configuration and keep submissions disabled. Fixed src/lib/server/smtp.ts to read FILUMIRE_CONTACT_FROM as primary, retaining FILUMIRE_SMTP_FROM only as an absent-primary fallback. A blank/invalid primary sender still fails closed. Updated the environment example, setup guide and regression test. Separate authentication-mail behavior and unrelated website pages were not changed.

The exact reported variable names pass readiness and API routing tests using a test-only password and injected transport. No hosted environment values or secrets were read. All enquiries are fixed server-side to info@filumire.com, with the visitor's validated email as Reply-To. TLS connects directly on 465 with certificate verification, SNI and a TLSv1.2 minimum. A successful API response waits for final SMTP 250 acceptance after DATA; it explicitly does not claim confirmed inbox receipt. Failures return bilingual errors without a success flag. Existing validation, signed cookies, honeypot, body bounds and rate limits remain.

This local fix has not been deployed. Real Zoho authentication, SMTP acceptance and inbox receipt remain unverified until the approved post-deployment test.

## Test and build results

- PASS: 63 regression tests, 0 failed; includes bilingual coverage, validation, spam controls, fixed recipient, exact Production variable names, sender precedence, secret-free readiness and acceptance/failure semantics. SMTP tests use a mock transport.
- PASS: TypeScript, run sequentially after Next.js generation. An initial overlapping invocation raced regeneration of .next/types; its subsequent standalone rerun passed.
- PASS: focused HTTP checks for both Contact routes and two legacy query links.
- BLOCKED: production build attempted and exited 1 at next/font fetching Montserrat/Kalam. The public font requests failed with connect EACCES.
- ENVIRONMENT EVIDENCE: direct public HTTPS probes to fonts.googleapis.com, fonts.gstatic.com and unrelated example.com all returned EACCES. This supports an outbound-network restriction, not a font declaration defect. Typography/font configuration was preserved; no font mocks or substitutions were used. Compilation stages beyond this failure remain unverified.
- UNVERIFIED: real responsive/keyboard/browser behavior and real email delivery.

## Remaining blockers and deployment decision

1. Obtain a successful production build in an environment permitted to download the existing Google Fonts. Local tests passing cannot substitute for a completed build.
2. Complete actual English/French mobile and keyboard checks with an available browser.

The SMTP variable mismatch is fixed, but readiness remains NO until build and browser verification are complete. After explicit approval, deploy only filumire-website and verify actual receipt at info@filumire.com, Reply-To and bilingual messages. No deployment or DNS change was made. Hosted environment settings and other repositories/projects were not modified. Rate limits remain per-instance rather than globally durable.

Evidence: CONTACT_FINAL_VERIFICATION.json; tmp/contact-final-tests.log; tmp/contact-final-build.log; tmp/contact-final-network.json. Pre-change affected files: .local-backups/contact-final-verification-2026-10-12.
