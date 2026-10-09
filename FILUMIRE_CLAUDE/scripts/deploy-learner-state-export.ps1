$ErrorActionPreference = "Stop"

$Root = "C:\Users\tabi\Desktop\filumire\FILUMIRE_CORE"

New-Item -ItemType Directory -Force "$Root\scripts" | Out-Null

@'
import type { LearnerState } from "../../packages/domain";

import {
  persistenceStore,
} from "../persistence-provider";

export async function getLearnerState(
  learnerId: string,
  competencyId: string,
): Promise<LearnerState | undefined> {
  return persistenceStore.getLearnerState(
    learnerId,
    competencyId,
  );
}

export async function saveLearnerState(
  state: LearnerState,
): Promise<void> {
  await persistenceStore.saveLearnerState(
    state,
  );
}
'@ | Set-Content `
  "$Root\services\learner-state\index.ts" `
  -Encoding UTF8

Write-Host ""
Write-Host "Learner-state exports restored."
Write-Host ""
Write-Host "Run:"
Write-Host "npx tsx --env-file=.env.local ./tests/retention-transfer.test.ts"