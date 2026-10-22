# FILUMIRE Production release — partial domain completion

Date: 11 October 2026.

## COMPLETED

Owner-authorized Production deployment dpl_7YwQSnhu85B1GFbsa6Yd76eU4zWr is READY in the existing filumire-website project. It contains one bilingual Next.js website and one EN | FR header selector; French remains an internal /fr route in the same deployment. The approved Preview source matched the local SHA1 manifest before release. The only presentation changes were EN | FR labels, full language accessibility labels and retained translations. Production-only NEXT_PUBLIC_FILUMIRE_SITE_URL=https://filumire.com supplies official metadata. No new website project, French deployment, account or email service was created.

The apex was already verified on this project and remains primary with no redirect. Added www.filumire.com to this project with a permanent 308 redirect to filumire.com. Vercel assigned both domains to the new Production deployment. No Cloudflare DNS or nameserver write was performed. Existing email records were not removed or changed by this task. The public source includes no native email API or sending backend. Learner role URLs remain gated and inactive.

## LIVE URL

https://filumire.com — all 20 English/French pages and one contact query variant returned HTTPS 200 through the Vercel server-side fetch connector. Canonicals and sitemap use filumire.com. The final public website is the apex domain, not the retained Preview URL. Vercel reports correctly configured apex DNS and a filumire.com certificate valid until 8 January 2027, with auto-renew enabled. Certificate validity is evidenced by Vercel metadata and successful HTTPS responses; a separate TLS probe was not performed.

The server-side verification connector adds temporary authentication/share parameters even on custom-domain requests. Its temporary release-verification link was revoked after checks. Independent unauthenticated fetching through the generic web tool was inaccessible, and no browser was available. Thus actual browser/public-session access is not certified by those connector checks alone. Project protection excludes custom domains; its settings were not disabled or broadened.

## VERIFIED

- PASS: TypeScript, Next.js production build and 18 regression tests, rerun after the label changes.
- PASS: local built-site checks: 35 page variants, 69 links, 14 inquiry/category combinations, 18 images, 31 generated assets, localized recovery and sitemap.
- PASS: official-domain HTTP checks across all 20 locale pages plus French school-pilot inquiry. Correct language, main landmark/heading, EN | FR selector, canonical/hreflang, locale-preserving links and rendered anchor targets. The school-pilot category and equivalent language-link query remain intact. No unapproved learner destination is exposed.
- PASS: deployed logo SVG, landscape PNG, compiled CSS and JavaScript return 200 with correct types. Official sitemap returns 200; French missing page returns 404 with localized recovery.
- PASS: learner and older filumire project snapshots are unchanged. Outside-website git status is unchanged. No FILUMIRE_CORE, FILUMIRE_CLAUDE, learner source, database or learner security setting was modified. Local validation server stopped.
- UNVERIFIED: browser language clicks, Back/Forward, mobile menu/focus and visual layout at 390/768/1440 px. The browser connection returned No browser is available. Implemented responsive rules and pure locale-switch tests were reviewed, but are not browser passes.

## BLOCKED

Cloudflare is authoritative: elsa.ns.cloudflare.com and jaziel.ns.cloudflare.com. Vercel reports www has no A/CNAME answers and is misconfigured; its HTTPS fetch failed. No authenticated Cloudflare connector or browser session is available.

In Cloudflare → filumire.com → DNS, add exactly:

| Type | Name | Target | Proxy | TTL |
|---|---|---|---|---|
| CNAME | www | 168ca150c32b1bf0.vercel-dns-017.com | DNS only (grey cloud) | Auto |

This target is Vercel's rank-1 recommendation for this project/domain. Do not change nameservers, apex records, MX, SPF, DKIM, DMARC or Zoho verification records. After the record propagates, verify www receives HTTPS and returns 308 to https://filumire.com, retaining path/query. The Vercel redirect is configured, but its real HTTP behavior is not yet verified.

DNS requests from the local runtime timed out and generic DNS-over-HTTPS fetching was inaccessible. The full Cloudflare zone, including DKIM selectors and all email records, could not be inspected. No independent Zoho DNS-integrity or mailbox-delivery pass is claimed. No DNS mutation occurred. The apex is already accepted by Vercel, so no apex DNS action is required.

## OUTSTANDING

Native Contact → Send → FILUMIRE delivery remains incomplete. The current form accurately prepares a local draft; webmail, address copy and optional email-app alternatives remain available for info@filumire.com, schools@filumire.com and hello@filumire.com. No message was sent and no backend delivery test was performed. Implement a secure owner-approved backend and test actual delivery before replacing the draft messaging or advertising native sending.

The separate learner beta remains under development. learn.filumire.com is an intended future destination only; it was not configured or exposed. Authentication, child-data protection and essential functionality need separate controlled-beta verification.

Before declaring complete launch validation, manually visit https://filumire.com on desktop/mobile, switch EN | FR on Contact with an inquiry category and About with a section anchor, use Back/Forward and reload; test menu Escape/keyboard focus and draft copy/download. After Cloudflare's www record resolves, verify its HTTPS redirect. Browser and signed-in provider prefill checks remain outstanding.

Evidence and backups: .local-backups/production-release-2026-10-11. Existing Preview handoff is retained as historical evidence. No complete-launch claim is made while www and browser verification remain outstanding.
