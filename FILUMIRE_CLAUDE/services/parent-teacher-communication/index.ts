import { createHash } from "node:crypto";

import type {
  ParentTeacherMessageRecord,
  ParentTeacherMessageSenderRole,
} from "../persistence";

import {
  persistenceStore,
} from "../persistence-provider";

export interface CreateParentTeacherMessageInput {
  learnerId: string;
  authorPrincipalId: string;
  senderRole: ParentTeacherMessageSenderRole;
  text: string;
  clientRequestId: string;
}

export interface CreateParentTeacherMessageResult {
  message: ParentTeacherMessageRecord;
  duplicate: boolean;
}

function requireValue(
  value: string,
  field: string,
): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${field} is required`);
  }

  return trimmed;
}

function buildMessageId(
  input: CreateParentTeacherMessageInput,
): string {
  const value = [
    input.authorPrincipalId,
    input.learnerId,
    input.clientRequestId,
  ].join("|");

  return `parent-teacher-message-${createHash("sha256")
    .update(value)
    .digest("hex")
    .slice(0, 32)}`;
}

export async function createParentTeacherMessage(
  input: CreateParentTeacherMessageInput,
): Promise<CreateParentTeacherMessageResult> {
  const learnerId = requireValue(
    input.learnerId,
    "learnerId",
  );
  const authorPrincipalId = requireValue(
    input.authorPrincipalId,
    "authorPrincipalId",
  );
  const clientRequestId = requireValue(
    input.clientRequestId,
    "clientRequestId",
  );
  const text = requireValue(
    input.text,
    "text",
  );

  if (
    input.senderRole !== "guardian" &&
    input.senderRole !== "teacher"
  ) {
    throw new Error("senderRole is invalid");
  }

  const id = buildMessageId({
    ...input,
    learnerId,
    authorPrincipalId,
    clientRequestId,
    text,
  });

  const persistence = persistenceStore;

  const message: ParentTeacherMessageRecord = {
    id,
    learnerId,
    authorPrincipalId,
    senderRole: input.senderRole,
    text,
    createdAt: new Date().toISOString(),
  };

  const saved =
    await persistence.saveParentTeacherMessage(
      message,
    );

  if (saved) {
    return {
      message,
      duplicate: false,
    };
  }

  const existing =
    await persistence.getParentTeacherMessages(
      learnerId,
    );

  const duplicate = existing.find(
    (item) => item.id === id,
  );

  if (!duplicate) {
    throw new Error(
      "Parent-teacher message duplicate could not be resolved",
    );
  }

  return {
    message: duplicate,
    duplicate: true,
  };
}

export async function getParentTeacherMessages(
  learnerId: string,
): Promise<ParentTeacherMessageRecord[]> {
  return persistenceStore.getParentTeacherMessages(
    requireValue(learnerId, "learnerId"),
  );
}

