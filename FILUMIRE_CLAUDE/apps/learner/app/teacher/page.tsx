"use client";
import Link from "next/link";
import { AdultRoleSwitch } from "../../components/filumire/AdultRoleSwitch";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createTeacherAction,
  createTeacherNote,
  createTeacherMessage,
  createTeacherObservation,
  fetchTeacherMessages,
  fetchTeacherSummary,
  submitTeacherReview,
  TeacherRequestError,
  type ControlledTeacherActionType,
  type TeacherProfessionalNoteType,
  type TeacherReviewOutcome,
  type TeacherSummaryResponse,
  type TeacherThreadMessage,
} from "../../../../services/teacher-client";

type ViewState =
  | "loading"
  | "ready"
  | "unauthenticated"
  | "unavailable";

type SubmissionState =
  | "idle"
  | "saving";

const REVIEW_OUTCOMES: TeacherReviewOutcome[] = [
  "correct",
  "partial",
  "incorrect",
  "skipped",
  "observed",
];

const ACTION_TYPES: {
  value: ControlledTeacherActionType;
  label: string;
}[] = [
  { value: "request_practice", label: "Request practice" },
  { value: "request_explanation", label: "Request explanation" },
  { value: "request_review", label: "Request review" },
  { value: "request_reassessment", label: "Request reassessment" },
];

const NOTE_TYPES: {
  value: TeacherProfessionalNoteType;
  label: string;
}[] = [
  { value: "context", label: "Context" },
  { value: "instructional", label: "Instructional" },
  {
    value: "professional_feedback",
    label: "Professional feedback",
  },
];

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function label(value?: string): string {
  if (!value) {
    return "Not recorded";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/* Tranche 4F: a pilot measure with its counts, or an honest "no data". */
function measure(
  value?: { numerator: number; denominator: number; rate: number | null },
): string {
  if (!value || value.rate === null) {
    return "No data yet";
  }

  return `${percent(value.rate)} (${value.numerator} of ${value.denominator})`;
}

function dateTime(value?: string): string {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function requestId(prefix: string): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function errorMessage(error: unknown): string {
  if (error instanceof TeacherRequestError) {
    if (error.status === 401) {
      return "Your teacher session is no longer authorized. Please sign in again.";
    }

    if (error.status === 403) {
      return "You do not have permission to perform this action for this learner.";
    }

    return error.message;
  }

  return "The request could not be completed.";
}

export default function TeacherPage() {
  const [viewState, setViewState] =
    useState<ViewState>("loading");
  const [data, setData] =
    useState<TeacherSummaryResponse | null>(null);
  const [selectedCompetencyId, setSelectedCompetencyId] =
    useState<string | null>(null);

  const [submissionState, setSubmissionState] =
    useState<SubmissionState>("idle");
  const [submissionMessage, setSubmissionMessage] =
    useState<string | null>(null);
  const [submissionError, setSubmissionError] =
    useState<string | null>(null);

  const [observationOutcome, setObservationOutcome] =
    useState<TeacherReviewOutcome>("observed");
  const [noteType, setNoteType] =
    useState<TeacherProfessionalNoteType>("context");
  const [noteText, setNoteText] = useState("");
  const [actionType, setActionType] =
    useState<ControlledTeacherActionType>(
      "request_practice",
    );
  const [actionReason, setActionReason] = useState("");

  const load = useCallback(
    async (
      learnerId?: string,
      preferredCompetencyId?: string | null,
    ) => {
      setViewState("loading");

      try {
        const result = await fetchTeacherSummary(learnerId);

        setData(result);

        if (result.summary) {
          const allCompetencies =
            result.summary.subjects.flatMap(
              (subject) => subject.competencies,
            );

          const preserved =
            preferredCompetencyId &&
            allCompetencies.some(
              (item) =>
                item.competencyId ===
                preferredCompetencyId,
            )
              ? preferredCompetencyId
              : null;

          const nextCompetencyId =
            preserved ??
            result.summary.attentionQueue[0]
              ?.competencyId ??
            allCompetencies[0]?.competencyId ??
            null;

          setSelectedCompetencyId(nextCompetencyId);
        } else {
          setSelectedCompetencyId(null);
        }

        setViewState("ready");
      } catch (error) {
        setData(null);
        setSelectedCompetencyId(null);

        setViewState(
          error instanceof TeacherRequestError &&
            error.status === 401
            ? "unauthenticated"
            : "unavailable",
        );
      }
    },
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCompetency = useMemo(() => {
    if (!data?.summary || !selectedCompetencyId) {
      return null;
    }

    for (const subject of data.summary.subjects) {
      const competency = subject.competencies.find(
        (item) =>
          item.competencyId === selectedCompetencyId,
      );

      if (competency) {
        return competency;
      }
    }

    return null;
  }, [data, selectedCompetencyId]);

  const runSubmission = useCallback(
    async (
      operation: () => Promise<unknown>,
      successMessage: string,
    ): Promise<boolean> => {
      setSubmissionState("saving");
      setSubmissionMessage(null);
      setSubmissionError(null);

      try {
        await operation();
        setSubmissionMessage(successMessage);

        if (data?.selectedLearnerId) {
          await load(
            data.selectedLearnerId,
            selectedCompetencyId,
          );
        }

        return true;
      } catch (error) {
        setSubmissionError(errorMessage(error));
        return false;
      } finally {
        setSubmissionState("idle");
      }
    },
    [
      data?.selectedLearnerId,
      load,
      selectedCompetencyId,
    ],
  );

  const selectLearner = useCallback(
    (learnerId: string) => {
      setSubmissionMessage(null);
      setSubmissionError(null);
      setSelectedCompetencyId(null);
      void load(learnerId);
    },
    [load],
  );

  const recordObservation = useCallback(async () => {
    if (
      !data?.selectedLearnerId ||
      !selectedCompetency
    ) {
      return;
    }

    await runSubmission(
      () =>
        createTeacherObservation({
          learnerId: data.selectedLearnerId!,
          competencyId:
            selectedCompetency.competencyId,
          outcome: observationOutcome,
          clientRequestId: requestId(
            "teacher-observation",
          ),
        }),
      "Teacher observation recorded.",
    );
  }, [
    data?.selectedLearnerId,
    observationOutcome,
    runSubmission,
    selectedCompetency,
  ]);

  const saveNote = useCallback(async () => {
    if (
      !data?.selectedLearnerId ||
      !selectedCompetency ||
      !noteText.trim()
    ) {
      return;
    }

    const success = await runSubmission(
      () =>
        createTeacherNote({
          learnerId: data.selectedLearnerId!,
          competencyId:
            selectedCompetency.competencyId,
          noteType,
          text: noteText.trim(),
          clientRequestId: requestId("teacher-note"),
        }),
      "Professional note saved.",
    );

    if (success) {
      setNoteText("");
    }
  }, [
    data?.selectedLearnerId,
    noteText,
    noteType,
    runSubmission,
    selectedCompetency,
  ]);

  const submitAction = useCallback(async () => {
    if (
      !data?.selectedLearnerId ||
      !selectedCompetency
    ) {
      return;
    }

    const success = await runSubmission(
      () =>
        createTeacherAction({
          learnerId: data.selectedLearnerId!,
          competencyId:
            selectedCompetency.competencyId,
          actionType,
          reason: actionReason.trim() || undefined,
          clientRequestId: requestId(
            "teacher-action",
          ),
        }),
      "Teacher request submitted.",
    );

    if (success) {
      setActionReason("");
    }
  }, [
    actionReason,
    actionType,
    data?.selectedLearnerId,
    runSubmission,
    selectedCompetency,
  ]);

  const reviewPendingItem = useCallback(
    async (
      reviewId: string,
      outcome: TeacherReviewOutcome,
    ) => {
      await runSubmission(
        () =>
          submitTeacherReview({
            reviewId,
            outcome,
          }),
        `Review recorded as ${label(
          outcome,
        ).toLowerCase()}.`,
      );
    },
    [runSubmission],
  );

  const [thread, setThread] =
    useState<TeacherThreadMessage[]>([]);
  const [threadText, setThreadText] = useState("");
  const [threadState, setThreadState] =
    useState<"idle" | "loading" | "sending" | "error">(
      "idle",
    );

  const threadLearnerId = data?.selectedLearnerId;

  useEffect(() => {
    if (!threadLearnerId) {
      setThread([]);
      return;
    }

    let alive = true;
    setThreadState("loading");

    fetchTeacherMessages(threadLearnerId)
      .then((messages) => {
        if (!alive) return;
        setThread(messages);
        setThreadState("idle");
      })
      .catch(() => {
        if (alive) setThreadState("error");
      });

    return () => {
      alive = false;
    };
  }, [threadLearnerId]);

  const sendThreadMessage = useCallback(async () => {
    if (!threadLearnerId || !threadText.trim()) {
      return;
    }

    setThreadState("sending");

    try {
      await createTeacherMessage({
        learnerId: threadLearnerId,
        text: threadText.trim(),
        clientRequestId: requestId("teacher-message"),
      });
      setThreadText("");
      setThread(
        await fetchTeacherMessages(threadLearnerId),
      );
      setThreadState("idle");
    } catch {
      setThreadState("error");
    }
  }, [threadLearnerId, threadText]);

  const busy = submissionState === "saving";

  return (
    <main className="page">
      <header className="filumireLearnerHeader"><Link href="/" className="filumireHeaderLogo" aria-label="FILUMIRE home"><img src="/filumire-logo-white.svg" alt="FILUMIRE" /></Link></header>
      <AdultRoleSwitch active="teacher" />
      <div className="shell">
        <div className="teacherTitle">Teacher Workspace</div>
        {data?.summary && (
            <div className="updated">
              {data.summary.updatedAt
                ? `Updated ${dateTime(
                    data.summary.updatedAt,
                  )}`
                : "Learning overview"}
            </div>
          )}

        {viewState === "loading" && (
          <section className="card status-card">
            Loading teacher workspace...
          </section>
        )}

        {viewState === "unauthenticated" && (
          <section className="card status-card">
            <h1>Please sign in</h1>
            <p>
              Teacher authorization is required to
              view learner information.
            </p>
            <a href="/login" className="primary-button">
              Go to sign in
            </a>
          </section>
        )}

        {viewState === "unavailable" && (
          <section className="card status-card">
            <h1>Workspace unavailable</h1>
            <p>
              The teacher workspace could not be
              loaded.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => void load()}
            >
              Try again
            </button>
          </section>
        )}

        {viewState === "ready" &&
          data &&
          data.learners.length === 0 && (
            <section className="card status-card">
              <h1>No learners assigned</h1>
              <p>
                No active teacher-learner
                relationships are available.
              </p>
            </section>
          )}

        {viewState === "ready" &&
          data &&
          data.learners.length > 1 && (
            <section className="card selector">
              <div className="section-label">
                Learner
              </div>
              <div className="learner-list">
                {data.learners.map(
                  (learner, index) => (
                    <button
                      key={learner.learnerId}
                      type="button"
                      className={
                        learner.learnerId ===
                        data.selectedLearnerId
                          ? "learner selected"
                          : "learner"
                      }
                      onClick={() =>
                        selectLearner(
                          learner.learnerId,
                        )
                      }
                    >
                      Learner {index + 1}
                    </button>
                  ),
                )}
              </div>
            </section>
          )}

        {viewState === "ready" &&
          data?.requiresSelection && (
            <section className="card status-card">
              <h1>Select a learner</h1>
              <p>
                Choose a learner to view their
                teaching priorities and progress.
              </p>
            </section>
          )}

        {viewState === "ready" &&
          data?.summary && (
            <>
              <section className="overview-grid">
                <div className="metric-card">
                  <div className="metric-value">
                    {
                      data.summary.attentionQueue
                        .length
                    }
                  </div>
                  <div className="metric-label">
                    Need attention
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-value">
                    {
                      data.summary
                        .pendingReviewCount
                    }
                  </div>
                  <div className="metric-label">
                    Teacher reviews
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-value">
                    {data.summary.subjects.length}
                  </div>
                  <div className="metric-label">
                    Active subjects
                  </div>
                </div>
              </section>

              {data.summary.masteryMeasures && (
                <section className="card">
                  <div className="section-label">
                    Mastery check
                  </div>
                  <h2>
                    How solid is this learner&apos;s mastery?
                  </h2>

                  <div className="detail-grid">
                    <div>
                      <span className="detail-label">
                        Topics mastered
                      </span>
                      <strong>
                        {data.summary.masteryMeasures.competenciesMastered}
                        {" of "}
                        {data.summary.masteryMeasures.competenciesAttempted}
                        {" started"}
                      </strong>
                    </div>
                    <div>
                      <span className="detail-label">
                        Mastery not confirmed later
                      </span>
                      <strong>
                        {measure(
                          data.summary.masteryMeasures.falseMasteryRate,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span className="detail-label">
                        Remembered after a day or more
                      </span>
                      <strong>
                        {measure(
                          data.summary.masteryMeasures.delayedRetentionAfterMastery,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span className="detail-label">
                        Used in a new situation
                      </span>
                      <strong>
                        {measure(
                          data.summary.masteryMeasures.transferAfterMastery,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span className="detail-label">
                        Teacher marking agrees
                      </span>
                      <strong>
                        {measure(
                          data.summary.masteryMeasures.teacherAgreementAfterMastery,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span className="detail-label">
                        Stuck or out of questions
                      </span>
                      <strong>
                        {measure(
                          data.summary.masteryMeasures.stuckRate,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span className="detail-label">
                        Answers to reach mastery (median)
                      </span>
                      <strong>
                        {data.summary.masteryMeasures.medianAnswersToMastery ??
                          "No data yet"}
                      </strong>
                    </div>
                  </div>
                </section>
              )}

              {submissionMessage && (
                <div
                  className="feedback success"
                  role="status"
                >
                  {submissionMessage}
                </div>
              )}

              {submissionError && (
                <div
                  className="feedback error"
                  role="alert"
                >
                  {submissionError}
                </div>
              )}

              <section className="card">
                <div className="section-label">
                  Learning priorities
                </div>
                <h1>Learners who may need support</h1>

                {data.summary.attentionQueue
                  .length === 0 ? (
                  <p>
                    No competencies currently
                    require teacher attention.
                  </p>
                ) : (
                  <div className="attention-list">
                    {data.summary.attentionQueue.map(
                      (item) => (
                        <button
                          key={item.competencyId}
                          type="button"
                          className="attention-item attention-button"
                          onClick={() =>
                            setSelectedCompetencyId(
                              item.competencyId,
                            )
                          }
                        >
                          <div className="attention-top">
                            <div>
                              <div className="subject">
                                {item.subjectName}
                              </div>
                              <h2>
                                {
                                  item.competencyTitle
                                }
                              </h2>
                            </div>

                            {item.attentionPriority && (
                              <span
                                className={`priority ${item.attentionPriority}`}
                              >
                                {
                                  item.attentionPriority
                                }
                              </span>
                            )}
                          </div>

                          <div className="chips">
                            {item.attentionReasons.map(
                              (reason) => (
                                <span
                                  key={reason}
                                  className="chip"
                                >
                                  {label(reason)}
                                </span>
                              ),
                            )}
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                )}
              </section>

              <section className="card">
                <div className="section-label">
                  Learning overview
                </div>
                <h1>Learning overview</h1>

                <div className="subject-list">
                  {data.summary.subjects.map(
                    (subject) => (
                      <article
                        key={subject.subjectId}
                        className="subject-block"
                      >
                        <div className="subject-item">
                          <div>
                            <h2>
                              {subject.subjectName}
                            </h2>
                            <p>
                              {
                                subject.competenciesNeedingAttention
                              }{" "}
                              of{" "}
                              {
                                subject.competencyCount
                              }{" "}
                              competencies need
                              attention
                            </p>
                          </div>

                          <div className="subject-stats">
                            <span>
                              Mastery{" "}
                              <strong>
                                {percent(
                                  subject.averageMastery,
                                )}
                              </strong>
                            </span>
                            <span>
                              Confidence{" "}
                              <strong>
                                {percent(
                                  subject.averageConfidence,
                                )}
                              </strong>
                            </span>
                          </div>
                        </div>

                        <div className="competency-list">
                          {subject.competencies.map(
                            (competency) => (
                              <button
                                key={
                                  competency.competencyId
                                }
                                type="button"
                                className={
                                  competency.competencyId ===
                                  selectedCompetencyId
                                    ? "competency-button selected"
                                    : "competency-button"
                                }
                                onClick={() =>
                                  setSelectedCompetencyId(
                                    competency.competencyId,
                                  )
                                }
                              >
                                <span>
                                  {
                                    competency.competencyTitle
                                  }
                                </span>
                                <span className="competency-meta">
                                  {percent(
                                    competency.masteryEstimate,
                                  )}{" "}
                                  mastery
                                </span>
                              </button>
                            ),
                          )}
                        </div>
                      </article>
                    ),
                  )}
                </div>
              </section>

              {data.summary.pendingReviews.length >
                0 && (
                <section className="card">
                  <div className="section-label">
                    Teacher review
                  </div>
                  <h1>
                    Learner responses to review
                    teacher judgment
                  </h1>

                  <div className="review-list">
                    {data.summary.pendingReviews.map(
                      (review) => (
                        <article
                          key={review.id}
                          className="review-item"
                        >
                          <div className="detail-grid">
                            <div>
                              <span className="detail-label">
                                Competency
                              </span>
                              <strong>
                                {
                                  review.competencyId
                                }
                              </strong>
                            </div>
                            <div>
                              <span className="detail-label">
                                Assessment item
                              </span>
                              <strong>
                                {
                                  review.assessmentItemId
                                }
                              </strong>
                            </div>
                            <div>
                              <span className="detail-label">
                                Submitted
                              </span>
                              <strong>
                                {dateTime(
                                  review.submittedAt,
                                )}
                              </strong>
                            </div>
                          </div>

                          <div className="response-box">
                            <span className="detail-label">
                              Learner response
                            </span>
                            <div>{review.response}</div>
                          </div>

                          <div className="review-actions">
                            {REVIEW_OUTCOMES.map(
                              (outcome) => (
                                <button
                                  key={outcome}
                                  type="button"
                                  className="secondary-button"
                                  disabled={busy}
                                  onClick={() =>
                                    void reviewPendingItem(
                                      review.id,
                                      outcome,
                                    )
                                  }
                                >
                                  {label(outcome)}
                                </button>
                              ),
                            )}
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                </section>
              )}

              {selectedCompetency && (
                <>
                  <section className="card">
                    <div className="section-label">
                      Learning detail
                    </div>
                    <div className="detail-heading">
                      <div>
                        <div className="subject">
                          {
                            selectedCompetency.subjectName
                          }
                        </div>
                        <h1>
                          {
                            selectedCompetency.competencyTitle
                          }
                        </h1>
                      </div>

                      {selectedCompetency.attentionPriority && (
                        <span
                          className={`priority ${selectedCompetency.attentionPriority}`}
                        >
                          {
                            selectedCompetency.attentionPriority
                          }
                        </span>
                      )}
                    </div>

                    <div className="detail-grid">
                  <div>
                    <span className="detail-label">
                      Learning progression
                    </span>
                        <strong>
                          {selectedCompetency.readyForAdvancement
                            ? "Ready"
                            : "Not yet ready"}
                        </strong>
                      </div>
                      <div>
                        <span className="detail-label">
                          Retention
                        </span>
                        <strong>
                          {label(
                            selectedCompetency.retentionStatus,
                          )}
                        </strong>
                      </div>
                      <div>
                        <span className="detail-label">
                          Transfer
                        </span>
                        <strong>
                          {label(
                            selectedCompetency.transferStatus,
                          )}
                        </strong>
                      </div>
                      {selectedCompetency.prerequisiteRepair && (
                        <>
                          <div>
                            <span className="detail-label">
                              Sent back to learn first
                            </span>
                            <strong>
                              {
                                selectedCompetency.prerequisiteRepair
                                  .competencyTitle
                              }
                              {selectedCompetency.prerequisiteRepair
                                .completed
                                ? " (done)"
                                : " (in progress)"}
                            </strong>
                          </div>
                          <div>
                            <span className="detail-label">
                              Sent back on
                            </span>
                            <strong>
                              {dateTime(
                                selectedCompetency.prerequisiteRepair
                                  .startedAt,
                              )}
                            </strong>
                          </div>
                        </>
                      )}
                      {selectedCompetency.needsSupportSince && (
                        <>
                          <div>
                            <span className="detail-label">
                              Ran out of questions
                            </span>
                            <strong>
                              {dateTime(
                                selectedCompetency.needsSupportSince,
                              )}
                            </strong>
                          </div>
                          <div>
                            <span className="detail-label">
                              FILUMIRE tries again from
                            </span>
                            <strong>
                              {dateTime(
                                selectedCompetency.needsSupportRetryAt,
                              )}
                            </strong>
                          </div>
                        </>
                      )}
                    </div>

                    {selectedCompetency.attentionReasons
                      .length > 0 && (
                      <div className="chips">
                        {selectedCompetency.attentionReasons.map(
                          (reason) => (
                            <span
                              key={reason}
                              className="chip"
                            >
                              {label(reason)}
                            </span>
                          ),
                        )}
                      </div>
                    )}
                  </section>

                  <section className="two-column">
                    <article className="card">
                      <div className="section-label">
                        Learning insight
                      </div>
                      <h2>
                        {label(
                          selectedCompetency
                            .diagnosisExplanation
                            .diagnosticState,
                        )}
                      </h2>
                      <p>
                        Strength of current learning signal:{" "}
                        <strong>
                          {percent(
                            selectedCompetency
                              .diagnosisExplanation
                              .confidence,
                          )}
                        </strong>
                      </p>

                      <div className="detail-stack">
                        <div>
                          <span className="detail-label">
                            Patterns noticed
                          </span>
                          <div>
                            {selectedCompetency
                              .diagnosisExplanation
                              .errorPatterns.length >
                            0
                              ? selectedCompetency.diagnosisExplanation.errorPatterns.join(
                                  ", ",
                                )
                              : "None recorded"}
                          </div>
                        </div>
                        <div>
                          <span className="detail-label">
                            Earlier learning to revisit
                          </span>
                          <div>
                            {selectedCompetency
                              .diagnosisExplanation
                              .prerequisiteCompetencyIds
                              .length > 0
                              ? selectedCompetency.diagnosisExplanation.prerequisiteCompetencyIds.join(
                                  ", ",
                                )
                              : "None identified"}
                          </div>
                        </div>
                        <div>
                          <span className="detail-label">
                            Possible misunderstandings
                          </span>
                          <div>
                            {selectedCompetency
                              .diagnosisExplanation
                              .misconceptionIds
                              .length > 0
                              ? selectedCompetency.diagnosisExplanation.misconceptionIds.join(
                                  ", ",
                                )
                              : "None identified"}
                          </div>
                        </div>
                      </div>
                    </article>

                    <article className="card">
                      <div className="section-label">
                        FILUMIRE learning response
                      </div>
                      <h2>
                        Current instructional direction
                      </h2>
                      <div className="detail-stack">
                        <div>
                          <span className="detail-label">
                            Learning approach
                          </span>
                          <strong>
                            {label(
                              selectedCompetency
                                .adaptiveExplanation
                                .instructionalStrategy,
                            )}
                          </strong>
                        </div>
                        <div>
                          <span className="detail-label">
                            Support approach
                          </span>
                          <strong>
                            {label(
                              selectedCompetency
                                .adaptiveExplanation
                                .responseMode,
                            )}
                          </strong>
                        </div>
                        <div>
                          <span className="detail-label">
                            Current learning state
                          </span>
                          <strong>
                            {label(
                              selectedCompetency
                                .adaptiveExplanation
                                .diagnosticState,
                            )}
                          </strong>
                        </div>
                        <div>
                          <span className="detail-label">
                            Recent learning considered
                          </span>
                          <strong>
                            {
                              selectedCompetency
                                .adaptiveExplanation
                                .relevantEvidenceIds
                                .length
                            }{" "}
                            records
                          </strong>
                        </div>
                      </div>
                    </article>
                  </section>

                  <section className="card">
                    <div className="section-label">
                      Evidence
                    </div>
                    <h1>Recent learning record</h1>

                    {selectedCompetency.evidence
                      .length === 0 ? (
                      <p>
                        No evidence has been recorded
                        for this competency.
                      </p>
                    ) : (
                      <div className="timeline">
                        {selectedCompetency.evidence.map(
                          (item) => (
                            <article
                              key={item.id}
                              className="timeline-item"
                            >
                              <div className="timeline-top">
                                <strong>
                                  {label(
                                    item.outcome,
                                  )}
                                </strong>
                                <span>
                                  {dateTime(
                                    item.timestamp,
                                  )}
                                </span>
                              </div>
                              <div className="chips">
                                <span className="chip">
                                  {label(
                                    item.source,
                                  )}
                                </span>
                                {item.purpose && (
                                  <span className="chip">
                                    {label(
                                      item.purpose,
                                    )}
                                  </span>
                                )}
                                {item.independence && (
                                  <span className="chip">
                                    {label(
                                      item.independence,
                                    )}
                                  </span>
                                )}
                                {item.difficulty && (
                                  <span className="chip">
                                    {label(
                                      item.difficulty,
                                    )}
                                  </span>
                                )}
                                {item.strength && (
                                  <span className="chip">
                                    {label(
                                      item.strength,
                                    )}
                                  </span>
                                )}
                              </div>
                              {(item.errorClass ||
                                item.errorPattern) && (
                                <p>
                                  {item.errorClass
                                    ? `Error: ${label(
                                        item.errorClass,
                                      )}`
                                    : ""}
                                  {item.errorClass &&
                                  item.errorPattern
                                    ? " | "
                                    : ""}
                                  {item.errorPattern ??
                                    ""}
                                </p>
                              )}
                            </article>
                          ),
                        )}
                      </div>
                    )}
                  </section>

                  <section className="two-column">
                    <article className="card">
                      <div className="section-label">
                        Support history
                      </div>
                      <h1>
                        Instructional interventions
                      </h1>

                      {selectedCompetency
                        .interventionHistory.length ===
                      0 ? (
                        <p>
                          No interventions recorded.
                        </p>
                      ) : (
                        <div className="timeline">
                          {selectedCompetency.interventionHistory.map(
                            (item) => (
                              <div
                                key={
                                  item.interventionId
                                }
                                className="timeline-item"
                              >
                                <strong>
                                  {label(item.type)}
                                </strong>
                                <p>
                                  {label(
                                    item.instructionalStrategy,
                                  )}
                                </p>
                                <div className="small">
                                  Started{" "}
                                  {dateTime(
                                    item.startedAt,
                                  )}
                                  {item.completedAt
                                    ? ` | Completed ${dateTime(
                                        item.completedAt,
                                      )}`
                                    : ""}
                                </div>
                                {item.outcome && (
                                  <div className="small">
                                    Outcome:{" "}
                                    {label(
                                      item.outcome,
                                    )}
                                  </div>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </article>

                    <article className="card">
                      <div className="section-label">
                        Learning over time
                      </div>
                      <h1>Learning history</h1>

                      {selectedCompetency
                        .progressHistory.length ===
                      0 ? (
                        <p>
                          No progress history
                          recorded.
                        </p>
                      ) : (
                        <div className="timeline">
                          {selectedCompetency.progressHistory.map(
                            (item) => (
                              <div
                                key={
                                  item.evidenceId
                                }
                                className="timeline-item"
                              >
                                <div className="timeline-top">
                                  <strong>
                                    {label(
                                      item.outcome,
                                    )}
                                  </strong>
                                  <span>
                                    {dateTime(
                                      item.timestamp,
                                    )}
                                  </span>
                                </div>
                                <div className="small">
                                  {item.purpose
                                    ? `${label(
                                        item.purpose,
                                      )}`
                                    : "Evidence"}
                                  {item.diagnosticState
                                    ? ` | ${label(
                                        item.diagnosticState,
                                      )}`
                                    : ""}
                                  {typeof item.diagnosticConfidence ===
                                  "number"
                                    ? ` | ${percent(
                                        item.diagnosticConfidence,
                                      )} diagnostic confidence`
                                    : ""}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </article>
                  </section>

                  <section className="card">
                    <div className="section-label">
                      Teacher support
                    </div>
                    <h1>
                      Add professional context
                    </h1>

                    <div className="teacher-tools">
                      <article className="tool-panel">
                        <h2>
                          Record observation
                        </h2>
                        <label>
                          Outcome
                          <select
                            value={
                              observationOutcome
                            }
                            onChange={(event) =>
                              setObservationOutcome(
                                event.target
                                  .value as TeacherReviewOutcome,
                              )
                            }
                            disabled={busy}
                          >
                            {REVIEW_OUTCOMES.map(
                              (outcome) => (
                                <option
                                  key={outcome}
                                  value={outcome}
                                >
                                  {label(outcome)}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                        <button
                          type="button"
                          className="primary-button"
                          disabled={busy}
                          onClick={() =>
                            void recordObservation()
                          }
                        >
                          Record observation
                        </button>
                      </article>

                      <article className="tool-panel">
                        <h2>
                          Professional note
                        </h2>
                        <label>
                          Note type
                          <select
                            value={noteType}
                            onChange={(event) =>
                              setNoteType(
                                event.target
                                  .value as TeacherProfessionalNoteType,
                              )
                            }
                            disabled={busy}
                          >
                            {NOTE_TYPES.map(
                              (option) => (
                                <option
                                  key={
                                    option.value
                                  }
                                  value={
                                    option.value
                                  }
                                >
                                  {option.label}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                        <label>
                          Note
                          <textarea
                            value={noteText}
                            onChange={(event) =>
                              setNoteText(
                                event.target.value,
                              )
                            }
                            rows={4}
                            disabled={busy}
                          />
                        </label>
                        <button
                          type="button"
                          className="primary-button"
                          disabled={
                            busy || !noteText.trim()
                          }
                          onClick={() =>
                            void saveNote()
                          }
                        >
                          Save note
                        </button>
                      </article>

                      <article className="tool-panel">
                        <h2>
                          Request learning support
                        </h2>
                        <label>
                          Request
                          <select
                            value={actionType}
                            onChange={(event) =>
                              setActionType(
                                event.target
                                  .value as ControlledTeacherActionType,
                              )
                            }
                            disabled={busy}
                          >
                            {ACTION_TYPES.map(
                              (option) => (
                                <option
                                  key={
                                    option.value
                                  }
                                  value={
                                    option.value
                                  }
                                >
                                  {option.label}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                        <label>
                          Reason (optional)
                          <textarea
                            value={actionReason}
                            onChange={(event) =>
                              setActionReason(
                                event.target.value,
                              )
                            }
                            rows={4}
                            disabled={busy}
                          />
                        </label>
                        <button
                          type="button"
                          className="primary-button"
                          disabled={busy}
                          onClick={() =>
                            void submitAction()
                          }
                        >
                          Submit request
                        </button>
                      </article>
                    </div>
                  </section>
                </>
              )}

              {data?.selectedLearnerId && (
                <section className="card">
                  <div className="section-label">
                    Parent-teacher messages
                  </div>
                  <h1>Messages with home</h1>
                  <p className="thread-intro">
                    Messages share context with the
                    learner&apos;s parent. They do not
                    change FILUMIRE&apos;s learning
                    decisions.
                  </p>

                  {threadState === "loading" && (
                    <p>Loading messages...</p>
                  )}

                  {thread.length > 0 && (
                    <div className="thread-list">
                      {thread.map((message) => (
                        <div
                          key={message.id}
                          className="thread-message"
                        >
                          <div className="thread-meta">
                            <strong>
                              {message.senderRole ===
                              "guardian"
                                ? "Parent"
                                : "Teacher"}
                            </strong>
                            <span>
                              {dateTime(
                                message.createdAt,
                              )}
                            </span>
                          </div>
                          <p>{message.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {threadState !== "loading" &&
                    thread.length === 0 && (
                      <p>No messages yet.</p>
                    )}

                  <label>
                    Reply
                    <textarea
                      value={threadText}
                      onChange={(event) =>
                        setThreadText(
                          event.target.value,
                        )
                      }
                      rows={3}
                      disabled={threadState === "sending"}
                    />
                  </label>

                  {threadState === "error" && (
                    <p className="thread-error">
                      The message service isn&apos;t
                      available right now.
                    </p>
                  )}

                  <button
                    type="button"
                    className="primary-button"
                    disabled={
                      threadState === "sending" ||
                      !threadText.trim()
                    }
                    onClick={() =>
                      void sendThreadMessage()
                    }
                  >
                    {threadState === "sending"
                      ? "Sending..."
                      : "Send message"}
                  </button>
                </section>
              )}
            </>
          )}
      </div>

      <style jsx>{`
        .thread-intro {
          margin: 0 0 12px;
        }

        .thread-list {
          display: grid;
          gap: 10px;
          margin-bottom: 14px;
        }

        .thread-message {
          padding: 10px 12px;
          border-radius: 12px;
          background: #f4f7fc;
        }

        .thread-message p {
          margin: 4px 0 0;
          overflow-wrap: anywhere;
        }

        .thread-meta {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          font-size: 13px;
        }

        .thread-error {
          color: #b42318;
        }

        .adultFooter {
          margin-top: auto;
          padding-top: 8px;
        }

        .adultFooter img {
          display: block;
          width: 100%;
          height: auto;
        }

        .teacherTitle {
          margin: 0 0 14px;
          font-size: 18px;
          font-weight: 700;
          color: #0f2a6b;
        }

        /* FILUMIRE_TEACHER_INTERFACE_PASS */

        .page {
          display: flex;
          flex-direction: column;
          --teacher-surface: #ffffff;
          --teacher-soft: #f4f9fc;
          --teacher-border: #d8e7ef;
          --teacher-muted: #5e7080;
        }
        .page {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: var(--filumire-bg);
          color: var(--filumire-text);
          font-family: inherit;
        }

        .shell {
          width: min(1040px, calc(100% - 32px));
          margin: 0 auto;
          padding: 28px 0 64px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 20px;
          padding: 8px 0 28px;
        }

        .brand {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: 0.04em;
        }

        .subtitle,
        .updated,
        .small {
          margin-top: 4px;
          color: var(--teacher-muted);
        }

        .small {
          font-size: 12px;
          line-height: 1.5;
        }

        .card,
        .metric-card {
          background: var(--teacher-surface);
          border: 1px solid var(--teacher-border);
          border-radius: 18px;
          box-shadow: 0 8px 30px
            rgba(0, 0, 0, 0.04);
        }

        .card {
          padding: 30px;
          margin-bottom: 20px;
        }

        .status-card {
          min-height: 180px;
        }

        .overview-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 20px;
        }

        .metric-card { padding: 12px 8px; text-align: center;
        }

        .metric-value {
          font-size: 26px;
          font-weight: 800;
        }

        .metric-label {
          margin-top: 5px;
          color: var(--teacher-muted);
          font-size: 12px;
        }

        .section-label,
        .detail-label {
          color: var(--teacher-muted);
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .section-label {
          margin-bottom: 10px;
        }

        .detail-label {
          display: block;
          margin-bottom: 5px;
        }

        h1 {
          margin: 0 0 22px;
          font-size: 26px;
        }

        h2 {
          margin: 4px 0 10px;
          font-size: 18px;
        }

        p {
          color: #555;
          line-height: 1.5;
        }

        button,
        select,
        textarea {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .learner-list,
        .chips,
        .review-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .learner {
          padding: 11px 16px;
          border: 1px solid var(--teacher-border);
          border-radius: 10px;
          background: var(--teacher-surface);
          font-size: 15px;
        }

        .learner.selected {
          border-color: var(--filumire-blue);
          background: #f3f1ec;
        }

        .attention-list,
        .subject-list,
        .review-list,
        .timeline,
        .detail-stack {
          display: grid;
          gap: 12px;
        }

        .attention-item,
        .subject-item,
        .review-item,
        .timeline-item,
        .tool-panel {
          padding: 20px;
          border: 1px solid var(--teacher-border);
          border-radius: 14px;
        }

        .attention-button {
          width: 100%;
          background: var(--teacher-surface);
          color: inherit;
          text-align: left;
        }

        .attention-button:hover,
        .competency-button:hover {
          border-color: #99958c;
        }

        .attention-top,
        .subject-item,
        .detail-heading,
        .timeline-top {
          display: flex;
          justify-content: space-between;
          gap: 20px;
        }

        .timeline-top {
          align-items: baseline;
        }

        .timeline-top span {
          color: var(--teacher-muted);
          font-size: 12px;
        }

        .subject {
          color: var(--teacher-muted);
          font-size: 13px;
          font-weight: 700;
        }

        .priority {
          height: fit-content;
          padding: 6px 9px;
          border-radius: 999px;
          background: #f3f1ec;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .priority.critical {
          border: 1px solid #b97878;
        }

        .priority.high {
          border: 1px solid #c7a46a;
        }

        .priority.medium {
          border: 1px solid #aaa;
        }

        .chips {
          margin-top: 14px;
          gap: 7px;
        }

        .chip {
          padding: 6px 9px;
          border-radius: 8px;
          background: var(--filumire-bg);
          font-size: 12px;
        }

        .mini-stats,
        .subject-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
          margin-top: 16px;
          color: var(--teacher-muted);
          font-size: 13px;
        }

        .subject-stats {
          margin-top: 0;
          align-items: center;
        }

        .subject-block {
          border: 1px solid var(--teacher-border);
          border-radius: 14px;
          overflow: hidden;
        }

        .subject-block .subject-item {
          border: 0;
          border-radius: 0;
        }

        .competency-list {
          display: grid;
          border-top: 1px solid #e6e2da;
        }

        .competency-button {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 13px 20px;
          border: 0;
          border-bottom: 1px solid #eeeae3;
          background: var(--teacher-surface);
          color: var(--filumire-text);
          text-align: left;
        }

        .competency-button:last-child {
          border-bottom: 0;
        }

        .competency-button.selected {
          background: #f3f1ec;
          font-weight: 700;
        }

        .competency-meta {
          flex: 0 0 auto;
          color: var(--teacher-muted);
          font-size: 12px;
          font-weight: 400;
        }

        .feedback {
          padding: 14px 18px;
          margin-bottom: 20px;
          border-radius: 12px;
          font-size: 14px;
        }

        .feedback.success {
          border: 1px solid #9cb69d;
          background: #f4f8f2;
        }

        .feedback.error {
          border: 1px solid #c89595;
          background: #fff5f5;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .two-column {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .two-column .card {
          min-width: 0;
        }

        .response-box {
          padding: 16px;
          margin: 16px 0;
          border-radius: 10px;
          background: var(--filumire-bg);
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .review-actions {
          margin-top: 16px;
        }

        .primary-button,
        .secondary-button {
          padding: 11px 15px;
          border-radius: 10px;
          font-weight: 600;
        }

        .primary-button {
          margin-top: 12px;
          border: 0;
          background: var(--filumire-blue);
          color: white;
        }

        .secondary-button {
          border: 1px solid #cbc7bf;
          background: var(--teacher-surface);
          color: var(--filumire-text);
        }

        .boundary-note {
          padding: 14px 16px;
          border-left: 3px solid #777;
          background: var(--filumire-bg);
        }

        .teacher-tools {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 22px;
        }

        .tool-panel {
          min-width: 0;
        }

        label {
          display: grid;
          gap: 7px;
          margin-top: 14px;
          color: #555;
          font-size: 13px;
          font-weight: 700;
        }

        select,
        textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 10px 11px;
          border: 1px solid #cbc7bf;
          border-radius: 9px;
          background: var(--teacher-surface);
          color: var(--filumire-text);
          font-weight: 400;
        }

        textarea {
          resize: vertical;
        }

        @media (max-width: 800px) {
          .two-column,
          .teacher-tools {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .shell {
            width: min(100% - 20px, 1040px);
            padding-top: 18px;
          }

          .header,
          .attention-top,
          .subject-item,
          .detail-heading,
          .timeline-top {
            align-items: flex-start;
            flex-direction: column;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }

          .card {
            padding: 22px 18px;
          }

          .subject-stats {
            margin-top: 8px;
          }

          .competency-button {
            flex-direction: column;
            gap: 5px;
          }

          .review-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
        }
        .header {
          color: var(--filumire-navy);
        }

        .brand {
          color: var(--filumire-navy);
        }

        .subtitle,
        .updated {
          color: var(--teacher-muted);
        }

        .metric-card {
          border-color: var(--teacher-border);
          background:
            linear-gradient(145deg, #ffffff 0%, #f3faff 100%);
        }

        .metric-value {
          color: var(--filumire-navy);
        }

        .metric-label,
        .section-label {
          color: var(--filumire-blue);
        }

        .card h1,
        .card h2 {
          color: var(--filumire-navy);
        }

        .attention-item,
        .subject-item,
        .review-item,
        .timeline-item,
        .tool-panel {
          border-color: var(--teacher-border);
          background: var(--teacher-surface);
        }

        .attention-button:hover,
        .competency-button:hover,
        .learner:hover {
          border-color: var(--filumire-blue);
          background: var(--teacher-soft);
        }

        .competency-button.selected,
        .learner.selected {
          border-color: var(--filumire-blue);
          background: #eef9fe;
        }

        .chip {
          border-color: #cce7f3;
          background: #eef9fe;
          color: var(--filumire-navy);
        }

        .primary-button {
          min-height: 46px;
          border-radius: 10px;
          background: var(--filumire-blue);
          color: white;
          font-weight: 700;
        }

        .secondary-button {
          border-color: var(--filumire-blue);
          color: var(--filumire-navy);
          background: white;
          font-weight: 700;
        }

        .secondary-button:hover {
          background: #eef9fe;
        }

        select,
        textarea {
          border-color: var(--teacher-border);
          background: white;
          color: var(--filumire-text);
        }

        select:focus,
        textarea:focus {
          outline-color: var(--filumire-blue);
        }

        .response-box {
          border-color: var(--teacher-border);
          background: var(--teacher-soft);
        }

        @media (max-width: 760px) {
          .header {
            align-items: flex-start;
            flex-direction: column;
            gap: 8px;
          }

          .two-column,
          .teacher-tools {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    <footer className="adultFooter"><img src="/images/home/landscape%20footer.png" alt="" /></footer>
    </main>
  );
}
