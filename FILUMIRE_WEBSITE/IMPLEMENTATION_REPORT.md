# FILUMIRE public website implementation — 11 October 2026

Implemented locally in FILUMIRE_WEBSITE. No deployment, DNS, Vercel access-control or production-environment change. FILUMIRE_CORE and learner application remain unchanged. Existing unrelated Git status is unchanged.

## Implemented
- Website-owned official PDFs, hash/page references and reproducible source extraction. All 12 combinations have class-specific strand, sub-strand, content-standard and learning-indicator navigation.
- 697 evidence-backed alignment mappings; 695 include explicitly declared authored activities. All remain In Development, with public availability unverified. Fifteen unmatched adaptive references are recorded separately. No missing mapping is labelled Planned and no lesson is labelled Available.
- Accessible native details/summary explorer, EN/FR interface and warning messages, class/subject URL selection and equivalent-language links. Official quotations retain original English and are marked lang=en; they are not an official French translation.
- French dashboard, family and avatar-selection artwork, selected by locale. Original assets preserved.
- Native contact form and server endpoint: fixed three recipients, bilingual validation, protected submission token, honeypot, bounded request parsing, per-instance limits and implicit-TLS Zoho transport. No credentials configured and no real email sent.
- Updated public privacy and recovery wording; optional address-copy, webmail and email-app actions remain accessible.

## Curriculum code coverage
Counts below are extracted learning-indicator records, not available FILUMIRE lessons. All combinations pass printed-code inventory and parent/source integrity tests.

| Subject | Basic 4 | Basic 5 | Basic 6 |
|---|---:|---:|---:|
| Mathematics | 71 | 67 | 43 |
| English Language | 130 | 133 | 131 |
| Science | 24 | 29 | 26 |
| Computing | 27 | 81 | 98 |

There are 75 verification notes, including 15 missing/extraction-unresolved hierarchy titles, repeated statements and inconsistent printed codes. Sources are linked at the relevant PDF pages. Full wording/hierarchy adjudication is NOT VERIFIED; no claim of complete verified transcription, NaCCA endorsement or complete lesson coverage is made.

## Validation
- PASS: TypeScript, production build and 33 tests (0 failed).
- PASS: local HTTP check of 35 page/query variants covering all 20 EN/FR public routes; 117 links, 21 images, 31 generated assets, 14 inquiry-category cases and bilingual not-found recovery.
- PASS: 24 class/subject/locale deep-link HTTP responses and equivalent language-switch query URLs. These are HTTP/static checks, not browser interaction tests.
- PASS: native API validation returns 400 with precise English/French errors; unconfigured delivery returns honest 503; external Origin rejected with 403. SMTP secrets/transport code absent from browser assets. Recipient and transport-failure tests use injected mock delivery, not actual Zoho delivery.
- UNVERIFIED: responsive browser rendering, keyboard/menu interaction, live expansion, Back/Forward and real SMTP/inbox delivery. Browser connector reported no browser available; no browser tests are claimed.

## Owner dependencies and remaining work
1. High: approve and securely configure the Zoho SMTP host/region, account/app password and authenticated sender, then authorise a controlled delivery test to all three addresses. See NATIVE_CONTACT_SETUP.md. Native messaging is disabled until configured. Do not promote this as a tested delivery service.
2. Medium: adjudicate the source verification notes and 15 unmatched mappings before claiming complete verified curriculum coverage. Source quotations remain English in the French explorer; full French explanatory translations of official statements are not included.
3. Medium: complete actual browser validation at 390, 768 and 1440px.

## Exact local inspection URL
http://127.0.0.1:3147/ — production build, messaging disabled.

Manual browser checks:
1. Open /curriculum and /fr/curriculum at 390/768/1440px. Choose each Basic 4–6 subject, expand every level, inspect French labels and source notes, and follow PDF page links.
2. Open /curriculum?class=6&subject=computing; switch EN/FR, reload, and use Back/Forward. Check equivalent page, selection and query preservation.
3. Use keyboard Tab/Shift+Tab, Enter/Space on summaries, and Escape on the mobile menu. Check visible focus, skip link and no horizontal overflow.
4. Inspect French dashboard, families and avatar artwork. Compare English originals and check text legibility and clipping.
5. Visit /fr/contact?inquiry=school-pilot. Confirm category, fields and messaging-unavailable guidance; address copy and optional email actions must not claim delivery. Enable sending only after separately approved configuration and testing.

## Principal affected files
Existing: src/components/ContactInquiry.tsx; src/components/EmailContactActions.tsx; src/components/pages/curriculum.tsx; src/components/pages/contact.tsx; src/components/pages/privacy.tsx; src/lib/constants.ts; src/lib/translate.tsx; src/lib/translations.ts; src/app/error.tsx; src/app/globals.css; .env.example; scripts/check-links.mjs.
New: src/components/CurriculumExplorer.tsx; src/lib/curriculum/*; src/lib/localized-assets.ts; src/lib/server/contact.ts; src/lib/server/smtp.ts; src/app/api/contact/route.ts; scripts/extract-curriculum.mjs; scripts/extract-alignment.mjs; tests/contact.test.mjs; tests/curriculum.test.mjs; tests/localized-assets.test.mjs; tests/load-ts.mjs; public/curriculum-sources/*; public/product-preview/fr/FILUMIRE-Interface-Page-04.png; public/illustrations/fr/learners.png; public/illustrations/fr/avatar-selection.png.

Detailed setup: NATIVE_CONTACT_SETUP.md. Asset prompts and paths: ARTWORK_LOCALIZATION.md. Machine-readable results: IMPLEMENTATION_VALIDATION.json.
