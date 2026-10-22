# FILUMIRE website production deployment

Date: 11 October 2026.

Production deployment **READY** in the existing **filumire-website** project (prj_wgK6IrwedlpjD7Wm8HBaHmdIdDQc). Source: C:/Users/tabi/Desktop/filumire/FILUMIRE_WEBSITE.

- Public website: https://filumire.com
- Deployment: https://filumire-website-aldpse645-tabicrentsil-6879s-projects.vercel.app
- Deployment ID: dpl_4i6dsdf5mbyVzSygKT1C9ytPZsN4
- Target: production; Next.js 15.5.27; Node 24.x.
- Source-only release: 146 files, excluding local databases, credentials, backups, tests, logs and generated output. Source hashes remained unchanged during release. Large assets rejected by the binary-upload connector were supplied unchanged as inline base64 source files.

## Included and verified

Curriculum corrections and source PDFs, French artwork, native contact-form implementation, and bilingual provisional subscription/pricing/account pages are deployed. Individual GH₵30/month for one learner and family GH₵60/month for up to three learners remain provisional. Existing schools enquiry routes are preserved.

All 57 local regression tests and TypeScript checks passed. The local build attempt was blocked by the execution environment's Google Fonts network access. Vercel's actual production build passed in 29 seconds, including compilation and type validation. All 26 English/French page routes plus two school enquiry variants returned HTTP 200 with correct language, main heading, language selector and official canonical URL. Account pages retain noindex/no-referrer. Three French artwork files, four curriculum PDFs, logo/footer artwork, sitemap, robots, two CSS files and a JavaScript file returned HTTP 200 with expected content types. Sitemap includes localized pricing and excludes accounts. No runtime errors were reported in the project's 30-minute lookback window.

Live GET /api/subscriptions returns 503 with configuration; GET /api/contact returns 503 with available:false. GET parent-auth and webhook routes return 405 because they accept POST only. No production POST requests, real Paystack transactions, refunds or emails were performed. The automated tests verify write-route production gates and payment/trial security with fixtures; provider integration is not certified by those tests.

## Disabled and outstanding

Subscriptions, parent sign-in, trial activation and checkout remain unavailable on Vercel. The current persistent SQLite implementation explicitly supports local development only and refuses Vercel/production. Paystack refuses live keys and production execution. No service credentials were added; the existing official site-origin setting was retained. Required next work is a hosted persistence adapter/database, approved parent authentication/email setup, Paystack test credentials and provider webhook testing, and a learning-platform entitlement handoff before full seven-day learning trials can activate. Contact sending requires approved SMTP credentials and actual mailbox-delivery checks; current on-site unavailable messaging and alternative contact methods are retained. No live payments or trials were activated.

Vercel's dependency audit reported one moderate and one high vulnerability; detailed dependency review remains outstanding. No dependency versions were changed for this release.

## Verification boundaries and scope

Checks used the authenticated Vercel HTTP connector, which creates a temporary verification share link. That link was revoked after checks. An independent unauthenticated browser session was unavailable; interactive, visual and mobile QA remain outstanding. The generic web tool could not reach filumire.com. This release does not claim an independent browser pass or SMTP/payment integration success.

Only the authorized public website project was deployed. No DNS, domain configuration, other project, unrelated application or project-protection setting was changed. Existing production aliases were assigned by Vercel as part of the release. www DNS/redirect behavior was not reverified in this release; its earlier DNS issue remains outside this task's permitted changes.

Detailed evidence: PRODUCTION_DEPLOYMENT_2026-10-11.json. Local logs: tmp/production-deploy-tests.log and tmp/production-deploy-build.log.
