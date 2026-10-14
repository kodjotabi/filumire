# Ask FILU forensic evaluation — 11 October 2026

The registration/navigation Preview was based on committed revision `a59b9fdf`, with a navigation-only patch. Its existing Ask FILU implementation deliberately disabled question input. Separate uncommitted Phase 3 work introduced a conversation interface and endpoint, but the endpoint was permanently wired to `MockConversationProvider`. That provider ignored the question and selected the next prepared teaching element by turn count. A functioning navigation link therefore did not establish a functioning interactive tutor.

The repaired implementation uses the existing `ConversationProvider` boundary, bilingual content store, governed instruction engine, learner competency state, intervention store, cookie authentication and shared rate limiter. Its default provider is `CurriculumConversationProvider`: local question-intent recognition, lesson-text retrieval and ungraded guided practice. It makes no model or external provider calls, installs no dependencies and adds no paid services.

## Findings and repairs

| Finding | Evidence | Repair |
|---|---|---|
| Disabled deployed free-text interaction | Committed `AskFiluPage` displayed a disabled input and Send button. | Connected the existing conversation interface to the actual tutoring endpoint. |
| Mock responses independent of the question | Default handler constructed `MockConversationProvider`; its response used assistant turn count, not question meaning. | Default provider now selects explanation, hint, authored example, simpler scaffold, summary, continuation or practice based on the question and approved current lesson materials. Unsupported topics receive a clear limitation rather than invented content. |
| Adaptive context was projected but ignored | Mock received mastery, confidence, difficulties and intervention strategy without using them. | Tutor uses mastery/confidence, difficulties and remediation state to choose smaller steps, scaffolds, amount of explanation and practice difficulty. Existing governed instruction preserves the selected strategy. Conversation does not change adaptive authority. |
| Follow-up practice had no answer checking | Earlier prototype only advanced through prepared text. | Added ungraded number-pattern practice and lesson-grounded missing-word practice. Signed session state tracks the practice and attempts; replies offer hints, explain the result and invite reflection. These exercises never use scored assessment items or write marks, mastery or evidence. |
| Actual HTTP requests could be rejected as cross-origin | Real browser-to-Next POST returned 403: Next constructed an internal URL instead of the browser-facing host. | Origin comparison now uses the incoming Host, with platform forwarding protocol only on Vercel. Cross-site Fetch metadata and mismatched origins still fail closed. Regression tests cover both cases. |
| English topic title remained on the French screen | Screenshot showed an English competency title under French navigation and replies. | Added authenticated, no-store context metadata containing the lesson title in the requested language, protection state and teaching availability. French does not fall back to the English topic title. Metadata excludes teaching text, answers, rubrics and learner identifiers. |
| Ask FILU could display tracked-competency counts as complete subject progress | The committed Ask view skipped overview loading and displayed counts from the current learner state. | Release now loads the existing subject overview for Ask FILU and displays its real completed/total figures. Missing overview is marked unavailable rather than fabricated. Verified Science showed 0 of 24 rather than 0 of 1. |
| No child-disclosure filtering | Questions entered the browser pending cache and signed transcript unchanged. | Added English/French rules for personal disclosures, distress, harmful instructions and attempts to override learning rules. Safety replies bypass the provider, omit the raw disclosure from returned/signed history, and direct distress to a trusted adult without claiming FILU can contact anyone. Pending disclosures are not persisted in browser storage. Legacy user history is sanitized on read. |
| History was learner-bound but not topic-bound | The earlier scope used only learner ID; signed history had no topic boundary. | Browser scope includes learner and competency context. Signed server history includes subject/competency context. Topic changes reset history; entering a scored activity clears earlier teaching/practice. Owner binding continues to include principal, learner, session and identity source. |
| Retry failure could trap the composer | A pending failed question disabled editing indefinitely. | Added Edit question, recoverable validation/context errors, preserved request IDs for retry, stale-request cancellation and strict response validation. Expired authentication disables new submissions. |

## Validation

- Exact isolated release production build passed: compilation, lint/type checks, static generation and function packaging. The tutoring route appears in the build output.
- Eight focused suites passed: actual FILU functionality, conversation API, persisted context, production-style identity, client/retry handling, Ask navigation, governed instructional engine and four-subject FILU integration.
- Actual functionality suite made 48 real conversation handler requests across Mathematics, Science, Computing and English, plus authenticated English/French metadata requests. It exercised the default curriculum provider, signed cookie sessions, stored lesson materials and actual practice checking. It verified that mastery and evidence snapshots remained unchanged by tutoring.
- Browser suite made 73 actual HTTP tutoring turns against the exact production-built Next application at 390px and 1280px. No `page.route`, fake fetch or mocked API responses were used. English/French content, translated titles, hints/examples, correct/incorrect practice feedback, refresh continuity, offline/retry recovery, privacy omission, assessment protection, active navigation and screen fit passed with no page errors.
- Browser records were fictional, seeded in the existing in-memory persistence implementation. Test configuration used a dummy unreachable loopback database URL. No remote database was contacted, changed or migrated, and no real child/account information was used.
- The existing content catalogue contains English and French lesson material for 862 teaching-covered competencies across the twelve Basic 4–6 subject/grade groups. This is a catalogue-availability check, not a claim that every lesson's educational quality or every possible question was individually validated.
- The four subjects' actual teaching tests cover representative Basic 4 topics. Missing teaching or a language mismatch yields an explicit limitation. Assessment-capable or ambiguous interventions remain protected; assessment prompts never reach the provider.
- Session isolation, signed-history tampering, revoked sessions, production rejection of development identity headers, rate limits, body limits, provider failure/timeouts, duplicate requests and delayed context changes passed.

The deployable package starts from the previously verified committed release and includes the existing navigation fix plus tutoring changes and required device-speech dependencies. Unrelated local registration, subscription, family-access, lesson-closure and interface redesign work is excluded. A pre-change snapshot preserves 113 existing modified/untracked files, and a byte comparison confirms all unrelated snapshot files remain unchanged. No Git push, production deployment, environment-variable change or database migration is part of this work.

## Limits and infrastructure

FILU is now an interactive curriculum tutor, with a deterministic implementation. It is not an unrestricted generative model: intent matching and lesson-text retrieval cannot reliably understand arbitrary paraphrases, generate novel explanations for every question, translate missing source material, or perform semantic grading of unrestricted answers. Those capabilities require a suitably governed model endpoint, which could be self-hosted open-source infrastructure. None has been added or billed.

The tutor adapts its help using existing authoritative learner state and short-lived practice attempts. Official progress changes continue to require the existing assessment/evidence flow; chat answers do not establish mastery. Persistent or cross-device conversation memory is not implemented and would require an approved storage/consent/retention design. Current chat lasts at most 30 minutes and is tied to the account session and current lesson.

Child safeguards restrict outputs to lesson materials and controlled teaching/safety responses. Input filters are rules, not comprehensive multilingual moderation or a safety certification. They cannot detect every disguised disclosure, harmful phrase or inappropriate authored passage. Broader deployment to children requires review of the authored materials and child-safety evaluation; automatic safeguarding alerts would additionally need an approved escalation service and human process. FILU does not contact adults or emergency services.

Read-aloud uses existing installed, local browser voices only. Availability, French/English voice coverage and accents depend on the device; no external voice service is introduced.

Safety design references: [UNICEF guidance on AI and children](https://www.unicef.org/innocenti/reports/policy-guidance-ai-children) and [UNICEF online privacy guidance](https://www.unicef.org/parenting/child-care/online-privacy). These support privacy minimization, transparent limitations and trusted-adult support; they do not certify this implementation.

Authenticated end-to-end functionality was validated locally with real application handlers and fictional in-memory records. Protected Preview verification checks the deployed pages, emitted interaction bundle, and rejection of anonymous tutoring requests. It does not create accounts or exercise private production/Preview learner records.

## Protected Preview result

[Open the protected Preview](https://filumire-learner-ijse07pc2-tabicrentsil-6879s-projects.vercel.app/dashboard?view=ask-filu&lang=en).

Deployment `dpl_8pVUMwGH8wAf3Sc2SmZMni4QrH9W` is READY in `filumire-learner`. Vercel Authentication remains enabled. The platform build completed successfully. Production was not deployed or promoted.

The existing authenticated Vercel connection verified HTTP 200 for `/login`, `/register` and the Ask FILU dashboard document. The deployed dashboard bundle contains the interactive question input, practice controls and topic-title handling; its shared client bundle contains the tutoring API transport. Anonymous context GET and tutoring POST both return 401. No application accounts or learner records were created on Preview during verification.

Release hashes and the exact 29-file deployment allowlist are recorded in `.vercel/filu-interactive-release.json`; Preview response evidence is in `.vercel/filu-preview-verification.json`; actual browser screenshots are in `.vercel/filu-actual-browser-verification/`. The release comparison verified 1,316 other committed files unchanged. The local-work comparison verified all 102 unrelated pre-existing modified/untracked files unchanged.

## Files changed for this evaluation

- `packages/ai/conversation.ts`, `conversation-safety.ts`, `curriculum-conversation.ts`: transport/practice types, bilingual safety responses and the actual local tutor.
- `services/edututor/conversation-api.ts`, `conversation-context.ts`: default provider, same-origin handling, signed practice/context isolation, bilingual teaching projection and safe metadata.
- `apps/learner/app/api/tutoring/conversation/route.ts`, `apps/learner/services/conversation-client.ts`: actual POST/GET route wiring, strict client validation and private pending-message handling.
- `apps/learner/components/filumire/FiluConversation.tsx`, `AskFiluPage.tsx`, `apps/learner/app/dashboard/page.tsx`: interaction, quick actions, retries, translated topic metadata and learner/competency scope.
- `tests/filu-functional.test.ts`, `filu-functional.browser.mjs`, and existing conversation API/identity/client tests: real-function tests and regressions updated for the implemented provider.
- This report and ignored local evidence/package artifacts.

The isolated release also integrates the required conversation-cleanup hooks into its committed account client and includes the existing device-speech dependencies. Its Ask-only progress correction is applied to the committed release without replacing the unrelated local interface work.
