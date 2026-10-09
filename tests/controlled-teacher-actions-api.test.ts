import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { persistenceStore } from "../services/persistence-provider";

import {
  POST,
} from "../apps/learner/app/api/teacher/actions/route";

import {
  createPrincipalLearnerAccess,
} from "../services/principal";

import {
  getLearnerState,
} from "../services/learner-state";

function request(
  principalId: string,
  body: object,
): NextRequest {
  return new NextRequest(
    "http://localhost/api/teacher/actions",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-filumire-principal-id":
          principalId,
      },
      body: JSON.stringify(body),
    },
  );
}

async function run(): Promise<void> {
  const stamp = crypto.randomUUID();

  const teacherId =
    `teacher-action-api-${stamp}`;

  const unauthorizedId =
    `unauthorized-action-api-${stamp}`;

  const learnerId =
    `learner-action-api-${stamp}`;

  const competencyId =
    "B4-MATH-CONTROLLED-ACTION-API";

  await persistenceStore.createPrincipal(
    teacherId,
  );

  await persistenceStore.createPrincipal(
    unauthorizedId,
  );

  await persistenceStore.ensureLearnerExists(
    learnerId,
  );

  await createPrincipalLearnerAccess(
    `access-teacher-action-${stamp}`,
    teacherId,
    learnerId,
    "teacher",
  );

  const before = await getLearnerState(
    learnerId,
    competencyId,
  );

  const body = {
    learnerId,
    competencyId,
    actionType: "request_reassessment",
    reason: "Fresh evidence requested.",
    clientRequestId: "api-request-001",
  };

  const allowedResponse = await POST(
    request(teacherId, body),
  );

  assert.equal(
    allowedResponse.status,
    200,
  );

  const allowed =
    await allowedResponse.json();

  assert.equal(allowed.duplicate, false);
  assert.equal(
    allowed.action.teacherPrincipalId,
    teacherId,
  );
  assert.equal(
    allowed.action.actionType,
    "request_reassessment",
  );
  assert.equal(
    allowed.action.status,
    "pending",
  );

  const duplicateResponse = await POST(
    request(teacherId, body),
  );

  assert.equal(
    duplicateResponse.status,
    200,
  );

  const duplicate =
    await duplicateResponse.json();

  assert.equal(duplicate.duplicate, true);
  assert.equal(
    duplicate.action.id,
    allowed.action.id,
  );

  const deniedResponse = await POST(
    request(unauthorizedId, {
      ...body,
      clientRequestId:
        "unauthorized-request-001",
    }),
  );

  assert.equal(
    deniedResponse.status,
    403,
  );

  const after = await getLearnerState(
    learnerId,
    competencyId,
  );

  assert.deepEqual(after, before);

  console.log({
    controlledTeacherActionsApiV1:
      "PASS",
    authorizedTeacher: true,
    unauthorizedDenied:
      deniedResponse.status === 403,
    duplicateProtected:
      duplicate.duplicate,
    learnerStateMutated:
      JSON.stringify(before) !==
      JSON.stringify(after),
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});


