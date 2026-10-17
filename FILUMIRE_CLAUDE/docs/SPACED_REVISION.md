# Learner-facing spaced revision

This uses the existing learner path, adaptive engine, learner state,
authored assessments and atomic evidence pipeline. No schema, migration, provider
or deployment changes are needed.

## Scope: every supported grade and subject (October 2026)

Spaced revision began as a Basic 4 Mathematics slice (described below). It now
covers every subject of every supported grade (Basic 4–6 English, Mathematics,
Science and Computing: 12 paths). Before this, the other 11 paths gave a
"retention" check minutes after mastery, which measured short-term memory, and
never scheduled or offered a later review.

- `subjectSupportsSpacedRevision(subjectId, gradeId)` in
  `services/learner-path/revision.ts` turns spaced revision on for a subject only
  when the framework lists it for that grade and every topic of that subject
  and grade has an authored, automatically scored retention question in both
  English and French. All 12 paths pass today. A future subject without that
  coverage keeps immediate retention checks instead of offering untranslated or
  teacher-scored reviews. No curriculum or content was added.
- The overview returns `revisions` (one summary per subject of the stored grade)
  and `revision` (the card's lead: due work in the active subject, otherwise the
  first subject with due reviews). Each subject is judged from the topic its
  learning screen opens on (`getCurrentCompetencyForSubject`), so "can start"
  matches what the engine delivers. The Challenges card names the subject and
  grade and links to other subjects with due reviews ("Also due").
- A review in a subject other than the active one does not move the active topic.
  After answering it, the learner continues along that subject's own path.
- The teacher summary marks a prerequisite repair as completed by the same
  time-aware rule the engine used to send the learner back.

`tests/spaced-revision-subjects.test.ts` (part of `npm run test:revision`) covers
all 12 paths. It checks the bilingual coverage gate and EN/FR delivery. It also
checks that the learner returns to their current topic, that the next review is
scheduled, and that retention is deferred straight after learning. Cross-subject
reviews, the teacher repair status, learner ownership and the grade lock are
covered too. The browser revision journeys also run Basic 5 Science (French,
320px) and Basic 6 Computing (English, 1280px).

## Existing capability and the interface gap

The learner path already derives retention due dates from `masteredAt`,
`retentionState.lastCheckedAt` and retention success counts. Its default initial
gap is 24 hours; confirmed retention uses seven-day and then thirty-day reviews.
The retention evaluator and learner-state update already keep retention evidence
separate from mastery. The learning API already scores server-owned answers,
records evidence atomically and supports retryable submissions. Time-aware
selection existed behind an opt-in, while Challenges only linked normal learning
and achievements. It exposed neither due reviews nor upcoming dates.

### Known offline failures outside this work

Running every offline suite through `scripts/run-offline-suites.mjs`, 168 of 170 pass.
The same two fail identically on unchanged HEAD `6c352270` (clean worktree, same
runner, 17 October 2026). They are not caused by spaced revision and were left
unfixed:

- `b4-english-adaptive-coverage`: `ENOENT` for
  `docs/curriculum-sources/ghana/2019/ENGLISH-B4-indicators-authoritative.txt`,
  which is not in the repository (no tracked files under `docs/curriculum-sources`).
- `learner-journey-route-4h`: six journeys (Basic 5 and Basic 6 English, the last
  subjects swept) fail `session issuance 201 (429)` because the suite exceeds
  the session-issue rate limit. Every other check passes, including the teacher
  repair-status check, whose test now uses the engine's time-aware completion rule.

## Completed behavior (original Basic 4 Mathematics slice)

- The overview now includes a read-only revision summary for Basic 4 Mathematics.
  Challenges shows due-topic counts, the next scheduled date, and a localized
  start/continue action. New learners see an honest empty state. (Other grades
  and subjects now have the same experience; see Scope above.)
- The learning API opts this subject into existing time-aware selection. A due
  review starts at a natural topic boundary, without pre-empting unanswered
  questions or acknowledged instruction awaiting its check on the current topic.
  Activities left open on topics the learner has moved away from are kept, but
  no longer hold back reviews. While a topic is still developing, Challenges
  asks the learner to continue that topic first.
- A review does not change the learner's current topic; after answering, the
  learner continues from that topic, in the language of the page.
- Selection can find reviews in separate learner-state records. The returned
  state, content and decision all focus on the same reviewed competency.
  Refresh resumes the existing retention intervention.
- The existing learning screen presents an authored EN/FR retention question;
  all 67 supported Basic 4 Mathematics topics have authored, automatically scored
  retention content in both languages. Expected answers stay on the server.
- A review requires a matching learner-owned retention intervention and a real
  recorded delivery of that item. One canonical evidence key per intervention
  prevents double scoring across retry keys/tabs; the existing atomic persistence
  operation arbitrates concurrent submissions. Duplicate feedback uses the
  original persisted outcome, even if a retry changes its answer.
- Success updates retention and its next due date through the existing pipeline,
  then returns the normal adaptive learning response for the current topic. An incorrect answer enters
  existing forgotten-knowledge support and schedules a later retention check;
  it does not manufacture mastery or count as successful retention.
- Stored grade, guardian attribution, authorized learner identity and session
  ownership remain authoritative. The revision card cannot select another grade
  or another learner.

## Local checks and browser reproduction

`npm run test:revision` is included in `npm test`. It covers due/not-due timing,
EN/FR delivery, separate state records, refresh, concurrent retries with different
keys, duplicate feedback, incorrect answers, normal progression, undelivered-item
rejection, active activities, guardian locks and ownership. PostgreSQL calls are
stubbed to throw. Existing time-aware engine scenarios now use independent
learner identities so their unanswered interventions cannot contaminate each other.

Use `npm run test:grade-navigation:browser -- --revision` with the existing
installed-browser configuration described in `BROWSER_RUNNER_PORTABILITY.md`.
It builds a fresh isolated snapshot, runs the existing eight-journey matrix and
adds returning-learner revision journeys in EN/FR at 320 and 1280 pixels. A
test-only server preload seeds fictional accounts and old evidence into the
shared memory store before startup. It is never imported by application code,
does not add a seeding endpoint, and refuses a non-isolated configuration.
PostgreSQL blocking, loopback-only traffic and new evidence directories remain
enforced. The new screenshots/results use `revision-*` names in the fresh output.

## Boundaries and next development step

Due times are computed on request; there is no background scheduler or reminder
delivery. Active topic completion
may postpone revision, deliberately. Existing cumulative retention-confidence and
spacing policies are reused; this change does not validate their educational
effectiveness or replace them with a new model. As elsewhere in the application,
the interval lasts from the latest accepted evidence, using the server clock.

Next, review the pilot's incorrect-answer recovery and due-topic explanations with
learners. The coverage gate keeps any future subject on immediate checks until
its authored assessments and language coverage pass the same checks. Live PostgreSQL
behavior, physical devices and other browsers remain separately unverified. The
existing migration-0023/deployment-verifier release blocker is unchanged.
