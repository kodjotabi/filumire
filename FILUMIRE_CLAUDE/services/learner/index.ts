import {
  persistenceStore,
} from "../persistence-provider";

export async function ensureLearnerExists(
  learnerId: string,
): Promise<void> {
  await persistenceStore.ensureLearnerExists(
    learnerId,
  );
}
