import assert from "node:assert/strict";
import { NextRequest } from "next/server";

import {
  persistenceStore,
} from "../services/persistence-provider";

import {
  POST,
  GET,
} from "../apps/learner/app/api/parent/messages/route";

import {
  createPrincipalLearnerAccess,
} from "../services/principal";

import {
  getLearnerState,
} from "../services/learner-state";

function postRequest(
  principalId: string,
  body: object,
): NextRequest {
  return new NextRequest(
    "http://localhost/api/parent/messages",
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

function getRequest(
  principalId: string,
  learnerId: string,
): NextRequest {
  return new NextRequest(
    `http://localhost/api/parent/messages?learnerId=${encodeURIComponent(learnerId)}`,
    {
      method: "GET",
      headers: {
        "x-filumire-principal-id":
          principalId,
      },
    },
  );
}

async function run(): Promise<void> {
  const stamp = crypto.randomUUID();

  const guardianId =
    `guardian-message-api-${stamp}`;

  const unauthorizedId =
    `unauthorized-message-api-${stamp}`;

  const learnerId =
    `learner-message-api-${stamp}`;

  const competencyId =
    "B4-PARENT-COMMUNICATION-BOUNDARY";

  await persistenceStore.createPrincipal(
    guardianId,
  );

  await persistenceStore.createPrincipal(
    unauthorizedId,
  );

  await persistenceStore.ensureLearnerExists(
    learnerId,
  );

  await createPrincipalLearnerAccess(
    `access-guardian-message-${stamp}`,
    guardianId,
    learnerId,
    "guardian",
  );

  const before = await getLearnerState(
    learnerId,
    competencyId,
  );

  const body = {
    learnerId,
    text:
      "We practised this at home and would like the teacher to know.",
    clientRequestId:
      "parent-message-request-001",
  };

  const allowedResponse = await POST(
    postRequest(guardianId, body),
  );

  assert.equal(
    allowedResponse.status,
    201,
  );

  const allowed =
    await allowedResponse.json();

  assert.equal(
    allowed.duplicate,
    false,
  );

  assert.equal(
    allowed.message.authorPrincipalId,
    guardianId,
  );

  assert.equal(
    allowed.message.senderRole,
    "guardian",
  );

  const duplicateResponse = await POST(
    postRequest(guardianId, body),
  );

  assert.equal(
    duplicateResponse.status,
    200,
  );

  const duplicate =
    await duplicateResponse.json();

  assert.equal(
    duplicate.duplicate,
    true,
  );

  assert.equal(
    duplicate.message.id,
    allowed.message.id,
  );

  const deniedResponse = await POST(
    postRequest(
      unauthorizedId,
      {
        ...body,
        clientRequestId:
          "unauthorized-parent-message-001",
      },
    ),
  );

  assert.equal(
    deniedResponse.status,
    403,
  );

  const listResponse = await GET(
    getRequest(
      guardianId,
      learnerId,
    ),
  );

  assert.equal(
    listResponse.status,
    200,
  );

  const list =
    await listResponse.json();

  assert.equal(
    list.learnerId,
    learnerId,
  );

  assert.equal(
    list.messages.length,
    1,
  );

  assert.equal(
    list.messages[0].id,
    allowed.message.id,
  );

  const after = await getLearnerState(
    learnerId,
    competencyId,
  );

  assert.deepEqual(
    after,
    before,
  );

  console.log({
    parentTeacherCommunicationV1:
      "PASS",
    authorizedGuardian: true,
    unauthorizedDenied:
      deniedResponse.status === 403,
    duplicateProtected:
      duplicate.duplicate,
    persistedMessages:
      list.messages.length,
    learnerStateMutated:
      JSON.stringify(before) !==
      JSON.stringify(after),
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
