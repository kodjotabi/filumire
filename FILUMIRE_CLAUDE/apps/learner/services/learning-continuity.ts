import {
  fetchLearningSession, getSessionId, submitAssessmentResponse,
  isPendingTeacherReviewResponse, acknowledgeLearningStep, checkKnowledgeFirst, LearningRequestError, type LearningResponse,
} from "./learning-client";
import {
  readPendingSubmission, clearPendingSubmission,
  type PendingAssessmentSubmission,
} from "./pending-submission";

/** Only the latest request in a mounted screen may publish its result. */
export class LearningRequestOrder {
  private generation = 0;
  begin(): number { return ++this.generation; }
  accepts(ticket: number): boolean { return ticket === this.generation; }
  invalidate(): void { this.generation++; }
}

type SubmissionResponse = Awaited<ReturnType<typeof submitAssessmentResponse>>;
const submissions = new Map<string, Promise<SubmissionResponse>>();
const mutations = new Set<Promise<unknown>>();

function trackMutation<T>(request: Promise<T>): Promise<T> {
  mutations.add(request);
  void request.finally(() => mutations.delete(request)).catch(() => undefined);
  return request;
}

export function acknowledgeCurrentActivity(body: Parameters<typeof acknowledgeLearningStep>[0]) {
  return trackMutation(acknowledgeLearningStep(body));
}

export function checkKnowledgeFirstForActivity(body: Parameters<typeof checkKnowledgeFirst>[0]) {
  return trackMutation(checkKnowledgeFirst(body));
}

/** Navigation must not start a second copy of an answer still in flight. */
export function submitPendingAnswer(
  item: PendingAssessmentSubmission,
  submit = submitAssessmentResponse,
): Promise<SubmissionResponse> {
  const key = `${item.learnerId}:${item.sessionId}:${item.clientRequestId}`;
  const existing = submissions.get(key);
  if (existing) return existing;
  const request = trackMutation(Promise.resolve().then(() => submit(item)));
  submissions.set(key, request);
  void request.finally(() => {
    if (submissions.get(key) === request) submissions.delete(key);
  }).catch(() => undefined);
  return request;
}

export interface RestoredLearningActivity {
  data: LearningResponse;
  pending?: PendingAssessmentSubmission;
  submission?: SubmissionResponse;
  submittedAnswer?: PendingAssessmentSubmission;
  syncError?: unknown;
}

/** Restore identity first, reconcile its answer, then restore the current activity. */
async function restoreActivity(
  subjectId?: string,
  dependencies = {
    fetch: fetchLearningSession,
    readPending: readPendingSubmission,
    clearPending: clearPendingSubmission,
    submit: submitAssessmentResponse,
  },
  pendingInMemory?: PendingAssessmentSubmission,
  competencyId?: string,
): Promise<RestoredLearningActivity> {
  await Promise.allSettled([...mutations]);
  const current = await dependencies.fetch(subjectId, competencyId);
  const pending = pendingInMemory ?? dependencies.readPending();
  if (!pending || pending.learnerId !== current.learnerState.learnerId) {
    return { data: current };
  }
  // A returning login has a new session. The server still validates ownership,
  // curriculum and evidence; the original answer and idempotency key stay intact.
  const retry = { ...pending, sessionId: getSessionId(current) };
  let submission: SubmissionResponse;
  try {
    submission = await submitPendingAnswer(retry, dependencies.submit);
  } catch (syncError) {
    // Definitive validation/access failures must not trap the learner behind
    // an endlessly retried answer. Authentication expiry and rate limiting
    // remain retryable, as do network/server failures with uncertain commits.
    if (syncError instanceof LearningRequestError && syncError.status >= 400 && syncError.status < 500 && syncError.status !== 401 && syncError.status !== 429) {
      dependencies.clearPending(pending.clientRequestId);
      return { data: current, syncError };
    }
    return { data: current, pending, syncError };
  }
  dependencies.clearPending(pending.clientRequestId);
  try {
    return { data: await dependencies.fetch(subjectId, competencyId), submission, submittedAnswer: pending };
  } catch (syncError) {
    // A committed POST remains authoritative if the follow-up GET is offline.
    return {
      data: competencyId || isPendingTeacherReviewResponse(submission) ? current : submission,
      submission, submittedAnswer: pending, syncError,
    };
  }
}

// Serialize restoration across lesson/dashboard navigation. A superseded GET
// may still update server context; the newest restore must run after it.
let restoration: Promise<unknown> = Promise.resolve();
export function restoreLearningActivity(
  subjectId?: string,
  dependencies?: Parameters<typeof restoreActivity>[1],
  pendingInMemory?: PendingAssessmentSubmission,
  // Phase 2: a topic the learner chose from the topic list.
  competencyId?: string,
): Promise<RestoredLearningActivity> {
  const next = restoration.then(() => restoreActivity(subjectId, dependencies, pendingInMemory, competencyId));
  restoration = next.catch(() => undefined);
  return next;
}
