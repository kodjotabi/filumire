# Learner-facing spaced revision: Basic 4 Mathematics

This local slice uses the existing learner path, adaptive engine, learner state,
authored assessments and atomic evidence pipeline. No schema, migration, provider
or deployment changes are needed.

## Existing capability and the interface gap

The learner path already derives retention due dates from `masteredAt`,
`retentionState.lastCheckedAt` and retention success counts. Its default initial
gap is 24 hours; confirmed retention uses seven-day and then thirty-day reviews.
The retention evaluator and learner-state update already keep retention evidence
separate from mastery. The learning API already scores server-owned answers,
records evidence atomically and supports retryable submissions. Time-aware
selection existed behind an opt-in, while Challenges only linked normal learning
and achievements. It exposed neither due reviews nor upcoming dates.

## Completed behavior

- The overview now includes a read-only revision summary for Basic 4 Mathematics.
  Challenges shows due-topic counts, the next scheduled date, and a localized
  start/continue action. New learners see an honest empty state. Other grades
  retain their existing experience.
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

This is an initial subject/grade slice, with due-time computation on request;
there is no background scheduler or reminder delivery. Active topic completion
may postpone revision, deliberately. Existing cumulative retention-confidence and
spacing policies are reused; this change does not validate their educational
effectiveness or replace them with a new model. As elsewhere in the application,
the interval lasts from the latest accepted evidence, using the server clock.

Next, review the pilot's incorrect-answer recovery and due-topic explanations with
learners, then extend the same experience to another grade/subject only after its
authored assessments and language coverage pass the same checks. Live PostgreSQL
behavior, physical devices and other browsers remain separately unverified. The
existing migration-0023/deployment-verifier release blocker is unchanged.
