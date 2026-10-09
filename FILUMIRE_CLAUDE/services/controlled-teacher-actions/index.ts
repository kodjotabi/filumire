import { createHash } from "node:crypto";

import {
  persistenceStore,
} from "../persistence-provider";

import type {
  ControlledTeacherActionRecord,
  ControlledTeacherActionType,
} from "../persistence";

export const CONTROLLED_TEACHER_ACTIONS_VERSION =
  "controlled-teacher-actions-v1";

export interface CreateControlledTeacherActionInput {
  learnerId: string;
  competencyId: string;
  teacherPrincipalId: string;
  actionType: ControlledTeacherActionType;
  reason?: string;
  clientRequestId: string;
}

function createActionId(
  input: CreateControlledTeacherActionInput,
): string {
  const source = [
    input.teacherPrincipalId,
    input.learnerId,
    input.competencyId,
    input.clientRequestId,
  ].join("|");

  const digest = createHash("sha256")
    .update(source)
    .digest("hex")
    .slice(0, 32);

  return `teacher-action-${digest}`;
}

export async function createControlledTeacherAction(
  input: CreateControlledTeacherActionInput,
): Promise<{
  action: ControlledTeacherActionRecord;
  duplicate: boolean;
}> {
  const learnerId = input.learnerId.trim();
  const competencyId = input.competencyId.trim();
  const teacherPrincipalId =
    input.teacherPrincipalId.trim();
  const clientRequestId =
    input.clientRequestId.trim();
  const reason = input.reason?.trim();

  if (
    !learnerId ||
    !competencyId ||
    !teacherPrincipalId ||
    !clientRequestId
  ) {
    throw new Error(
      "Controlled teacher action requires learner, competency, teacher, and client request IDs.",
    );
  }

  const action: ControlledTeacherActionRecord = {
    id: createActionId({
      ...input,
      learnerId,
      competencyId,
      teacherPrincipalId,
      clientRequestId,
    }),
    learnerId,
    competencyId,
    teacherPrincipalId,
    actionType: input.actionType,
    reason: reason || undefined,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const inserted =
    await persistenceStore.saveControlledTeacherAction(
      action,
    );

  if (!inserted) {
    const existing =
      await persistenceStore.getControlledTeacherActions(
        learnerId,
        competencyId,
      );

    const duplicate = existing.find(
      (candidate) => candidate.id === action.id,
    );

    if (!duplicate) {
      throw new Error(
        "Controlled teacher action duplicate could not be retrieved.",
      );
    }

    return {
      action: duplicate,
      duplicate: true,
    };
  }

  return {
    action,
    duplicate: false,
  };
}

export async function getControlledTeacherActions(
  learnerId: string,
  competencyId?: string,
): Promise<ControlledTeacherActionRecord[]> {
  return persistenceStore.getControlledTeacherActions(
    learnerId,
    competencyId,
  );
}
