import { db } from "./services/database.ts";
import { sql } from "drizzle-orm";
import { GET } from "./apps/learner/app/api/learning/route.ts";

const learnerId =
  `learner-runtime-${Date.now()}`;

const sessionId =
  `session-runtime-${Date.now()}`;

const request = new Request(
  `http://localhost/api/learning?sessionId=${sessionId}`,
  {
    headers: {
      "x-filumire-learner-id":
        learnerId,
    },
  },
);

const response = await GET(request);

const body = await response.json();

console.log({
  status: response.status,
  learnerId:
    body.learnerState?.learnerId,
  action:
    body.decision?.action,
  competency:
    body.decision?.competencyId,
  contentType:
    body.content?.type,
  contentTitle:
    body.content?.title,
  instruction:
    Boolean(body.instruction?.content),
});

const persisted = await db.execute(
  sql`
    SELECT
      learner_id,
      competency_id,
      evidence_count,
      mastery_estimate,
      confidence
    FROM learner_states
    WHERE learner_id = ${learnerId};
  `,
);

console.log({
  persistedLearnerState:
    persisted.rows,
  result:
    response.status === 200 &&
    body.learnerState?.learnerId ===
      learnerId &&
    body.content &&
    body.instruction?.content &&
    persisted.rows.length > 0
      ? "PASS"
      : "FAIL",
});

process.exit(
  response.status === 200 &&
  body.learnerState?.learnerId ===
    learnerId &&
  body.content &&
  body.instruction?.content &&
  persisted.rows.length > 0
    ? 0
    : 1,
);