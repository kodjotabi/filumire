import assert from "node:assert/strict";

import {
  createControlledTeacherAction,
  getControlledTeacherActions,
} from "../services/controlled-teacher-actions";

import {
  getLearnerState,
} from "../services/learner-state";

async function run(): Promise<void> {
  const learnerId =
    `teacher-action-test-${Date.now()}`;

  const competencyId =
    "B4-MATH-CONTROLLED-ACTION";

  const teacherPrincipalId =
    "teacher-controlled-action-test";

  const before = await getLearnerState(
    learnerId,
    competencyId,
  );

  const first =
    await createControlledTeacherAction({
      learnerId,
      competencyId,
      teacherPrincipalId,
      actionType: "request_practice",
      reason:
        "Learner would benefit from additional practice.",
      clientRequestId: "request-001",
    });

  assert.equal(first.duplicate, false);
  assert.equal(
    first.action.actionType,
    "request_practice",
  );
  assert.equal(first.action.status, "pending");
  assert.equal(
    first.action.teacherPrincipalId,
    teacherPrincipalId,
  );

  const second =
    await createControlledTeacherAction({
      learnerId,
      competencyId,
      teacherPrincipalId,
      actionType: "request_practice",
      reason:
        "Learner would benefit from additional practice.",
      clientRequestId: "request-001",
    });

  assert.equal(second.duplicate, true);
  assert.equal(second.action.id, first.action.id);

  const actions =
    await getControlledTeacherActions(
      learnerId,
      competencyId,
    );

  assert.equal(actions.length, 1);
  assert.equal(actions[0].id, first.action.id);

  const after = await getLearnerState(
    learnerId,
    competencyId,
  );

  assert.deepEqual(after, before);

  console.log({
    controlledTeacherActionsV1: "PASS",
    persisted: actions.length,
    duplicateProtected: second.duplicate,
    status: actions[0].status,
    learnerStateMutated:
      JSON.stringify(before) !==
      JSON.stringify(after),
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
