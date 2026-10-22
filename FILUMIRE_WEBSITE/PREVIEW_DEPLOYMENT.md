# FILUMIRE website Preview deployment

Date: 11 October 2026. Existing project: filumire-website. Team: tabicrentsil-6879s-projects.

Preview: https://filumire-website-76c3f88wh-tabicrentsil-6879s-projects.vercel.app
French: https://filumire-website-76c3f88wh-tabicrentsil-6879s-projects.vercel.app/fr
Deployment ID: dpl_DbDNnhSrbKbNzS8Cb1sJurnEKUdZ. Status READY. API target null is Preview. Remote build duration approximately 35 seconds. No production promotion or alias assignment was requested; the Preview has no aliases.

Source-only authenticated Vercel connector deployment from the verified FILUMIRE_WEBSITE directory: 117 source/config/public files. Build configuration: Next.js, npm ci, npm run build, Node 24.x, application root at upload root, default Next.js output. Existing project has no configured environment variables. Dependencies remain locked by the existing package-lock.json. Source and asset SHA1 manifest retained under .local-backups/preview-deployment-2026-10-11.

PASS: latest standalone TypeScript, production build and 18 regression tests. PASS: local production HTTP checks across 35 page variants, 69 links, 14 inquiry/category combinations, 18 images and 31 generated assets.

PASS: protected deployed HTTP checks across all 20 English/French pages. Correct html language, main heading/landmark, Preview canonical/hreflang, localized internal navigation and rendered anchors. No external learner portal link is exposed. Tested English/French school-pilot deep links and French partnership deep link preserve the category and display schools@filumire.com or hello@filumire.com as appropriate. French missing-page response is 404 with French recovery. Sitemap returns 200 with the Preview origin. Representative deployed SVG logo, PNG landscape, compiled CSS and JavaScript return 200 with correct content types. All remaining assets were tested locally and included in the verified upload manifest; they were not individually refetched from the Preview.

Preview metadata preparation changed src/app/layout.tsx, sitemap.ts and robots.ts to use shared src/lib/site-origin.ts. On Preview it selects VERCEL_URL instead of localhost or a production domain; local inspection retains http://127.0.0.1:3147. tests/site-origin.test.mjs verifies this behavior. Original source is backed up in the deployment validation folder.

UNVERIFIED: interactive browser/responsive journeys, signed-in Gmail/Outlook/Zoho recipient prefill, clipboard/download and OS email-app behavior. HTTP checks are not browser interaction tests. Existing Vercel Authentication protection remains enabled, so the owner may need to sign in to view the Preview. No protection settings were disabled.

The production deployment dpl_Esdpz5nWfKxQjJcQNGYKrgo71u53 remains READY with its unchanged filumire-website.vercel.app and team-project aliases. No DNS, filumire.com or production domain was modified. No native email backend/API route is in the deployed source. Unapproved role access URLs remain gated. No mail was sent. All filesystem writes stayed within FILUMIRE_WEBSITE; outside-project git status was unchanged. FILUMIRE_CORE, FILUMIRE_CLAUDE and learner code/settings were not modified. Local verification server stopped after checks.
