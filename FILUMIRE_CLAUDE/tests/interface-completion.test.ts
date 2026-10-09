import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";

import {
  persistenceStore,
} from "../services/persistence-provider";

import {
  createPrincipalLearnerAccess,
  getPrincipalLearnerAccess,
} from "../services/principal";

import {
  DEVELOPMENT_LEARNER_ID,
  DEVELOPMENT_PRINCIPAL_ID,
  ensureDevelopmentAdultAccess,
} from "../services/development-fixtures";

import {
  GET as teacherMessagesGet,
  POST as teacherMessagesPost,
} from "../apps/learner/app/api/teacher/messages/route";

import {
  GET as parentMessagesGet,
  POST as parentMessagesPost,
} from "../apps/learner/app/api/parent/messages/route";

/*
 * Interface completion (9 October): development parent/teacher
 * fixture, teacher side of the parent-teacher thread, and the
 * client/page guards that keep placeholder features honest.
 */

const root = path.resolve(import.meta.dirname, "..");

function request(
  url: string,
  principalId: string | undefined,
  body?: object,
): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (principalId) {
    headers["x-filumire-principal-id"] = principalId;
  }

  return new NextRequest(`http://localhost${url}`, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function setNodeEnv(value: string): () => void {
  const env = process.env as Record<string, string | undefined>;
  const previous = env.NODE_ENV;
  env.NODE_ENV = value;
  return () => {
    env.NODE_ENV = previous;
  };
}

async function fixtureChecks(): Promise<void> {
  // Production: the fixture never links anything.
  const restore = setNodeEnv("production");
  try {
    await ensureDevelopmentAdultAccess(DEVELOPMENT_PRINCIPAL_ID);
  } finally {
    restore();
  }

  assert.equal(
    await getPrincipalLearnerAccess(
      DEVELOPMENT_PRINCIPAL_ID,
      DEVELOPMENT_LEARNER_ID,
      "guardian",
    ),
    undefined,
    "fixture must not run in production",
  );

  // Other principals are never linked.
  await ensureDevelopmentAdultAccess("principal-someone-else");
  assert.equal(
    (await persistenceStore.listLearnersForPrincipal(
      "principal-someone-else",
    )).length,
    0,
  );

  // Development + memory: guardian and teacher links, idempotent.
  await ensureDevelopmentAdultAccess(DEVELOPMENT_PRINCIPAL_ID);
  await ensureDevelopmentAdultAccess(DEVELOPMENT_PRINCIPAL_ID);

  for (const relationship of ["guardian", "teacher"] as const) {
    const access = await getPrincipalLearnerAccess(
      DEVELOPMENT_PRINCIPAL_ID,
      DEVELOPMENT_LEARNER_ID,
      relationship,
    );
    assert.equal(access?.status, "active", `${relationship} link`);
  }
}

async function teacherThreadChecks(): Promise<void> {
  const stamp = crypto.randomUUID();
  const teacherId = `teacher-thread-${stamp}`;
  const guardianId = `guardian-thread-${stamp}`;
  const outsiderId = `outsider-thread-${stamp}`;
  const learnerId = `learner-thread-${stamp}`;

  for (const id of [teacherId, guardianId, outsiderId]) {
    await persistenceStore.createPrincipal(id);
  }
  await persistenceStore.ensureLearnerExists(learnerId);
  await createPrincipalLearnerAccess(
    `access-${stamp}-t`, teacherId, learnerId, "teacher",
  );
  await createPrincipalLearnerAccess(
    `access-${stamp}-g`, guardianId, learnerId, "guardian",
  );

  const url = `/api/teacher/messages?learnerId=${learnerId}`;

  // Production: development headers are ignored and a missing session is
  // 401 (was 500 because "Unauthenticated ..." was not mapped).
  const restoreEnv = setNodeEnv("production");
  try {
    assert.equal((await teacherMessagesGet(request(url, teacherId))).status, 401);
    assert.equal(
      (await parentMessagesGet(
        request(`/api/parent/messages?learnerId=${learnerId}`, guardianId),
      )).status,
      401,
    );
    assert.equal(
      (await teacherMessagesPost(
        request("/api/teacher/messages", teacherId, {
          learnerId, text: "x", clientRequestId: "prod",
        }),
      )).status,
      401,
    );
  } finally {
    restoreEnv();
  }

  assert.equal((await teacherMessagesGet(request(url, undefined))).status, 401);
  assert.equal((await teacherMessagesGet(request(url, outsiderId))).status, 403);
  // A guardian cannot use the teacher route, nor a teacher the parent route.
  assert.equal((await teacherMessagesGet(request(url, guardianId))).status, 403);
  assert.equal(
    (await parentMessagesGet(
      request(`/api/parent/messages?learnerId=${learnerId}`, teacherId),
    )).status,
    403,
  );
  assert.equal(
    (await teacherMessagesGet(request("/api/teacher/messages", teacherId))).status,
    400,
  );
  assert.equal(
    (await teacherMessagesPost(
      request("/api/teacher/messages", outsiderId, {
        learnerId, text: "x", clientRequestId: "a",
      }),
    )).status,
    403,
  );

  // Parent writes, teacher reads and replies, parent reads the reply.
  assert.equal(
    (await parentMessagesPost(
      request("/api/parent/messages", guardianId, {
        learnerId, text: "Practised at home.", clientRequestId: "p1",
      }),
    )).status,
    201,
  );

  const reply = await teacherMessagesPost(
    request("/api/teacher/messages", teacherId, {
      learnerId, text: "Thank you.", clientRequestId: "t1",
    }),
  );
  assert.equal(reply.status, 201);
  assert.equal((await reply.json()).message.senderRole, "teacher");

  const duplicate = await teacherMessagesPost(
    request("/api/teacher/messages", teacherId, {
      learnerId, text: "Thank you.", clientRequestId: "t1",
    }),
  );
  assert.equal(duplicate.status, 200, "same clientRequestId is idempotent");

  const teacherView = await (
    await teacherMessagesGet(request(url, teacherId))
  ).json();
  assert.deepEqual(
    teacherView.messages.map((m: { senderRole: string }) => m.senderRole).sort(),
    ["guardian", "teacher"],
  );

  const parentView = await (
    await parentMessagesGet(
      request(`/api/parent/messages?learnerId=${learnerId}`, guardianId),
    )
  ).json();
  assert.equal(parentView.messages.length, 2);
}

function sourceChecks(): void {
  const read = (file: string) =>
    fs.readFileSync(path.join(root, file), "utf8");

  const teacherClient = read("services/teacher-client.ts");
  assert.match(teacherClient, /process\.env\.NODE_ENV !== "production"/);
  assert.doesNotMatch(
    teacherClient,
    /headers: \{\s*"content-type": "application\/json",\s*\},/,
    "every teacher request goes through teacherHeaders()",
  );

  const login = read("apps/learner/app/login/page.tsx");
  assert.match(login, /Sign-in is not connected yet/);
  assert.match(login, /const LOCAL_TESTING = process\.env\.NODE_ENV !== "production"/);
  assert.match(login, /\.loginPage \.filumireBottomNav \{ position: static;/);

  const profile = read("apps/learner/components/filumire/ProfilePage.tsx");
  assert.match(profile, /\/api\/session\/logout/);
  assert.doesNotMatch(profile, /role="switch"/, "no fake notification switch");

  const learn = read("apps/learner/app/learn/page.tsx");
  assert.match(learn, /hasAssessment \|\| element\.type !== "next_prompt"/);

  const progress = read("apps/learner/components/filumire/ProgressPage.tsx");
  assert.match(progress, /\.filter\(\(row\) => row\.done > 0\)/);
}

async function run(): Promise<void> {
  await fixtureChecks();
  await teacherThreadChecks();
  sourceChecks();
  console.log("interface completion test passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
