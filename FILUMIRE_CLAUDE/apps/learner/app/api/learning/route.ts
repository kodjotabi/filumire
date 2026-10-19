import { NextResponse } from "next/server";
import { getCompetenciesForSubject as getSubjectCompetencies } from "../../../../../packages/curriculum";
import { createHash } from "node:crypto";
import { supportsSpacedRevision } from "../../../../../services/learner-path/revision";
import { getIntervention } from "../../../../../services/intervention-store";
import { getEvidence } from "../../../../../services/evidence-store";
import { getPilotMeasurementEvents } from "../../../../../services/pilot-measurement";
import { buildLearningOverview } from "./overview-data";
import { localizedCompetencyTitle } from "../../../../../services/curriculum-navigation";
import { recordAssessmentDelivery, recoveredAssessmentDelivery } from "../../../../../services/edututor/assessment-recovery";
import { assertSameOrigin, BadRequestError, errorResponse, readJsonBody } from "../account/http";

import type {
  AssessmentSubmission,
} from "../../../../../packages/contracts";

import {
  GHANA_MATH_PILOT_CURRICULUM_ID,
  GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
  GHANA_MATH_PILOT_LEVEL_ID,
  GHANA_MATH_PILOT_SUBJECT_ID,
  VALIDATION_INITIAL_COMPETENCY_ID,
  getCompetency,
  getInitialCompetencyForCurriculumSubjectLevel,
  getSubject,
} from "../../../../../packages/curriculum";

import {
  resolveCurriculumContext,
  getInitialCompetencyIdForResolvedContext,
} from "../../../../../packages/curriculum-framework";

import {
  getAvailableSubjectsForContext,
  getCurrentCompetencyForSubject,
  getOrCreateLearnerLearningContext,
  updateActiveCompetency,
} from "../../../../../services/learner-context";

import { evaluateAssessment } from "../../../../../services/assessment";
import { prepareLearnerContent } from "../../../../../services/assessment/learner-content";
import { selectActivityVisuals } from "../../../../../services/outline-visuals";

import {
  applyEvidence,
  createInitialLearnerState,
} from "../../../../../services/learner-state";

import { makeAdaptiveDecision } from "../../../../../services/adaptive-engine";
import { generateInstruction } from "../../../../../services/edututor";
import { issueLessonReceipt } from "../../../../../services/lesson-closure";

import {
  getLearnerState,
  getLearnerStates,
  saveLearnerState,
} from "../../../../../services/learner-state-store";

import { saveEvidenceAndUpdateLearnerState } from "../../../../../services/evidence-store";

import {
  recordPilotMeasurementEvent,
} from "../../../../../services/pilot-measurement";

import {
  submitPendingTeacherReview,
} from "../../../../../services/teacher-review";

import {
  getContentForCompetency,
} from "../../../../../services/content-store";

import { seedContent } from "../../../../../services/content-store/seed";
import { accountStore } from "../../../../../services/account/store";

import {
  resolveRequestIdentity,
} from "../../../../../services/identity";
import {
  acknowledgeIntervention,
} from "../../../../../services/intervention-store";

import {
  assertSessionOwnership,
  createSession,
} from "../../../../../services/session";

import {
  ensureLearnerExists,
} from "../../../../../services/learner";


seedContent();

const DEFAULT_SESSION_ID = "session-demo-001";

async function recordPilotEventSafely(
  input: Parameters<
    typeof recordPilotMeasurementEvent
  >[0],
): Promise<void> {
  try {
    await recordPilotMeasurementEvent(input);
  } catch (error) {
    console.warn(
      "FILUMIRE pilot measurement failure:",
      error,
    );
  }
}

const VALIDATION_CURRICULUM_ID =
  "framework-test";

const VALIDATION_LEVEL_ID =
  "level-test";

const VALIDATION_SUBJECT_ID =
  "subject-test-mathematics";

type InteractionType =
  | "assessment"
  | "acknowledge"
  | "check_first"
  | "retention"
  | "transfer";

type EvidenceOutcome =
  | "correct"
  | "incorrect"
  | "partial"
  | "skipped"
  | "observed";

/* Curriculum titles are English; French comes from the topic's French lesson. */
const competencyTitleIn = localizedCompetencyTitle;

function buildProgress(
  learnerState: Awaited<
    ReturnType<typeof createInitialLearnerState>
  >,
  language: string | undefined = learnerState.language,
) {
  const competencies = learnerState.competencies;
  const activeCompetency = competencies[0];
  const completedCompetencies = competencies.filter(
    (competency) =>
      competency.readinessState?.readyForAdvancement,
  ).length;
  const masteryEstimate =
    activeCompetency?.masteryEstimate ?? 0;
  const confidence =
    activeCompetency?.confidence ?? 0;
  const activeCompetencyDefinition =
    activeCompetency
      ? getCompetency(
          activeCompetency.competencyId,
        )
      : undefined;
  const activeSubject =
    activeCompetencyDefinition
      ? getSubject(
          activeCompetencyDefinition.subjectId,
        )
      : undefined;

  return {
    learnerId: learnerState.learnerId,
    activeCompetencyId:
      activeCompetency?.competencyId,
    competencyCount: competencies.length,
    completedCompetencies,
    masteryEstimate,
    confidence,
    evidenceCount:
      activeCompetency?.evidenceCount ?? 0,
    readiness:
      activeCompetency?.readinessState
        ?.readyForAdvancement ?? false,
    subjectId: activeSubject?.id,
    subjectName: activeSubject?.name,
    competencyTitle:
      activeCompetencyDefinition &&
      competencyTitleIn(activeCompetencyDefinition.id, activeCompetencyDefinition.title, language),
    percent: Math.round(
      Math.min(
        1,
        (masteryEstimate + confidence) / 2,
      ) * 100,
    ),
  };
}

function notFoundResponse(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 404 },
  );
}

function resolveInitialCompetencyId(
  url: URL,
  source:
    | "development-header"
    | "production-session",
): string {
  const production = source === "production-session";
  const inferred = production
    ? undefined
    : getSubjectCompetencies(url.searchParams.get("subjectId") ?? "")[0];
  const defaultCurriculumId = production
    ? GHANA_MATH_PILOT_CURRICULUM_ID
    : VALIDATION_CURRICULUM_ID;
  const defaultLevelId = production
    ? GHANA_MATH_PILOT_LEVEL_ID
    : VALIDATION_LEVEL_ID;
  const defaultSubjectId = production
    ? GHANA_MATH_PILOT_SUBJECT_ID
    : VALIDATION_SUBJECT_ID;
  const defaultCompetencyId = production
    ? GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID
    : VALIDATION_INITIAL_COMPETENCY_ID;
  const curriculumId =
    url.searchParams.get("curriculumId") ??
    inferred?.curriculumFrameworkId ?? defaultCurriculumId;
  const levelId =
    url.searchParams.get("levelId") ??
    inferred?.learningLevelId ?? defaultLevelId;
  const subjectId =
    url.searchParams.get("subjectId") ??
    defaultSubjectId;
  const requestedCompetencyId =
    url.searchParams.get("competencyId");
  const initialCompetency =
    getInitialCompetencyForCurriculumSubjectLevel(
      curriculumId,
      subjectId,
      levelId,
    );

  if (!initialCompetency) {
    throw new Error(
      "Unknown curriculum selection.",
    );
  }

  const competency = requestedCompetencyId
    ? getCompetency(requestedCompetencyId)
    : getCompetency(inferred ? initialCompetency.id : defaultCompetencyId);

  if (
    !competency ||
    competency.curriculumFrameworkId !== curriculumId ||
    competency.learningLevelId !== levelId ||
    competency.subjectId !== subjectId
  ) {
    throw new Error(
      "Unknown curriculum selection.",
    );
  }

  return competency.id;
}

/*
 * Production competency resolution:
 *
 * authenticated learner -> learner learning context ->
 * curriculum version -> grade -> subject -> active competency
 * if valid, otherwise a valid initial competency -> existing
 * adaptive engine.
 *
 * The stored grade is authoritative: a subjectId query selects
 * a subject within the learner's grade, and curriculumId/levelId
 * queries are accepted only when they agree with the stored
 * context, so a request can never reach another grade's
 * subjects. Invalid selections fail safely (404).
 */
async function resolveProductionCompetencyId(
  url: URL,
  learnerId: string,
): Promise<string> {
  const context =
    await getOrCreateLearnerLearningContext(
      learnerId,
    );

  const curriculumVersionId =
    url.searchParams.get("curriculumId") ??
    context.curriculumVersionId;
  const gradeId =
    url.searchParams.get("levelId") ??
    context.gradeId;

  if (
    curriculumVersionId !==
      context.curriculumVersionId ||
    gradeId !== context.gradeId
  ) {
    throw new Error(
      "Unknown curriculum selection.",
    );
  }

  const subjectId =
    url.searchParams.get("subjectId") ??
    context.activeSubjectId;

  const resolved = resolveCurriculumContext(
    curriculumVersionId,
    gradeId,
    subjectId,
  );

  if (!resolved) {
    throw new Error(
      "Unknown curriculum selection.",
    );
  }

  const requestedCompetencyId =
    url.searchParams.get("competencyId");

  if (requestedCompetencyId) {
    const requestedCompetency = getCompetency(
      requestedCompetencyId,
    );

    if (
      !requestedCompetency ||
      requestedCompetency.subjectId !==
        resolved.subject.id
    ) {
      throw new Error(
        "Unknown curriculum selection.",
      );
    }

    return requestedCompetency.id;
  }

  if (context.activeCompetencyId) {
    const activeCompetency = getCompetency(
      context.activeCompetencyId,
    );

    if (
      activeCompetency &&
      activeCompetency.subjectId ===
        resolved.subject.id
    ) {
      return activeCompetency.id;
    }
  }

  const initialCompetencyId =
    getInitialCompetencyIdForResolvedContext(
      resolved,
    );

  if (!initialCompetencyId) {
    throw new Error(
      "Unknown curriculum selection.",
    );
  }

  return initialCompetencyId;
}

function assertKnownCompetency(
  competencyId: string,
): void {
  if (!getCompetency(competencyId)) {
    throw new Error(
      "Unknown competency.",
    );
  }
}

function unauthorizedResponse(message: string) {
  console.warn(
    "FILUMIRE learning: session/authorization rejected",
    { reason: message },
  );

  return NextResponse.json(
    { error: message },
    { status: 401 },
  );
}

function isEvidenceOutcome(
  value: unknown,
): value is EvidenceOutcome {
  return (
    value === "correct" ||
    value === "incorrect" ||
    value === "partial" ||
    value === "skipped" ||
    value === "observed"
  );
}

function isNonEmptyString(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

async function assertOwnedSession(
  sessionId: string,
  learnerId: string,
  canCreateSession: boolean,
) {
  const existingSessionLearnerId =
    await import(
      "../../../../../services/persistence-provider"
    ).then(
      async ({
        persistenceStore,
      }) =>
        persistenceStore.getSessionLearnerId(
          sessionId,
        ),
    );

  if (!existingSessionLearnerId) {
    if (!canCreateSession) {
      throw new Error("Session not found.");
    }

    await ensureLearnerExists(learnerId);
    await createSession(
      sessionId,
      learnerId,
    );
  }

  await assertSessionOwnership(
    sessionId,
    learnerId,
  );
}

/*
 * A spaced review visits an earlier topic; the learner's current topic
 * stays active so they return to it once the review is answered.
 */
function keepsCurrentTopic(decision: { action: string; competencyId: string }) {
  return decision.action === "retention_check" && supportsSpacedRevision(decision.competencyId);
}

async function ensureCompetencyState(
  learnerId: string,
  learnerState: Awaited<
    ReturnType<typeof createInitialLearnerState>
  >,
  competencyId: string,
) {
  const existingIndex =
    learnerState.competencies.findIndex(
      (competency) =>
        competency.competencyId ===
        competencyId,
    );

  if (existingIndex === 0) {
    return learnerState;
  }

  /*
   * Tranche 4B step 4: the path can return to a competency the
   * learner already started. The engine works on the first
   * competency, so move it to the front.
   */
  if (existingIndex > 0) {
    const reordered = {
      ...learnerState,
      competencies: [
        learnerState.competencies[existingIndex],
        ...learnerState.competencies.filter(
          (_, index) => index !== existingIndex,
        ),
      ],
      updatedAt:
        new Date().toISOString(),
    };

    await saveLearnerState(
      reordered,
    );

    return reordered;
  }

  const nextState =
    createInitialLearnerState(
      learnerId,
      competencyId,
    );

  const updatedState = {
    ...learnerState,
    competencies: [
      nextState.competencies[0],
      ...learnerState.competencies,
    ],
    updatedAt:
      new Date().toISOString(),
    stateVersion:
      "state-0.3",
  };

  await saveLearnerState(
    updatedState,
  );

  return updatedState;
}

/*
 * Tranche 4E: answer keys stay on the server and multiple-choice
 * options are shuffled per learner and item (services/assessment/learner-content).
 */
function sanitizeLearnerContent<T extends { id?: string; assessmentItemId?: string; metadata?: Record<string, string> } | undefined>(content: T, learnerId: string): T {
  return prepareLearnerContent(content, learnerId);
}

type LearningLanguage = "en" | "fr";

/*
 * The lesson language: the interface language the browser sends,
 * otherwise the learner's saved account language. Undefined keeps
 * whatever the learner state already has.
 */
async function resolveLearningLanguage(
  request: Request,
  learnerId: string,
): Promise<LearningLanguage | undefined> {
  const requested = request.headers.get("x-filumire-language");

  if (requested === "en" || requested === "fr") {
    return requested;
  }

  return (await accountStore.getLearnerProfile(learnerId))?.preferredLanguage;
}

async function buildLearningResponse(
  learnerId: string,
  sessionId: string,
  initialLearnerState: Awaited<
    ReturnType<typeof createInitialLearnerState>
  >,
  language?: LearningLanguage,
  decisionOptions: { checkKnowledgeFirst?: boolean; selectedTopic?: boolean } = {},
) {
  /*
   * Content is chosen in the learner state's language, so a change
   * of interface language is stored before the decision. Only the
   * language changes; mastery, evidence and progress do not.
   */
  let learnerState = initialLearnerState;

  if (language && learnerState.language !== language) {
    learnerState = { ...learnerState, language };
    await saveLearnerState(learnerState);
  }

  const adaptiveDecision =
    await makeAdaptiveDecision({
      learnerId,
      sessionId,
      learnerState,
    }, { ...(supportsSpacedRevision(learnerState.competencies[0].competencyId) ? { timeAwareRetention: true } : {}), ...decisionOptions });

  await recordPilotEventSafely({
    learnerId,
    competencyId:
      adaptiveDecision.decision.competencyId,
    sessionId,
    subjectId:
      getCompetency(
        adaptiveDecision.decision.competencyId,
      )?.subjectId,
    eventType: "adaptive_decision",
    clientRequestId:
      `adaptive:${sessionId}:${adaptiveDecision.decision.competencyId}:${learnerState.updatedAt}:${adaptiveDecision.decision.action}`,
    metadata: {
      source: "assessment-aware-decision-v1",
      interventionId: adaptiveDecision.decision.interventionId ?? null,
      action:
        adaptiveDecision.decision.action,
    },
  });

  let updatedLearnerState =
    learnerState;

  if (
    adaptiveDecision.decision.action ===
    "advance" || adaptiveDecision.decision.action === "retention_check"
  ) {
    /*
     * Tranche 4G: the engine may have just written to the stored
     * state (content exhausted, prerequisite repair). Build on that,
     * not on the copy loaded before the decision, or those markers
     * would be overwritten.
     */
    let latestLearnerState =
      (await getLearnerState(
        learnerId,
        adaptiveDecision.decision.action === "retention_check" ? adaptiveDecision.decision.competencyId : learnerState.competencies[0].competencyId,
      )) ?? learnerState;

    // A reviewed topic's stored state may predate the learner's current
    // language; guidance must follow the language requested now.
    if (latestLearnerState.language !== learnerState.language) {
      latestLearnerState = { ...latestLearnerState, language: learnerState.language };
      await saveLearnerState(latestLearnerState);
    }

    updatedLearnerState =
      await ensureCompetencyState(
        learnerId,
        latestLearnerState,
        adaptiveDecision
          .decision.competencyId,
      );
  }

  const instruction =
    await generateInstruction({
      learnerState:
        updatedLearnerState,
      decision:
        adaptiveDecision.decision,
      content: sanitizeLearnerContent(adaptiveDecision.content, learnerId),
      instructionalContext:
        "FILUMIRE learner-facing adaptive-learning session.",
    });

  // Unlike best-effort analytics, this is an assessment integrity boundary:
  // never return a resumed assessment without recording its actual delivery.
  await recordAssessmentDelivery(learnerId, sessionId, adaptiveDecision.decision.interventionId,
    adaptiveDecision.decision.competencyId, adaptiveDecision.content);

  return {
    learnerState:
      updatedLearnerState,
    lessonReceipt: await issueLessonReceipt(learnerId, adaptiveDecision.decision.interventionId, adaptiveDecision.content),
    decision:
      adaptiveDecision.decision,
    content: sanitizeLearnerContent(adaptiveDecision.content, learnerId),
    nextCompetency:
      adaptiveDecision.nextCompetency,
    instruction,
    visuals: selectActivityVisuals(adaptiveDecision.content, updatedLearnerState.language === "fr" ? "fr" : "en", adaptiveDecision.decision.action),
    progress:
      buildProgress(updatedLearnerState),
  };
}

export async function GET(
  request: Request,
) {
  try {
    const identity =
      await resolveRequestIdentity(request);

    const url =
      new URL(request.url);

    if (url.searchParams.get("overview") === "1") {
      return NextResponse.json(
        await buildLearningOverview(
          identity.learnerId,
          url.searchParams.get("subjectId") ?? "",
          (await resolveLearningLanguage(request, identity.learnerId)) ?? "en",
        ),
      );
    }

    if (url.searchParams.get("dashboard") === "1") {
      // Displaying Home must not deliver questions, replay submissions or
      // activate an adaptive intervention. Existing evidence remains untouched.
      const context = await getOrCreateLearnerLearningContext(identity.learnerId);
      const states = await getLearnerStates(identity.learnerId);
      const state = states.find(item => item.competencies.some(c => c.competencyId === context.activeCompetencyId));
      const empty = { learnerId: identity.learnerId, competencies: [] };
      const learnerState = state ?? empty;
      // The page's language, without saving it: this view stays read-only.
      const progress = state ? buildProgress(state, (await resolveLearningLanguage(request, identity.learnerId)) ?? state.language) : {
        learnerId: identity.learnerId, competencyCount: 0, completedCompetencies: 0,
        masteryEstimate: 0, confidence: 0, evidenceCount: 0, readiness: false, percent: 0,
        subjectId: context.activeSubjectId,
        subjectName: getSubject(context.activeSubjectId)?.name,
      };
      return NextResponse.json({ learnerState, progress,
        decision: { id: "dashboard-display", sessionId: identity.sessionId ?? "", action: "display",
          competencyId: context.activeCompetencyId ?? "", reasonCode: "READ_ONLY_DASHBOARD" },
        instruction: { content: "" } }, { headers: { "cache-control": "no-store" } });
    }

    assertSameOrigin(request);
    const requestedSessionId =
      url.searchParams.get(
        "sessionId",
      );
    const sessionId =
      requestedSessionId ??
      identity.sessionId ??
      DEFAULT_SESSION_ID;

    const learnerId =
      identity.learnerId;

    if (
      identity.sessionId &&
      requestedSessionId &&
      sessionId !== identity.sessionId
    ) {
      return unauthorizedResponse(
        "Session does not belong to the authenticated learner.",
      );
    }

    if (
      identity.source ===
      "development-header"
    ) {
      await assertOwnedSession(
        sessionId,
        learnerId,
        true,
      );
    }

    const competencyId =
      identity.source === "production-session"
        ? await resolveProductionCompetencyId(
            url,
            learnerId,
          )
        : resolveInitialCompetencyId(
            url,
            identity.source,
          );

    let learnerState =
      await getLearnerState(
        learnerId,
        competencyId,
      );

    if (!learnerState) {
      learnerState =
        createInitialLearnerState(
          learnerId,
          competencyId,
        );

      await saveLearnerState(
        learnerState,
      );
    }

    /*
     * Phase 2: a topic the learner chose from the topic list
     * (competencyId, already validated against the learner's
     * subject and grade above) is the one learnt, even when its
     * stored state was saved with another topic first.
     */
    const selectedTopic =
      Boolean(url.searchParams.get("competencyId"));

    if (
      selectedTopic &&
      learnerState.competencies[0]?.competencyId !== competencyId
    ) {
      learnerState =
        await ensureCompetencyState(
          learnerId,
          learnerState,
          competencyId,
        );
    }

    const response =
      await buildLearningResponse(
        learnerId,
        sessionId,
        learnerState,
        await resolveLearningLanguage(request, learnerId),
        selectedTopic ? { selectedTopic: true } : {},
      );

    if (identity.source === "production-session" && !keepsCurrentTopic(response.decision)) {
      await updateActiveCompetency(
        learnerId,
        response.decision.competencyId,
      );
    }

    return NextResponse.json(
      response,
    );
  } catch (error) {
    if (error instanceof BadRequestError) return errorResponse(error, "learning request");
    if (
      error instanceof Error &&
      (
        error.message.includes(
          "Unauthenticated request",
        ) ||
        error.message.includes(
          "Invalid learner identity",
        ) ||
        error.message.includes(
          "Session does not belong to the authenticated learner",
        ) ||
        error.message.includes(
          "Session not found",
        ) ||
        error.message.includes(
          "Session is inactive",
        )
      )
    ) {
      return unauthorizedResponse(
        error.message,
      );
    }

      if (
        error instanceof Error &&
        error.message.includes(
          "Unknown curriculum selection",
        )
      ) {
        return notFoundResponse(error.message);
      }

    console.error(
      "FILUMIRE learning GET error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load learning session.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    assertSameOrigin(request);
    const identity =
      await resolveRequestIdentity(request);

    const body =
      (await readJsonBody(request)) as unknown as {
        learnerId?: string;
        sessionId: string;
        interventionId?: string;
        interactionType?: InteractionType;
        competencyId: string;
        outcome?: EvidenceOutcome;
        assessmentItemId?: string;
        response?: unknown;
        instructionalContext?: string;
        clientRequestId?: string;
      };

    const authenticatedLearnerId =
      identity.learnerId;

    if (
      identity.sessionId &&
      body.sessionId !==
        identity.sessionId
    ) {
      return unauthorizedResponse(
        "Session does not belong to the authenticated learner.",
      );
    }

    if (
      body.learnerId &&
      body.learnerId !==
        authenticatedLearnerId
    ) {
      return unauthorizedResponse(
        "Learner identity does not match the authenticated requester.",
      );
    }

    if (
      !body.sessionId ||
      !body.competencyId
    ) {
      return NextResponse.json(
        {
          error:
            "Session and competency are required.",
        },
        { status: 400 },
      );
    }

    try {
      assertKnownCompetency(
        body.competencyId,
      );
    } catch (error) {
      return notFoundResponse(
        error instanceof Error
          ? error.message
          : "Unknown competency.",
      );
    }

    if (
      identity.source ===
      "production-session"
    ) {
      const context =
        await getOrCreateLearnerLearningContext(
          authenticatedLearnerId,
        );
      const competencySubjectId =
        getCompetency(body.competencyId)?.subjectId;

      if (
        !getAvailableSubjectsForContext(context).some(
          (subject) =>
            subject.id === competencySubjectId,
        )
      ) {
        return notFoundResponse(
          "Unknown curriculum selection.",
        );
      }
    }

    if (
      identity.source ===
      "development-header"
    ) {
      await assertOwnedSession(
        body.sessionId,
        authenticatedLearnerId,
        true,
      );
    }

    const interactionType =
      body.interactionType ??
      "assessment";

    if (
      interactionType ===
        "retention" ||
      interactionType ===
        "transfer"
    ) {
      return NextResponse.json(
        {
          error:
            "Retention and transfer outcomes must be established by trusted evidence and cannot be supplied directly by the client.",
        },
        { status: 400 },
      );
    }

    /*
     * Tranche 4B: the learner pressed Next on a teaching card.
     * Marks that intervention delivered; records no evidence and
     * leaves mastery unchanged. Then returns the next decision.
     */
    if (
      interactionType ===
      "acknowledge"
    ) {
      if (
        !isNonEmptyString(
          body.interventionId,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Intervention is required.",
          },
          { status: 400 },
        );
      }

      const acknowledgement =
        await acknowledgeIntervention({
          interventionId:
            body.interventionId,
          learnerId:
            authenticatedLearnerId,
          competencyId:
            body.competencyId,
        });

      if (
        acknowledgement.status ===
        "not_found"
      ) {
        return notFoundResponse(
          "Intervention not found.",
        );
      }

      if (
        acknowledgement.status ===
          "not_instructional" ||
        acknowledgement.status ===
          "not_active"
      ) {
        return NextResponse.json(
          {
            error:
              "This learning step cannot be acknowledged.",
          },
          { status: 409 },
        );
      }

      const acknowledgedState =
        (await getLearnerState(
          authenticatedLearnerId,
          body.competencyId,
        )) ??
        createInitialLearnerState(
          authenticatedLearnerId,
          body.competencyId,
        );

      const acknowledgedResponse =
        await buildLearningResponse(
          authenticatedLearnerId,
          body.sessionId,
          acknowledgedState,
          await resolveLearningLanguage(request, authenticatedLearnerId),
        );

      if (identity.source === "production-session" && !keepsCurrentTopic(acknowledgedResponse.decision)) {
        await updateActiveCompetency(
          authenticatedLearnerId,
          acknowledgedResponse.decision.competencyId,
        );
      }

      return NextResponse.json({
        acknowledgement: {
          status:
            acknowledgement.status,
          interventionId:
            body.interventionId,
        },
        ...acknowledgedResponse,
      });
    }

    /*
     * Teaching-first (Phase 1): on a new topic's introduction the
     * learner chose "Check my knowledge first". Records no evidence
     * and changes no mastery; the engine starts the diagnostic check
     * instead of the explanation. Has no effect once the topic has
     * answers. Only a topic the learner has already opened.
     */
    if (
      interactionType ===
      "check_first"
    ) {
      const checkState =
        await getLearnerState(
          authenticatedLearnerId,
          body.competencyId,
        );

      if (!checkState) {
        return NextResponse.json(
          {
            error:
              "This learning step cannot be changed.",
          },
          { status: 409 },
        );
      }

      const checkResponse =
        await buildLearningResponse(
          authenticatedLearnerId,
          body.sessionId,
          checkState,
          await resolveLearningLanguage(request, authenticatedLearnerId),
          { checkKnowledgeFirst: true },
        );

      if (identity.source === "production-session" && !keepsCurrentTopic(checkResponse.decision)) {
        await updateActiveCompetency(
          authenticatedLearnerId,
          checkResponse.decision.competencyId,
        );
      }

      return NextResponse.json(checkResponse);
    }

    if (
      interactionType !==
      "assessment"
    ) {
      return NextResponse.json(
        {
          error:
            "Unsupported learning interaction.",
        },
        { status: 400 },
      );
    }

    if (
      !body.assessmentItemId
    ) {
      return NextResponse.json(
        {
          error:
            "Assessment item is required.",
        },
        { status: 400 },
      );
    }

    if (
      !isNonEmptyString(
        body.response,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Assessment response is required.",
        },
        { status: 400 },
      );
    }

    const submission:
      AssessmentSubmission = {
      learnerId:
        authenticatedLearnerId,
      sessionId:
        body.sessionId,
      interventionId:
        body.interventionId,
      assessmentItemId:
        body.assessmentItemId,
      competencyId:
        body.competencyId,
      response:
        body.response,
      clientRequestId:
        body.clientRequestId,
    };

    const recoveredDelivery = await recoveredAssessmentDelivery(authenticatedLearnerId, body.sessionId,
      body.competencyId, body.assessmentItemId, body.interventionId);
    if (!recoveredDelivery.allowed) {
      return NextResponse.json({error: "Reopen the lesson before submitting this recovered assessment.",
        code: "assessment_delivery_required"}, {status:409,headers:{"cache-control":"no-store"}});
    }
    if (recoveredDelivery.required) submission.interventionId = recoveredDelivery.interventionId;

    const assessmentContent =
      getContentForCompetency(
        body.competencyId,
      ).find(
        (content) =>
          (
            content.type ===
              "assessment" ||
            content.type ===
              "practice"
          ) &&
          content.assessmentItemId ===
            body.assessmentItemId,
      );

    if (!assessmentContent) {
      console.warn(
        "FILUMIRE learning: assessment processing failure",
        {
          reason: "content not found",
          competencyId: body.competencyId,
          assessmentItemId: body.assessmentItemId,
        },
      );

      return NextResponse.json(
        {
          error:
            "Assessment item not found for the requested competency.",
        },
        { status: 404 },
      );
    }

    if (
      assessmentContent.metadata
        ?.evaluationMethod ===
      "trusted_rubric_evaluation"
    ) {
      const pending =
        await submitPendingTeacherReview({
          learnerId:
            authenticatedLearnerId,
          competencyId:
            body.competencyId,
          assessmentItemId:
            body.assessmentItemId,
          contentId:
            assessmentContent.id,
          sessionId:
            body.sessionId,
          response:
            body.response,
          clientRequestId:
            body.clientRequestId,
        });

      return NextResponse.json({
        pendingTeacherReview: {
          id: pending.review.id,
          status: pending.review.status,
          duplicate:
            pending.duplicate,
        },
      });
    }

    const spacedReview = supportsSpacedRevision(body.competencyId) && assessmentContent.metadata?.assessmentPurpose === "retention";
    if (spacedReview) {
      const intervention = body.interventionId ? await getIntervention(body.interventionId) : undefined;
      if (!intervention || intervention.learnerId !== authenticatedLearnerId || intervention.competencyId !== body.competencyId || intervention.type !== "retention_check") {
        return NextResponse.json({ error: "Reopen your review before answering." }, { status: 409 });
      }
      const delivered = (await getPilotMeasurementEvents(authenticatedLearnerId)).some(event =>
        event.eventType === "learning_presented" && event.competencyId === body.competencyId &&
        event.metadata.source === "assessment-delivery-v1" && event.metadata.interventionId === intervention.interventionId &&
        event.metadata.assessmentItemId === body.assessmentItemId);
      if (!delivered) return NextResponse.json({ error: "Reopen your review before answering." }, { status: 409 });
      // One score per delivered review, even with different client retry keys.
      submission.clientRequestId = "revision-" + createHash("sha256").update(`${authenticatedLearnerId}:${intervention.interventionId}`).digest("hex").slice(0, 48);
    }

    const expectedResponse =
      assessmentContent.metadata
        ?.expectedResponse;

    if (
      expectedResponse ===
      undefined
    ) {
      console.error(
        "FILUMIRE learning: assessment processing failure",
        {
          reason: "content missing trusted expected response",
          competencyId: body.competencyId,
          assessmentItemId: body.assessmentItemId,
        },
      );

      return NextResponse.json(
        {
          error:
            "Assessment item has no trusted expected response.",
        },
        { status: 500 },
      );
    }

    const assessment =
      await evaluateAssessment(
        submission,
        expectedResponse,
        assessmentContent.id,
        assessmentContent.metadata,
      );

    /*
     * Evidence and its learner-state effect are committed
     * together as one atomic operation, so a partial failure
     * (or a concurrent duplicate retry) can never leave
     * evidence persisted without its mastery/progress effect,
     * or vice versa.
     */
    const { learnerState, isNewEvidence } =
      await saveEvidenceAndUpdateLearnerState(
        assessment.evidence,
        body.competencyId,
        (currentState, isNew, evidenceHistory) => {
          const baseState =
            currentState ??
            createInitialLearnerState(
              authenticatedLearnerId,
              body.competencyId,
            );

          return isNew
            ? applyEvidence(
                baseState,
                assessment.evidence,
                evidenceHistory,
              )
            : baseState;
        },
      );


    if (!isNewEvidence && spacedReview) {
      const recorded = (await getEvidence(authenticatedLearnerId, body.competencyId)).find(item => item.id === assessment.evidence.id);
      if (recorded) {
        assessment.evidence = recorded;
        assessment.result.correct = recorded.outcome === "correct";
      }
    }

    if (isNewEvidence) {
      await recordPilotEventSafely({
        learnerId:
          authenticatedLearnerId,
        competencyId:
          body.competencyId,
        sessionId:
          body.sessionId,
        subjectId:
          getCompetency(
            body.competencyId,
          )?.subjectId,
        eventType: "evidence_recorded",
        clientRequestId:
          `evidence:${assessment.evidence.id}`,
        metadata: {
          outcome:
            assessment.evidence.outcome,
          source:
            assessment.evidence.source,
        },
      });
    }

    // After a spaced review, continue from the learner's current topic,
    // not from the earlier topic that was reviewed.
    let responseState = learnerState;
    if (spacedReview && identity.source === "production-session") {
      // The review may belong to a subject other than the active one: continue
      // from the topic that subject's learning screen opens on.
      const currentCompetencyId = getCurrentCompetencyForSubject(
        await getOrCreateLearnerLearningContext(authenticatedLearnerId),
        getCompetency(body.competencyId)?.subjectId ?? "",
      );
      if (currentCompetencyId && currentCompetencyId !== body.competencyId) {
        responseState = (await getLearnerState(authenticatedLearnerId, currentCompetencyId)) ?? learnerState;
      }
    }

    const response =
      await buildLearningResponse(
        authenticatedLearnerId,
        body.sessionId,
        responseState,
        await resolveLearningLanguage(request, authenticatedLearnerId),
      );

    if (identity.source === "production-session" && !keepsCurrentTopic(response.decision)) {
      await updateActiveCompetency(
        authenticatedLearnerId,
        response.decision.competencyId,
      );
    }

    return NextResponse.json({
      assessment: {
        ...assessment,
        result: {
          ...assessment.result,
          duplicate: !isNewEvidence,
        },
      },
      ...response,
    });
  } catch (error) {
    if (error instanceof BadRequestError) return errorResponse(error, "learning submission");
    if (
      error instanceof Error &&
      (
        error.message.includes(
          "Unauthenticated request",
        ) ||
        error.message.includes(
          "Invalid learner identity",
        ) ||
        error.message.includes(
          "Session does not belong to the authenticated learner",
        ) ||
        error.message.includes(
          "Session not found",
        ) ||
        error.message.includes(
          "Session is inactive",
        )
      )
    ) {
      return unauthorizedResponse(
        error.message,
      );
    }

    console.error(
      "FILUMIRE learning POST error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Learning interaction failed.",
      },
      { status: 500 },
    );
  }
}










