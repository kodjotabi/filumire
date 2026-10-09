import { createHash } from "node:crypto";

import {
  type PilotMeasurementEventRecord,
  type PilotMeasurementEventType,
} from "../persistence";

import { persistenceStore } from "../persistence-provider";

export const PILOT_MEASUREMENT_VERSION =
  "pilot-measurement-v1";

export interface RecordPilotMeasurementEventInput {
  learnerId: string;
  competencyId?: string;
  sessionId?: string;
  subjectId?: string;
  eventType: PilotMeasurementEventType;
  metadata?: Record<string, string | number | boolean | null>;
  clientRequestId: string;
}

function createEventId(
  input: RecordPilotMeasurementEventInput,
): string {
  const digest = createHash("sha256")
    .update(
      [
        input.learnerId,
        input.competencyId ?? "",
        input.sessionId ?? "",
        input.eventType,
        input.clientRequestId,
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 32);

  return `pilot-event-${digest}`;
}

export async function recordPilotMeasurementEvent(
  input: RecordPilotMeasurementEventInput,
): Promise<{
  event: PilotMeasurementEventRecord;
  duplicate: boolean;
}> {
  const learnerId = input.learnerId.trim();
  const clientRequestId =
    input.clientRequestId.trim();

  if (!learnerId || !clientRequestId) {
    throw new Error(
      "learnerId and clientRequestId are required.",
    );
  }

  const event: PilotMeasurementEventRecord = {
    id: createEventId(input),
    learnerId,
    competencyId: input.competencyId?.trim() || undefined,
    sessionId: input.sessionId?.trim() || undefined,
    subjectId: input.subjectId?.trim() || undefined,
    eventType: input.eventType,
    metadata: input.metadata ?? {},
    measurementVersion: PILOT_MEASUREMENT_VERSION,
    createdAt: new Date().toISOString(),
  };

  const persistence = persistenceStore;

  const inserted =
    await persistence.savePilotMeasurementEvent(
      event,
    );

  return {
    event,
    duplicate: !inserted,
  };
}

export async function getPilotMeasurementEvents(
  learnerId: string,
): Promise<PilotMeasurementEventRecord[]> {
  return persistenceStore.getPilotMeasurementEvents(
    learnerId,
  );
}

