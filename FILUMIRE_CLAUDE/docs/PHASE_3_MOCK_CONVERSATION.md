# Ask FILU local conversation prototype

The approved prototype extends the existing EduTutor adapter and governed instructional engine. It does not call an external model, change adaptive decisions or evaluate answers. The former quick-action interface is replaced with a question field, Send, a transcript and contextual follow-up turns. Every response and the interface identify the provider as a prepared mock. Arbitrary questions are accepted but are not semantically understood.

## Data flow and safeguards

`FiluConversation` sends only question, selected language, request ID and an opaque signed history token to `/api/tutoring/conversation`. Existing cookie authentication determines the principal, learner and account session. Production rejects development identity headers. Server context reads the existing curriculum pointer, competency state, prerequisites, diagnostic/misconception history and active interventions. No context is accepted from the client. Development fixtures may resolve a unique persisted active intervention because the existing development learning endpoint does not save a curriculum pointer; production cannot use that fallback.

The adapter reuses `generateInstruction` with existing authored teaching content matching the selected language and strategy. The provider receives projected context, without learner/account identity, assessment metadata, rubrics or answer keys. The persisted intervention supplies the current activity type; authored teaching content is a relevant competency resource, not proof of the exact current lesson content ID (that ID is not persisted on the intervention).

All assessment-capable, teacher-review, missing or ambiguous interventions fail closed. Any active scored intervention for the learner, including one in another competency/tab, blocks the provider entirely. Protected responses use fixed bilingual guiding questions and do not echo or solve the learner's prompt. A fresh context fingerprint is checked after generation and before serving cached replies. Changed context discards the response. Tutoring never writes learning state, evidence, interventions or instructional acknowledgements; normal authentication-session renewal and existing rate-limit metadata remain part of authenticated request handling.

## Session privacy and reliability

- Browser `sessionStorage` only; no transcript in localStorage or the database. Up to 20 messages / 12,000 text characters; history expires 30 minutes after conversation creation, rather than extending on every turn. No durable conversation schema or migration.
- Browser history clears on successful sign-in, logout, learner selection, expiry and invalid session. Session storage is plaintext on the local device; signatures protect integrity and bind history to the authenticated learner/session, not confidentiality. Use fictional questions only. Storage-disabled environments still allow in-memory conversation but cannot restore it after navigation/refresh.
- Server HMAC-signed tokens use a domain-separated key derived from the existing JWT secret. Production fails closed without a valid secret. Development can use a process-local random signing key; a restart invalidates those tokens.
- Short-lived in-process duplicate cache: maximum 256 requests, cleared on expiry by a periodic sweep. It may retain a response until its 30-minute expiry after browser logout, but revoked or different sessions cannot retrieve it. No prompts, tokens, provider details or learner context are logged. Default Next request logs contain route paths/statuses only.
- Existing shared limiter: 20 requests per minute per authenticated learner/session. JSON input is streamed with a 64 KiB cap; questions are limited to 1,000 characters. Cross-origin requests are rejected.
- Persist pending requests before sending; retries retain the same ID, question, history and language. In-flight duplicates share a provider response in one server process. UI request generations discard unmounted/stale responses. Timeout/error states never fabricate a reply. In-process deduplication does not guarantee one provider call across multiple server instances or restarts; a future paid provider requires an approved shared idempotency design.

## Validation and remaining boundary

Run `node scripts/test-tutoring-conversation.mjs` (six memory-only suites), `node scripts/test-section7.mjs`, `node scripts/test-learning-continuity.mjs`, and `node scripts/test-learning-presentation.mjs`. All passed during this implementation: 20 baseline suites, six continuity suites, eight presentation suites and six tutoring suites. The latter runners include adaptive/assessment/identity regressions and 36 instructional journeys / 4,418 checks. Explicit `npx tsc --noEmit --project apps/learner/tsconfig.json` and the production build passed. Build with `FILUMIRE_PERSISTENCE=memory` and `npm run build:learner`. Next printed its combined lint/type stage, but this repository has no ESLint configuration or standalone lint script; an independent ESLint pass is not claimed. No package/configuration changes were introduced. React SSR tests emit the existing harmless styled-JSX attribute warning outside Next's transform. PostgreSQL/database integration was not rerun; all validation used memory fixtures.

New tests cover server-loaded context without learning writes, real production-cookie authentication, French teaching, bilingual follow-ups, history tampering/isolation/expiry, repeated assessment attacks, other active assessments, request limits, rate limiting, provider failures/timeouts, delayed responses, concurrent duplicates, browser history restoration/cleanup, error transport and accessible bilingual rendered controls. Local HTTP checks cover dashboard loading, context loading and English/French conversational requests. No connected browser was available for interactive testing; actual browser interaction, mobile keyboards, device layout and screen-reader behavior remain unverified.

Genuine natural-language tutoring still requires a separately approved model/provider integration, spending limits, child-data privacy/processing review, provider-output safety evaluation and a distributed retry strategy before billable calls. The mock provider deliberately offers a scripted teaching sequence and guided reflection, not semantic answers, dynamic mathematical reasoning or real adaptive dialogue. No external provider, deployment or paid service is activated by this work.

## Phase 3 file scope

Modified existing files:

- `apps/learner/components/filumire/AskFiluPage.tsx`: conversation replaces quick actions, preserving Phase 2 progress and branding.
- `apps/learner/app/dashboard/page.tsx`: learner-bound browser history scope.
- `apps/learner/services/account-client.ts`: history cleanup on authentication and learner changes.

Added files:

- `apps/learner/components/filumire/FiluConversation.tsx`: composition, transcript, retries, expiry, scrolling and accessible bilingual controls.
- `apps/learner/services/conversation-client.ts`: session storage and authenticated request transport.
- `apps/learner/app/api/tutoring/conversation/route.ts`: mock-only authenticated route.
- `packages/ai/conversation.ts`: transport types, projected context, provider abstraction and mock implementation.
- `services/edututor/conversation-context.ts`: read-only trusted context and reuse of the instructional engine.
- `services/edututor/conversation-api.ts`: identity, history signatures, limits, duplicate protection and assessment safeguards.
- `tests/tutoring-conversation-api.test.ts`.
- `tests/tutoring-conversation-context.test.ts`.
- `tests/tutoring-conversation-identity.test.ts`.
- `tests/tutoring-conversation-client.test.ts`.
- `scripts/test-tutoring-conversation.mjs`.
- `docs/PHASE_3_MOCK_CONVERSATION.md`.

Phase 1/2 edits remain in the working tree. HEAD remains `a59b9fdf`. No commit, push, deployment, environment modification, migration or remote database operation was performed.
