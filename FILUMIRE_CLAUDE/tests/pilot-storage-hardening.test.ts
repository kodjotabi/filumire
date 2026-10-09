export {};

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

class ThrowingStorage {
  getItem(): string | null {
    throw new Error("SecurityError: storage disabled");
  }

  setItem(): void {
    throw new Error("QuotaExceededError: storage full");
  }

  removeItem(): void {
    throw new Error("SecurityError: storage disabled");
  }
}

(globalThis as unknown as { window: unknown }).window = {
  get localStorage(): ThrowingStorage {
    throw new Error(
      "SecurityError: localStorage is not accessible in this context",
    );
  },
};

async function runStorageHardeningTest(): Promise<void> {
  const {
    clearPendingSubmission,
    readPendingSubmission,
    writePendingSubmission,
  } = await import(
    "../apps/learner/services/pending-submission"
  );

  // A browser context where merely accessing localStorage
  // throws (private-mode/disabled-storage) must never crash
  // the learner page; every operation must fail safe.
  let readThrew = false;

  try {
    assert(
      readPendingSubmission() === null,
      "reading with inaccessible storage must return null, not throw",
    );
  } catch {
    readThrew = true;
  }

  assert(
    !readThrew,
    "readPendingSubmission must not throw when storage access itself throws",
  );

  let writeThrew = false;

  try {
    writePendingSubmission({
      clientRequestId: "x",
      learnerId: "learner-storage-test",
      sessionId: "session-storage-test",
      competencyId: "competency-test-001",
      assessmentItemId: "item-number-sequence-diagnostic-001-en",
      response: "8",
      queuedAt: new Date().toISOString(),
    });
  } catch {
    writeThrew = true;
  }

  assert(
    !writeThrew,
    "writePendingSubmission must not throw when storage access itself throws",
  );

  let clearThrew = false;

  try {
    clearPendingSubmission();
  } catch {
    clearThrew = true;
  }

  assert(
    !clearThrew,
    "clearPendingSubmission must not throw when storage access itself throws",
  );

  console.log({
    test: "inaccessible/throwing localStorage fails safe",
    result: "PASS",
  });

  console.log({ storageHardeningTest: "PASS" });
}

runStorageHardeningTest().catch((error) => {
  console.error(error);
  process.exit(1);
});
