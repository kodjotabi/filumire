# FILUMIRE font build blocker — resolved

12 October 2026. Work limited to FILUMIRE_WEBSITE. The Google Fonts production-build blocker in CONTACT_FINAL_VERIFICATION.md is resolved. **DEPLOYMENT READY: NO** solely because the preceding release checklist's real mobile/keyboard browser checks remain outstanding; no browser is connected. There is no remaining identified code/build blocker in this task.

## Files changed

- src/app/layout.tsx: removed next/font/google and its build-time fetches; imports local font CSS and preloads the same three Latin font files.
- src/app/fonts.css: retained the original 33 Montserrat/Kalam font-face declarations, weights, Unicode ranges, swap display and fallback metrics, with local URLs.
- public/fonts/: 11 original WOFF2 files copied byte-for-byte from this workspace's cached Next.js font output; provenance/hash manifest, README and SIL OFL copyright/license notices included.
- tests/fonts.test.mjs: verifies font integrity/weight support and French accents/ligatures.
- FONT_BUILD_RESOLUTION.md and FONT_BUILD_RESOLUTION.json: current evidence/report.

No page layout or Contact/SMTP implementation was changed. SHA-256 comparisons confirm src/components/ContactInquiry.tsx, src/components/pages/contact.tsx, src/lib/server/smtp.ts and src/lib/server/contact.ts remain identical to the start of this task. No dependencies added or version changes.

## Typography and offline builds

The former next/font/google import downloaded Montserrat and Kalam when building and failed with EACCES under the sandbox's network restrictions. The fonts are now project-owned public assets and CSS: no external font request occurs at build time or in emitted production font CSS. The original 302,736 bytes of font data, all subsets and requested weights are preserved, including French accents and ligatures. Copies have matching SHA-256 values and were decoded with the installed Next.js font parser. No substitute fonts, mocked downloads or network bypasses were used.

## Validation

- PASS: npm test — 65 tests, 0 failed, including the verified exact Production SMTP variable names/routing and the two new font integrity/coverage checks.
- PASS: npm run typecheck.
- PASS: npm run build — exit 0, compiled, checked types, generated pages and collected build traces in the same restricted environment.
- PASS: /contact and /fr/contact on the finished production build return 200 with exactly Name, Email, Message and Send Message, correct languages and no extra panels. School/partnership legacy query links also pass.
- PASS: all 11 local font responses return 200, font/woff2 and original hashes; emitted CSS references only local font files.
- PASS: npm run test:links against the production build — 40 pages, 103 links, 21 images, 35 generated assets and 16 legacy inquiry cases; bilingual recovery/sitemap checks pass.
- UNVERIFIED: real viewport rendering and keyboard interaction. Font identity and CSS preservation are source/asset checks, not pixel comparison.

## Remaining checks

Before declaring full release readiness, complete the prior EN/FR visual and keyboard checks at 390, 768 and 1440 pixels using a connected browser. Actual Zoho delivery remains a post-deployment check after explicit approval; no email was sent and no hosted secret was accessed. SMTP code retains FILUMIRE_CONTACT_FROM compatibility, TLS 465, fixed info@filumire.com recipient and success only after SMTP acceptance.

No deployment, DNS change, other repository or Vercel project modification occurred. The temporary production inspection server was stopped. Build/test/link logs are in tmp/font-build-*.log. The original layout and emitted font declarations are preserved in .local-backups/local-fonts-2026-10-12.
