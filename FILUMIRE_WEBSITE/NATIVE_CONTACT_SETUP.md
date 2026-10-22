# Native contact delivery configuration

The English/French Contact page uses the existing FILUMIRE styles and collects only name, email and message. All enquiries are fixed server-side to info@filumire.com. The validated visitor email is Reply-To; it is never used as the authenticated sender.

## Why submissions are disabled locally

Before this task, no local environment files existed and none of the six contact SMTP settings were present in the runtime. The Contact page requests GET /api/contact. The endpoint returns 503 with available=false unless all required settings pass validation, so the Send button is disabled.

This task prepared an ignored .env.local file with FILUMIRE_SMTP_PORT=465 and FILUMIRE_SMTP_FROM=info@filumire.com. The enable flag remains false and the host, account and password remain blank. No credentials were invented and no email was sent.

## Configuration still required

Set these server-only keys securely in .env.local for local verification:

- FILUMIRE_SMTP_HOST: the real supported Zoho SMTP host for the account's region. Do not guess the region.
- FILUMIRE_SMTP_USER: the actual authenticated Zoho SMTP account.
- FILUMIRE_SMTP_PASSWORD: the actual SMTP/app password accepted by that account. Never put it in chat, logs, source files or NEXT_PUBLIC_* variables.
- FILUMIRE_SMTP_FROM=info@filumire.com: prepared; confirm that this sender is authorised for the SMTP account.
- FILUMIRE_SMTP_PORT=465: prepared; this implementation uses verified implicit TLS and does not support STARTTLS on 587.
- FILUMIRE_CONTACT_ENABLED=true: set after filling the real settings. A true flag alone does not enable sending when any required setting is invalid.

Run npm run check:contact to check the production-mode local configuration, or npm run check:contact -- --development for development-mode local overrides. This reports configuration problems without printing values and makes no SMTP connection. An exit code of 1 means configuration is incomplete; 0 means the settings satisfy local validation, not that the credentials or inbox delivery have been verified. Restart the local server after editing its environment.

No hosted environment was inspected or changed in this workspace-only task. A future approved deployment needs the same server-only settings in its own environment; local .env.local values are not a hosted configuration. Keep passwords in the platform's secret settings. No DNS modification is part of this setup.

## What the flow guarantees

The endpoint retains field validation, header-injection protection, strict origin checking, bounded streaming body parsing, a honeypot, signed HttpOnly/SameSite cookie verification, minimum completion time and temporary per-instance email/address limits. HTTPS adds Secure to the cookie. Rate limits are per running instance, not globally durable.

SMTP authentication and transmission run on the server over certificate-verified TLS. The recipient cannot be overridden by a visitor. A successful SMTP acceptance returns a confirmation in English/French; it does not claim confirmed inbox receipt. Rejection, timeout and network failure return an error without a success flag. Failed submissions retain the visitor's form fields for retry.

Unit tests inject a mock transport to check routing, waiting for acceptance and bilingual failure feedback. Real SMTP authentication, receipt at info@filumire.com, spam-folder handling, French accents and Reply-To still require a controlled delivery test after real credentials are supplied securely. No real delivery is claimed.

## Production compatibility update — final verification

The owner reports the six contact settings are configured in filumire-website Production, including FILUMIRE_CONTACT_FROM=info@filumire.com and FILUMIRE_SMTP_HOST=smtppro.zoho.com. Contact now reads FILUMIRE_CONTACT_FROM as the primary sender, with FILUMIRE_SMTP_FROM retained as a legacy fallback only when the primary variable is absent. An empty/invalid primary sender fails closed; a fallback cannot mask it. The separate authentication-mail configuration is unchanged. The earlier local setup status above is historical and does not describe the owner-reported hosted settings.

Regression tests exercise exactly those variable names using a test-only password and injected transport. No hosted password or environment values were read. Actual SMTP authentication and inbox delivery remain reserved for the approved post-deployment test.
