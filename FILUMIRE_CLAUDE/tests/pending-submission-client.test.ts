export {};

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key)
      ? this.store.get(key)!
      : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

(globalThis as unknown as { window: unknown }).window = {
  localStorage: new MemoryStorage(),
};

async function runPendingSubmissionClientTest(): Promise<void> {
  const {
    clearPendingSubmission,
    readPendingSubmission,
    writePendingSubmission,
  } = await import(
    "../apps/learner/services/pending-submission"
  );

  // 1. No pending submission by default.
  assert(
    readPendingSubmission() === null,
    "no pending submission should exist initially",
  );

  // 2. A written pending submission round-trips exactly.
  const item = {
    clientRequestId: "abc-123",
    learnerId: "learner-client-test",
    sessionId: "session-client-test",
    competencyId: "competency-test-001",
    assessmentItemId: "item-number-sequence-diagnostic-001-en",
    response: "8",
    queuedAt: new Date().toISOString(),
  };

  writePendingSubmission(item);

  const stored = readPendingSubmission();

  assert(
    stored !== null &&
      stored.clientRequestId === item.clientRequestId &&
      stored.response === item.response,
    "a written pending submission must be read back exactly",
  );

  console.log({
    test: "pending submission round-trips locally",
    result: "PASS",
  });

  // 3. Clearing removes it.
  clearPendingSubmission();

  assert(
    readPendingSubmission() === null,
    "clearing must remove the pending submission",
  );

  console.log({
    test: "pending submission clears after synchronization",
    result: "PASS",
  });

  // 4. Malformed/stale stored data fails safely rather than
  // throwing or resurrecting invalid state.
  const win = (
    globalThis as unknown as {
      window: { localStorage: MemoryStorage };
    }
  ).window;

  win.localStorage.setItem(
    "filumire.pendingAssessmentSubmission",
    "{not valid json",
  );

  assert(
    readPendingSubmission() === null,
    "malformed stored JSON must fail safely and return null",
  );

  win.localStorage.setItem(
    "filumire.pendingAssessmentSubmission",
    JSON.stringify({ response: "8" }),
  );

  assert(
    readPendingSubmission() === null,
    "an incomplete stored submission must fail safely and return null",
  );

  console.log({
    test: "malformed/stale pending submission fails safely",
    result: "PASS",
  });

  console.log({ pendingSubmissionClientTest: "PASS" });
}

runPendingSubmissionClientTest().catch((error) => {
  console.error(error);
  process.exit(1);
});
