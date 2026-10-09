import { GET } from "../apps/learner/app/api/adult/summary/route";
import { persistenceStore } from "../services/persistence-provider";
import {
  createPrincipalLearnerAccess,
  listAuthorizedLearnersForPrincipal,
  revokePrincipalLearnerAccess,
} from "../services/principal";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

async function run(): Promise<void> {
  const principalId = `principal-teacher-${crypto.randomUUID()}`;
  const learnerId = `learner-teacher-${crypto.randomUUID()}`;

  await persistenceStore.createPrincipal(principalId);
  await persistenceStore.ensureLearnerExists(learnerId);

  await createPrincipalLearnerAccess(
    `access-teacher-${crypto.randomUUID()}`,
    principalId,
    learnerId,
    "teacher",
  );

  const authorized =
    await listAuthorizedLearnersForPrincipal(principalId);

  assert(
    authorized.length === 1 &&
      authorized[0].learnerId === learnerId &&
      authorized[0].relationshipType === "teacher",
    "active teacher relationship must authorize the learner and preserve teacher role",
  );

  const response = await GET(
    new Request(
      `http://localhost/api/adult/summary?learnerId=${learnerId}`,
      {
        headers: {
          "x-filumire-principal-id": principalId,
        },
      },
    ),
  );

  assert(
    response.status === 200,
    `teacher must be able to read an authorized learner summary, got ${response.status}`,
  );

  const body = await response.json() as {
    learners: Array<{
      learnerId: string;
      relationshipType: string;
    }>;
  };

  assert(
    body.learners.some(
      (learner) =>
        learner.learnerId === learnerId &&
        learner.relationshipType === "teacher",
    ),
    "adult API must preserve teacher relationship type",
  );

  await revokePrincipalLearnerAccess(
    principalId,
    learnerId,
    "teacher",
  );

  const revoked =
    await listAuthorizedLearnersForPrincipal(principalId);

  assert(
    revoked.length === 0,
    "revoked teacher relationship must remove learner authorization",
  );

  console.log({
    teacherAuthorization: "PASS",
    persistence: process.env.FILUMIRE_PERSISTENCE ?? "memory",
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
