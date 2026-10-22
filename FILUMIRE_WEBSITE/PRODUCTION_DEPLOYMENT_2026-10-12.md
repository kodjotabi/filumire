# FILUMIRE Production Deployment — 2026-10-12

Status: READY.

Project: filumire-website (prj_wgK6IrwedlpjD7Wm8HBaHmdIdDQc). Team: team_ZGp9TfdK3M45ks3ViQZ9WgSW.

Deployment: https://filumire-website-fyaiu8dv9-tabicrentsil-6879s-projects.vercel.app
Deployment ID: dpl_Dmho6o9p1iktU6iZjf8z7pDcbS3B

Deployed the approved current local source from FILUMIRE_WEBSITE using 163 allowlisted source/assets/configuration files, without Git checkout or Git deployment. Source fingerprint: c7b469c3c3ff10be7d4411bcb3f73c8f9581d108fb40601bdff5f4f3b25b62af. The 93 source files visible in Vercel’s bounded file listing all match the local SHA1 manifest, including ContactInquiry, layout, fonts CSS and all 11 font assets. The SMTP source was submitted from the same verified local manifest; its content-addressed source is present, although the connector truncates returned contents.

Approved three-field English/French Contact form, canonical FILUMIRE_CONTACT_FROM SMTP sender fix and original self-hosted Montserrat/Kalam retained. No secret values were read, printed or uploaded. Existing hosted Production environment was used.

Vercel production build passed (33 seconds). Deployment READY and filumire.com alias resolves to this deployment ID. Homepage, /contact and /fr/contact HTTP 200; locale and three fields verified. GET /api/contact HTTP 200 and available=true. All 11 font endpoints HTTP 200 with font/woff2; deployed stylesheet uses local font URLs.

Checks used the authenticated Vercel HTTP connector; generic public fetch could not access these URLs. Independent unauthenticated and interactive/mobile browser checks remain unverified. Temporary verification share link revoked: true.

No email was sent by this audit. SMTP acceptance and real receipt at info@filumire.com remain unverified. Enabled API configuration is not proof of inbox delivery.

No DNS, Zoho records, filumire-learner or other projects were modified.
