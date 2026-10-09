# FILUMIRE Architecture Hardening — Security Baseline 001

**Status:** Discovery baseline; not a production-security certification  
**Date:** 8 October 2026  
**Scope:** Identity/session evidence from read-only PowerShell inspections, plus architectural requirements supplied by the project owner.  
**Change authorization:** None. This document authorizes no source edits, migrations, deployments, or database access.

## 1. Executive assessment

FILUMIRE has an existing identity/session architecture, including external JWT verification, server-side session records, and principal-to-learner authorization checks. The visible learner login page is currently a nonfunctional placeholder: its form submission prevents default behavior and displays a message instead of authenticating. Security of all endpoints, deployment modes, session lifecycle, and external identity-provider integration remains unproven.

## 2. Inspected locations

- `apps/learner/app/login/page.tsx`
- `apps/learner/app/api/session/issue/route.ts`
- `apps/learner/app/api/session/logout/route.ts` (partial inspection)
- `services/identity/index.ts`, especially lines 96–275, 276–302, 327–450, and 451–520
- `apps/learner/app/globals.css` (search indicators only)
- Learner/adult/teacher application route inventory

## 3. Findings with evidence and limits

| ID | Finding | Status | Evidence / limitation |
|---|---|---|---|
| ID-01 | Login page is a placeholder | **Confirmed** | `handleSubmit()` calls `preventDefault()` and sets a message; no sign-in call in the inspected handler. |
| ID-02 | External bearer token validation | **Implemented in inspected code** | `resolveExternalIdentity()` verifies JWT with RS256, configured JWKS, issuer, audience, expiration and subject. No identity provider configuration or integration test inspected. |
| ID-03 | Internal signed session JWT | **Implemented in inspected code** | `issueProductionSession()` signs HS256 JWT with session ID, learner ID, principal ID, issuer, audience, expiry. |
| ID-04 | Session-cookie flags | **Implemented in inspected code** | `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, `Max-Age` present. Browser behavior not tested. |
| ID-05 | Server-side session validity | **Implemented in inspected code** | `verifyProductionSessionToken()` calls `isPrincipalAuthSessionValid()` and updates last activity. Revocation and expiration implementation not inspected. |
| ID-06 | Learner authorization | **Implemented in inspected code** | `resolveProductionIdentity()` calls `isPrincipalAuthorizedForLearner()`; session issuance checks learner membership. All API call sites not audited. |
| ID-07 | Multi-learner selection | **Implemented in inspected code** | Issuance rejects zero learners and requires explicit selection when more than one is authorized. |
| ID-08 | Development identity headers | **Confirmed architectural risk to test** | `NODE_ENV !== 'production'` uses caller-provided principal/learner headers. Safe only in properly isolated local/test environments; staging and preview exposure unverified. |
| ID-09 | International phone/email login and OTP | **Required; not evidenced** | No phone/OTP flow in inspected login handler. Other modules not exhaustively searched. |
| ID-10 | Responsive device experience | **Unverified** | Global CSS contains grid-related declarations, but breakpoints and device behavior not inspected or tested. |
| ID-11 | Adult/teacher API authorization | **Unverified** | Routes exist; their authorization enforcement was not audited. |

## 4. Requirements register

### SEC-01 — Identity and authorization
- Keep an opaque, stable internal principal ID distinct from login identifiers.
- Preserve parent/guardian-managed learner profiles and explicit learner selection.
- Enforce authorization server-side on **every** protected learner, parent, teacher, admin and payment endpoint.
- Prevent caller-supplied development identity headers from authenticating requests in any publicly reachable environment, including staging/preview.
- Verify session revocation, expiration, replay protection, idle timeout and role changes through adversarial tests.

### SEC-02 — International phone/email authentication
- Support verified mobile numbers from **international destinations**, not only Ghana, using E.164 normalization and a country-code selector.
- Offer verified email as an alternative sign-in identifier; allow verified phone and email to link to one principal.
- Implement OTP/verification and secure recovery with expiry, single-use semantics, rate limiting, resend throttling, anti-enumeration and SMS-pumping controls.
- Do not assume SMS delivery or regulatory availability in every country; support controlled country rollout and email fallback.
- Address SIM swaps, recycled numbers, reassignment, number changes and account recovery without losing learner progress.
- Use stronger, phishing-resistant authentication for privileged operators where feasible.
- Integrate with the existing external identity-provider boundary; do not create competing identity stores without explicit architectural review.

### SEC-03 — Detection, logging and response
- Centralized, access-controlled audit events for sign-in, OTP, account recovery, permission changes, suspicious activity and payment-security events.
- Rate limits and bot/abuse defenses; alert on meaningful patterns, not every routine failed login.
- Defined operator ownership, severity, escalation, retention and incident-response procedures.
- Do not log passwords, OTPs, bearer tokens, full session cookies or children's unnecessary personal data.

### SEC-04 — Payment integrity
- Preserve the separate payment-ledger hardening track, strict verification, obligation binding, append-only evidence and authorization checks.
- Do not apply migration 0019, invoke live providers, or modify protected databases without explicit approval.
- Reassess payment authorization and concurrency after payment B3 is validated; avoid parallel refactors.

### SEC-05 — Database protection
- Least-privilege roles, isolated environments, migration governance, restricted access, backups, restore testing and auditability.

### SEC-06 — Encryption and secrets
- Secure transport, encryption at rest where appropriate, secrets management, key rotation and least-privilege access; never place secrets in frontend bundles or logs.

### SEC-07 — Child privacy and Ghana compliance
- Minimize collection, define lawful bases and guardian/child workflows, retention/deletion, cross-border transfer controls, breach response and applicable Ghana Data Protection Act obligations.
- Obtain jurisdiction-specific legal review before claiming compliance, especially for children and international users.

### SEC-08 — Resilience
- Backup/restore drills, recovery objectives, monitoring, incident response, availability and dependency failure handling.

### INF-01 / INF-02 — Secure hosting and operations
- Harden cloud infrastructure, deployment configuration, environment separation, CI/CD, monitoring, scaling and security alerts.

### UX-01–UX-05 — Browser and app experiences
- First-class responsive learner web experience on phone, tablet and laptop browsers, with touch/keyboard/accessibility and low-bandwidth design.
- Preserve account, progress, curriculum and authorization continuity across browser and future standalone apps.

### UX-06 / UX-07 — Feedback and accessibility
- Optional, accessible correct/incorrect learning sounds with mute/reduced-sensory options; support accessible, low-bandwidth use.

## 5. Release gates

1. **Functional correctness:** User journeys and learning/payment behavior work as specified.
2. **Security and privacy:** Threat modeling, authorization tests, abuse protections and child privacy controls pass documented acceptance criteria.
3. **Operational resilience:** Deployment, monitoring, alerting, backup restoration and incident response are verified.

## 6. Controlled work sequence

**Phase A — Discovery and threat model (read-only).** Inventory identity call sites, roles, API guards, session store, configuration boundaries, deployment modes, login UX, responsive CSS, and existing tests. Produce a gap matrix with exact source references and severity.

**Phase B — Remediation design.** Specify external identity-provider integration, international phone/email verification, account recovery, principal/learner authorization, development-mode isolation, audit events, cloud controls, responsive acceptance tests, and migration implications. Require owner approval before code changes.

**Phase C — Controlled implementation.** Small independently reviewed changes, targeted tests, no unapproved database changes or live provider calls.

**Phase D — Adversarial validation and release gates.** Test unauthorized cross-learner access, stale/revoked sessions, OTP abuse, account enumeration, public preview bypass, privilege escalation, and operational incident paths.

## 7. Immediate next action

Preserve this baseline in FILUMIRE project documentation after the owner reviews it. Do not hand Claude a broad implementation assignment while payment B3 is unfinished. When B3 is complete, request a bounded **read-only architecture gap audit** with exact file/line references, evidence, risks and recommended tests; stop before editing code.

## 8. Evidence caveat

This baseline is based on terminal excerpts shared by the owner, not an independent complete repository audit. 'Implemented in inspected code' does not mean tested, deployed, correctly configured or resistant to all attacks.
