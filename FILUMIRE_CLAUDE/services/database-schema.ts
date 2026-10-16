import {
  pgTable,
  primaryKey,
  text,
  jsonb,
  integer,
  real,
  timestamp,
  unique,
  check,
  uniqueIndex,
  index,
  boolean,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const principals = pgTable("principals", {
  id: text("id").primaryKey(),

  status: text("status")
    .notNull()
    .default("active"),

  createdAt: timestamp(
    "created_at",
    {
      withTimezone: true,
    },
  )
    .notNull()
    .defaultNow(),

  updatedAt: timestamp(
    "updated_at",
    {
      withTimezone: true,
    },
  )
    .notNull()
    .defaultNow(),
});

export const externalIdentities = pgTable(
  "external_identities",
  {
    id: text("id").primaryKey(),

    principalId: text(
      "principal_id",
    )
      .notNull()
      .references(
        () => principals.id,
        { onDelete: "restrict" },
      ),

    providerNamespace: text(
      "provider_namespace",
    ).notNull(),

    providerSubject: text(
      "provider_subject",
    ).notNull(),

    createdAt: timestamp(
      "created_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),

    updatedAt: timestamp(
      "updated_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique(
      "external_identities_provider_namespace_provider_subject_unique",
    ).on(
      table.providerNamespace,
      table.providerSubject,
    ),
  ],
);

export const learners = pgTable("learners", {
  id: text("id").primaryKey(),

  status: text("status")
    .notNull()
    .default("active"),

  createdAt: timestamp(
    "created_at",
    {
      withTimezone: true,
    },
  )
    .notNull()
    .defaultNow(),

  updatedAt: timestamp(
    "updated_at",
    {
      withTimezone: true,
    },
  )
    .notNull()
    .defaultNow(),
});

export const principalLearnerAccess = pgTable(
  "principal_learner_access",
  {
    id: text("id").primaryKey(),

    principalId: text(
      "principal_id",
    )
      .notNull()
      .references(
        () => principals.id,
        { onDelete: "restrict" },
      ),

    learnerId: text(
      "learner_id",
    )
      .notNull()
      .references(
        () => learners.id,
        { onDelete: "restrict" },
      ),

    relationshipType: text(
      "relationship_type",
    ).notNull(),

    status: text("status")
      .notNull()
      .default("active"),

    createdAt: timestamp(
      "created_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),

    updatedAt: timestamp(
      "updated_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique(
      "principal_learner_access_principal_learner_relationship_unique",
    ).on(
      table.principalId,
      table.learnerId,
      table.relationshipType,
    ),
  ],
);

export const authSessions = pgTable("auth_sessions", {
  id: text("id").primaryKey(),

  principalId: text(
    "principal_id",
  )
    .notNull()
    .references(
      () => principals.id,
      { onDelete: "restrict" },
    ),

  status: text("status")
    .notNull()
    .default("active"),

  createdAt: timestamp(
    "created_at",
    {
      withTimezone: true,
    },
  )
    .notNull()
    .defaultNow(),

  expiresAt: timestamp(
    "expires_at",
    {
      withTimezone: true,
    },
  ).notNull(),

  lastActivityAt: timestamp(
    "last_activity_at",
    {
      withTimezone: true,
    },
  )
    .notNull()
    .defaultNow(),

  revokedAt: timestamp(
    "revoked_at",
    {
      withTimezone: true,
    },
  ),

  updatedAt: timestamp(
    "updated_at",
    {
      withTimezone: true,
    },
  )
    .notNull()
    .defaultNow(),
});

/*
 * Built-in FILUMIRE sign-in. One credential per Principal:
 * guardians sign in with an email address, learners with a
 * username their guardian chose. Only a salted scrypt hash of
 * the password is stored. failed_attempt_count / locked_until
 * back the per-account lockout (services/account).
 */
export const accountCredentials = pgTable(
  "account_credentials",
  {
    id: text("id").primaryKey(),
    principalId: text("principal_id")
      .notNull()
      .references(() => principals.id, { onDelete: "restrict" }),
    accountKind: text("account_kind").notNull(),
    loginIdentifier: text("login_identifier").notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordUpdatedAt: timestamp("password_updated_at", { withTimezone: true }).notNull().defaultNow(),
    failedAttemptCount: integer("failed_attempt_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true }),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("account_credentials_principal_id_unique").on(table.principalId),
    unique("account_credentials_login_identifier_unique").on(table.loginIdentifier),
    check(
      "account_credentials_account_kind_check",
      sql`${table.accountKind} in ('guardian', 'learner', 'teacher')`,
    ),
  ],
);

/*
 * Display details for an adult account. The email address is
 * the guardian's login identifier and is not repeated here.
 */
export const accountProfiles = pgTable("account_profiles", {
  principalId: text("principal_id")
    .primaryKey()
    .references(() => principals.id, { onDelete: "restrict" }),
  displayName: text("display_name").notNull(),
  preferredLanguage: text("preferred_language").notNull().default("en"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/*
 * What a learner is called inside FILUMIRE and how their app is
 * set up. Deliberately minimal: a first name or nickname, an
 * avatar and a language. No date of birth, email, school or
 * contact details are collected for children.
 */
export const learnerProfiles = pgTable("learner_profiles", {
  learnerId: text("learner_id")
    .primaryKey()
    .references(() => learners.id, { onDelete: "restrict" }),
  displayName: text("display_name").notNull(),
  avatarId: text("avatar_id"),
  preferredLanguage: text("preferred_language").notNull().default("en"),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  // The learner's own sign-in Principal (relationship 'self').
  signInPrincipalId: text("sign_in_principal_id")
    .references(() => principals.id, { onDelete: "restrict" }),
  createdByPrincipalId: text("created_by_principal_id")
    .notNull()
    .references(() => principals.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/*
 * An append-only record of what a guardian agreed to, against
 * which notice version, and how. verification_status stays
 * 'unverified' for a self-declared checkbox: it records the
 * declaration, it does not prove parental identity.
 */
export const guardianConsentRecords = pgTable(
  "guardian_consent_records",
  {
    id: text("id").primaryKey(),
    guardianPrincipalId: text("guardian_principal_id")
      .notNull()
      .references(() => principals.id, { onDelete: "restrict" }),
    learnerId: text("learner_id").references(() => learners.id, { onDelete: "restrict" }),
    consentType: text("consent_type").notNull(),
    noticeVersion: text("notice_version").notNull(),
    method: text("method").notNull(),
    verificationStatus: text("verification_status").notNull().default("unverified"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  },
  (table) => [
    index("guardian_consent_records_guardian_idx").on(table.guardianPrincipalId),
    index("guardian_consent_records_learner_idx").on(table.learnerId),
  ],
);

/*
 * One-time codes a guardian creates so a teacher can link to one
 * of their learners. Only a SHA-256 of the code is stored; a code
 * works once, before expires_at, unless revoked.
 */
export const teacherLinkCodes = pgTable(
  "teacher_link_codes",
  {
    id: text("id").primaryKey(),
    codeHash: text("code_hash").notNull(),
    learnerId: text("learner_id")
      .notNull()
      .references(() => learners.id, { onDelete: "restrict" }),
    createdByPrincipalId: text("created_by_principal_id")
      .notNull()
      .references(() => principals.id, { onDelete: "restrict" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    usedByPrincipalId: text("used_by_principal_id")
      .references(() => principals.id, { onDelete: "restrict" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("teacher_link_codes_code_hash_unique").on(table.codeHash),
    index("teacher_link_codes_learner_idx").on(table.learnerId),
  ],
);

/*
 * Shared fixed-window counters for sign-in and account endpoints
 * (services/account/rate-limit). key_hash is a SHA-256 of the
 * limit's key, so no address or login name is stored.
 */
export const authRateLimits = pgTable(
  "auth_rate_limits",
  {
    keyHash: text("key_hash").primaryKey(),
    requestCount: integer("request_count").notNull(),
    windowEndsAt: timestamp("window_ends_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("auth_rate_limits_window_ends_at_idx").on(table.windowEndsAt),
  ],
);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),

  learnerId: text(
    "learner_id",
  )
    .notNull()
    .references(
      () => learners.id,
      { onDelete: "restrict" },
    ),

  createdAt: timestamp(
    "created_at",
    {
      withTimezone: true,
    },
  ).notNull(),

  lastActivityAt: timestamp(
    "last_activity_at",
    {
      withTimezone: true,
    },
  ).notNull(),

  status: text(
    "status",
  ).notNull(),
});

export const learnerStates =
  pgTable(
    "learner_states",
    {
      learnerId: text(
        "learner_id",
      )
        .notNull()
        .references(
          () => learners.id,
          { onDelete: "restrict" },
        ),

      competencyId: text(
        "competency_id",
      ).notNull(),

      state: jsonb(
        "state",
      ).notNull(),

      evidenceCount: integer(
        "evidence_count",
      ).notNull(),

      masteryEstimate: real(
        "mastery_estimate",
      ).notNull(),

      confidence: real(
        "confidence",
      ).notNull(),

      lastUpdated: timestamp(
        "last_updated",
        {
          withTimezone: true,
        },
      ).notNull(),
    },
    (table) => [
      primaryKey({
        columns: [
          table.learnerId,
          table.competencyId,
        ],
        name: "learner_states_learner_competency_pk",
      }),
    ],
  );

export const learningEvidence =
  pgTable(
    "learning_evidence",
    {
      id: text("id")
        .primaryKey()
        .notNull(),

      learnerId: text(
        "learner_id",
      )
        .notNull()
        .references(
          () => learners.id,
          { onDelete: "restrict" },
        ),

      competencyId: text(
        "competency_id",
      ).notNull(),

      source: text(
        "source",
      ).notNull(),

      outcome: text(
        "outcome",
      ).notNull(),

      timestamp: timestamp(
        "timestamp",
        {
          withTimezone: true,
        },
      ).notNull(),

      assessmentItemId:
        text(
          "assessment_item_id",
        ),

      sessionId: text(
        "session_id",
      ),

      contentId: text(
        "content_id",
      ),

      policyVersion: text(
        "policy_version",
      ).notNull(),

      errorPattern: text(
        "error_pattern",
      ),

      diagnosticState: text(
        "diagnostic_state",
      ),

      diagnosticConfidence:
        real(
          "diagnostic_confidence",
        ),

      interventionType:
        text(
          "intervention_type",
        ),

      interventionId:
        text(
          "intervention_id",
        ),

      instructionalStrategy:
        text(
          "instructional_strategy",
        ),

      responseMode:
        text(
          "response_mode",
        ),

      purpose:
        text(
          "purpose",
        ),

      independence:
        text(
          "independence",
        ),

      supportLevel:
        real(
          "support_level",
        ),

      difficulty:
        text(
          "difficulty",
        ),

      representation:
        text(
          "representation",
        ),

      strength:
        text(
          "strength",
        ),

      errorClass:
        text(
          "error_class",
        ),

      prerequisiteCompetencyId:
        text(
          "prerequisite_competency_id",
        ),

      misconceptionId:
        text(
          "misconception_id",
        ),

      exposureCount:
        integer(
          "exposure_count",
        ),

      /*
       * Evidence V1.1 (8 Oct 2026): previously dropped on Postgres. contextTags
       * feeds mastery variation; without it learners could not reach mastery.
       */
      attemptCount:
        integer(
          "attempt_count",
        ),

      contextTags:
        jsonb(
          "context_tags",
        ),

      evaluatorType:
        text(
          "evaluator_type",
        ),

      evaluatorId:
        text(
          "evaluator_id",
        ),

      evaluationPolicyVersion:
        text(
          "evaluation_policy_version",
        ),

      interpretationVersion:
        text(
          "interpretation_version",
        ),
    },
  );
export const interventions =
  pgTable(
    "interventions",
    {
      interventionId:
        text(
          "intervention_id",
        )
          .primaryKey()
          .notNull(),

      learnerId:
        text(
          "learner_id",
        )
          .notNull()
          .references(
            () => learners.id,
            { onDelete: "restrict" },
          ),

      competencyId:
        text(
          "competency_id",
        ).notNull(),

      sessionId:
        text(
          "session_id",
        ).notNull(),

      decisionId:
        text(
          "decision_id",
        ).notNull(),

      type:
        text(
          "type",
        ).notNull(),

      status:
        text(
          "status",
        ).notNull(),

      startedAt:
        timestamp(
          "started_at",
          {
            withTimezone: true,
          },
        ).notNull(),

      completedAt:
        timestamp(
          "completed_at",
          {
            withTimezone: true,
          },
        ),

      outcome:
        text(
          "outcome",
        ).notNull(),

      evidenceIds:
        jsonb(
          "evidence_ids",
        ).notNull(),

      policyVersion:
        text(
          "policy_version",
        ).notNull(),

      createdAt:
        timestamp(
          "created_at",
          {
            withTimezone: true,
          },
        ).notNull(),

      updatedAt:
        timestamp(
          "updated_at",
          {
            withTimezone: true,
          },
        ).notNull(),
    },
  );

export const learnerLearningContext =
  pgTable(
    "learner_learning_context",
    {
      learnerId:
        text(
          "learner_id",
        )
          .primaryKey()
          .notNull()
          .references(
            () => learners.id,
            { onDelete: "restrict" },
          ),

      curriculumVersionId:
        text(
          "curriculum_version_id",
        ).notNull(),

      gradeId:
        text(
          "grade_id",
        ).notNull(),

      activeSubjectId:
        text(
          "active_subject_id",
        ).notNull(),

      activeCompetencyId:
        text(
          "active_competency_id",
        ),

      // 'guardian' | 'learner'; null when nobody chose the grade.
      gradeSetBy:
        text(
          "grade_set_by",
        ),

      updatedAt:
        timestamp(
          "updated_at",
          {
            withTimezone: true,
          },
        )
          .notNull()
          .defaultNow(),
    },
  );



export const pendingTeacherReviews =
  pgTable(
    "pending_teacher_reviews",
    {
      id: text("id")
        .primaryKey()
        .notNull(),

      learnerId: text("learner_id")
        .notNull()
        .references(
          () => learners.id,
          { onDelete: "restrict" },
        ),

      competencyId:
        text("competency_id").notNull(),

      assessmentItemId:
        text("assessment_item_id").notNull(),

      contentId:
        text("content_id"),

      sessionId:
        text("session_id").notNull(),

      response:
        text("response").notNull(),

      status:
        text("status").notNull(),

      submittedAt:
        timestamp(
          "submitted_at",
          { withTimezone: true },
        ).notNull(),

      reviewedAt:
        timestamp(
          "reviewed_at",
          { withTimezone: true },
        ),

      reviewedByPrincipalId:
        text("reviewed_by_principal_id"),

      evidenceId:
        text("evidence_id"),
    },
  );

export const teacherProfessionalNotes =
  pgTable(
    "teacher_professional_notes",
    {
      id: text("id")
        .primaryKey()
        .notNull(),

      learnerId: text("learner_id")
        .notNull()
        .references(
          () => learners.id,
          { onDelete: "restrict" },
        ),

      competencyId:
        text("competency_id"),

      authorPrincipalId:
        text("author_principal_id").notNull(),

      noteType:
        text("note_type").notNull(),

      text:
        text("text").notNull(),

      createdAt:
        timestamp(
          "created_at",
          { withTimezone: true },
        ).notNull(),
    },
  );

export const parentTeacherMessages =
  pgTable(
    "parent_teacher_messages",
    {
      id: text("id")
        .primaryKey()
        .notNull(),

      learnerId: text("learner_id")
        .notNull()
        .references(
          () => learners.id,
          { onDelete: "restrict" },
        ),

      authorPrincipalId:
        text("author_principal_id").notNull(),

      senderRole:
        text("sender_role").notNull(),

      text:
        text("text").notNull(),

      createdAt:
        timestamp(
          "created_at",
          { withTimezone: true },
        ).notNull(),
    },
  );

export const controlledTeacherActions =
  pgTable(
    "controlled_teacher_actions",
    {
      id: text("id")
        .primaryKey()
        .notNull(),

      learnerId: text("learner_id")
        .notNull()
        .references(
          () => learners.id,
          { onDelete: "restrict" },
        ),

      competencyId:
        text("competency_id").notNull(),

      teacherPrincipalId:
        text("teacher_principal_id").notNull(),

      actionType:
        text("action_type").notNull(),

      reason:
        text("reason"),

      status:
        text("status").notNull(),

      createdAt:
        timestamp(
          "created_at",
          { withTimezone: true },
        ).notNull(),

      resolvedAt:
        timestamp(
          "resolved_at",
          { withTimezone: true },
        ),
    },
  );

export const pilotMeasurementEvents =
  pgTable(
    "pilot_measurement_events",
    {
      id: text("id")
        .primaryKey()
        .notNull(),

      learnerId: text("learner_id")
        .notNull()
        .references(
          () => learners.id,
          { onDelete: "restrict" },
        ),

      competencyId:
        text("competency_id"),

      sessionId:
        text("session_id"),

      subjectId:
        text("subject_id"),

      eventType:
        text("event_type").notNull(),

      metadata:
        jsonb("metadata").notNull(),

      measurementVersion:
        text("measurement_version").notNull(),

      createdAt:
        timestamp(
          "created_at",
          { withTimezone: true },
        ).notNull(),
    },
  );


/*
 * Payments Phase 2, step 2: durable payment attempts (migration 0018).
 * Provider-independent; no card data, tokens, checkout URLs, payer contact
 * details or raw provider payloads are stored. obligationId identifies the
 * specific purchase being paid for (a future obligations/checkout table);
 * duplicate prevention is per obligation, never per payer. Triggers added in
 * 0018 enforce the lifecycle, make succeeded attempts immutable and make the
 * event log append-only (see docs/handoff/PAYMENTS_PHASE2_STEP2.md).
 */
export const paymentAttempts = pgTable(
  "payment_attempts",
  {
    id: text("id").primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    obligationId: text("obligation_id").notNull(),
    ourReference: text("our_reference").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    provider: text("provider").notNull(),
    mode: text("mode").notNull(),
    providerReference: text("provider_reference"),
    payerPrincipalId: text("payer_principal_id")
      .notNull()
      .references(() => principals.id, { onDelete: "restrict" }),
    billingAccountId: text("billing_account_id"),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull(),
    observedStatus: text("observed_status"),
    observedAmountMinor: integer("observed_amount_minor"),
    observedCurrency: text("observed_currency"),
    verificationFailures: jsonb("verification_failures"),
    lastErrorCode: text("last_error_code"),
    verifyCount: integer("verify_count").notNull().default(0),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("payment_attempts_idempotency_key_unique").on(table.idempotencyKey),
    unique("payment_attempts_our_reference_unique").on(table.ourReference),
    unique("payment_attempts_provider_reference_unique").on(table.provider, table.providerReference),
    uniqueIndex("payment_attempts_one_active_per_obligation")
      .on(table.obligationId)
      .where(sql`status in ('created', 'pending', 'unknown')`),
    uniqueIndex("payment_attempts_one_success_per_obligation")
      .on(table.obligationId)
      .where(sql`status = 'succeeded'`),
    index("payment_attempts_status_updated_idx").on(table.status, table.updatedAt),
    index("payment_attempts_payer_idx").on(table.payerPrincipalId),
    check("payment_attempts_status_check", sql`${table.status} in ('created', 'pending', 'unknown', 'succeeded', 'failed', 'needs_review')`),
    check("payment_attempts_mode_check", sql`${table.mode} in ('sandbox', 'live')`),
    check("payment_attempts_provider_check", sql`${table.provider} ~ '^[a-z][a-z0-9_]{1,31}$'`),
    check("payment_attempts_amount_check", sql`${table.amountMinor} > 0`),
    check("payment_attempts_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check("payment_attempts_obligation_check", sql`length(${table.obligationId}) between 1 and 200`),
    check("payment_attempts_verify_count_check", sql`${table.verifyCount} >= 0`),
    check(
      "payment_attempts_succeeded_check",
      sql`${table.status} <> 'succeeded' or (${table.observedStatus} = 'successful' and ${table.observedAmountMinor} = ${table.amountMinor} and ${table.observedCurrency} = ${table.currency} and ${table.confirmedAt} is not null and ${table.providerReference} is not null)`,
    ),
    /* 0019 (additive): every attempt is bound to its obligation's payer, amount, currency and mode. */
    unique("payment_attempts_obligation_binding_unique").on(table.id, table.obligationId, table.provider, table.mode),
    foreignKey({
      name: "payment_attempts_obligation_fk",
      columns: [table.obligationId, table.payerPrincipalId, table.amountMinor, table.currency, table.mode],
      foreignColumns: [
        paymentObligations.id,
        paymentObligations.payerPrincipalId,
        paymentObligations.amountMinor,
        paymentObligations.currency,
        paymentObligations.mode,
      ],
    }).onDelete("restrict"),
  ],
);

export const paymentAttemptEvents = pgTable(
  "payment_attempt_events",
  {
    id: text("id").primaryKey(),
    attemptId: text("attempt_id")
      .notNull()
      .references(() => paymentAttempts.id, { onDelete: "restrict" }),
    sequence: integer("sequence").notNull(),
    eventType: text("event_type").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    detail: jsonb("detail").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("payment_attempt_events_attempt_sequence_unique").on(table.attemptId, table.sequence),
    uniqueIndex("payment_attempt_events_one_success_per_attempt")
      .on(table.attemptId)
      .where(sql`to_status = 'succeeded'`),
    check("payment_attempt_events_sequence_check", sql`${table.sequence} >= 1`),
    check("payment_attempt_events_type_check", sql`${table.eventType} ~ '^[a-z][a-z_]{2,48}$'`),
  ],
);

/*
 * Payments Phase 2, step 3: obligations, beneficiary evidence, receipts,
 * financial exceptions and obligation events (migration 0019, B3; design in
 * docs/handoff/PAYMENTS_PHASE2_STEP3_STAGE_A.md, review in
 * docs/handoff/PAYMENTS_PHASE2_STEP3_B3.md). Sandbox only: a live obligation
 * is impossible at database level until a later approved migration.
 * Hand-written parts of 0019 (not representable here, same accepted pattern as
 * 0018): the empty-table precondition, the circular settlement FK
 * (payment_obligations -> payment_receipts, DEFERRABLE), canonical-hash
 * functions, guard/seal/insert triggers.
 */
const PAYMENT_EXCEPTION_KINDS_SQL = sql.raw(
  "'amount_mismatch', 'currency_mismatch', 'identity_mismatch', 'attempt_needs_review', 'duplicate_charge', " +
    "'success_after_failed', 'success_after_cancel', 'success_after_expiry', 'success_during_review', " +
    "'beneficiary_authorization_revoked', 'provider_record_missing', 'initiated_after_resolution', " +
    "'reversal_reported', 'post_settlement_status_change'",
);
const OBLIGATION_STATUSES_SQL = sql.raw("'open', 'settled', 'cancelled', 'expired', 'review'");

export const paymentObligations = pgTable(
  "payment_obligations",
  {
    id: text("id").primaryKey(),
    payerPrincipalId: text("payer_principal_id").notNull(),
    creationKey: text("creation_key").notNull(),
    productCode: text("product_code").notNull(),
    productVersion: text("product_version").notNull(),
    productLabel: text("product_label").notNull(),
    productTerms: jsonb("product_terms").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),
    mode: text("mode").notNull(),
    beneficiaryCount: integer("beneficiary_count").notNull(),
    snapshotHash: text("snapshot_hash").notNull(),
    status: text("status").notNull(),
    sealedAt: timestamp("sealed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    settledReceiptId: text("settled_receipt_id"),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ name: "payment_obligations_payer_fk", columns: [table.payerPrincipalId], foreignColumns: [principals.id] }).onDelete("restrict"),
    unique("payment_obligations_payer_creation_key_unique").on(table.payerPrincipalId, table.creationKey),
    /* Target of payment_attempts_obligation_fk. */
    unique("payment_obligations_binding_unique").on(table.id, table.payerPrincipalId, table.amountMinor, table.currency, table.mode),
    unique("payment_obligations_settled_receipt_unique").on(table.settledReceiptId),
    index("payment_obligations_payer_created_idx").on(table.payerPrincipalId, table.createdAt),
    index("payment_obligations_open_expiry_idx").on(table.expiresAt).where(sql`status = 'open'`),
    check("payment_obligations_id_check", sql`${table.id} ~ '^[A-Za-z0-9._:-]{1,200}$'`),
    check("payment_obligations_creation_key_check", sql`${table.creationKey} ~ '^[A-Za-z0-9._:-]{8,200}$'`),
    check("payment_obligations_product_code_check", sql`${table.productCode} ~ '^[a-z][a-z0-9_]{2,63}$'`),
    check("payment_obligations_product_version_check", sql`${table.productVersion} ~ '^[A-Za-z0-9._-]{1,32}$'`),
    /* Blank = only JS String.prototype.trim() whitespace (btrim() would strip spaces only). Length in code points. */
    check(
      "payment_obligations_product_label_check",
      sql`length(${table.productLabel}) between 1 and 120 and ${table.productLabel} !~ '^[ \\t\\n\\v\\f\\r\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff]*$'`,
    ),
    check("payment_obligations_terms_check", sql`jsonb_typeof(${table.productTerms}) = 'object'`),
    check("payment_obligations_amount_check", sql`${table.amountMinor} > 0`),
    check("payment_obligations_currency_check", sql`${table.currency} = 'GHS'`),
    check("payment_obligations_sandbox_only_check", sql`${table.mode} = 'sandbox'`),
    check("payment_obligations_beneficiary_count_check", sql`${table.beneficiaryCount} between 1 and 20`),
    check("payment_obligations_snapshot_hash_check", sql`${table.snapshotHash} ~ '^[0-9a-f]{64}$'`),
    check("payment_obligations_status_check", sql`${table.status} in (${OBLIGATION_STATUSES_SQL})`),
    check("payment_obligations_expiry_check", sql`${table.expiresAt} > ${table.createdAt}`),
    check("payment_obligations_settled_receipt_check", sql`(${table.status} = 'settled') = (${table.settledReceiptId} is not null)`),
    check("payment_obligations_settled_at_check", sql`(${table.settledReceiptId} is null) = (${table.settledAt} is null)`),
  ],
);

/* Immutable authorisation evidence: one row per beneficiary (policy guardian_v1). */
export const paymentObligationBeneficiaries = pgTable(
  "payment_obligation_beneficiaries",
  {
    obligationId: text("obligation_id").notNull(),
    learnerId: text("learner_id").notNull(),
    accessId: text("access_id").notNull(),
    policyCode: text("policy_code").notNull(),
    relationshipType: text("relationship_type").notNull(),
    authorizedAt: timestamp("authorized_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ name: "payment_obligation_beneficiaries_pk", columns: [table.obligationId, table.learnerId] }),
    foreignKey({ name: "payment_obligation_beneficiaries_obligation_fk", columns: [table.obligationId], foreignColumns: [paymentObligations.id] }).onDelete("restrict"),
    foreignKey({ name: "payment_obligation_beneficiaries_learner_fk", columns: [table.learnerId], foreignColumns: [learners.id] }).onDelete("restrict"),
    foreignKey({ name: "payment_obligation_beneficiaries_access_fk", columns: [table.accessId], foreignColumns: [principalLearnerAccess.id] }).onDelete("restrict"),
    index("payment_obligation_beneficiaries_learner_idx").on(table.learnerId),
    index("payment_obligation_beneficiaries_access_idx").on(table.accessId),
    check("payment_obligation_beneficiaries_learner_check", sql`${table.learnerId} ~ '^[A-Za-z0-9._:-]{1,200}$'`),
    check("payment_obligation_beneficiaries_policy_check", sql`${table.policyCode} = 'guardian_v1'`),
    check("payment_obligation_beneficiaries_relationship_check", sql`${table.relationshipType} = 'guardian'`),
  ],
);

/* Financial events: one row per provider-confirmed successful charge that is identifiably ours (any amount). */
export const paymentReceipts = pgTable(
  "payment_receipts",
  {
    id: text("id").primaryKey(),
    attemptId: text("attempt_id").notNull(),
    obligationId: text("obligation_id").notNull(),
    provider: text("provider").notNull(),
    mode: text("mode").notNull(),
    merchantContext: text("merchant_context").notNull(),
    providerReference: text("provider_reference").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("payment_receipts_attempt_unique").on(table.attemptId),
    unique("payment_receipts_provider_charge_unique").on(table.provider, table.mode, table.merchantContext, table.providerReference),
    /* Target of the settlement FK (hand-written in 0019). */
    unique("payment_receipts_settlement_binding_unique").on(table.id, table.obligationId, table.amountMinor, table.currency, table.mode),
    foreignKey({ name: "payment_receipts_obligation_fk", columns: [table.obligationId], foreignColumns: [paymentObligations.id] }).onDelete("restrict"),
    foreignKey({
      name: "payment_receipts_attempt_fk",
      columns: [table.attemptId, table.obligationId, table.provider, table.mode],
      foreignColumns: [paymentAttempts.id, paymentAttempts.obligationId, paymentAttempts.provider, paymentAttempts.mode],
    }).onDelete("restrict"),
    index("payment_receipts_obligation_idx").on(table.obligationId),
    check("payment_receipts_provider_check", sql`${table.provider} ~ '^[a-z][a-z0-9_]{1,31}$'`),
    check("payment_receipts_mode_check", sql`${table.mode} in ('sandbox', 'live')`),
    check("payment_receipts_merchant_context_check", sql`${table.merchantContext} ~ '^[a-z0-9][a-z0-9:._-]{2,63}$'`),
    check("payment_receipts_provider_reference_check", sql`length(${table.providerReference}) between 1 and 200`),
    check("payment_receipts_amount_check", sql`${table.amountMinor} > 0`),
    check("payment_receipts_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ],
);

/* Every unresolved financial or authorisation problem. Step 3 never resolves one. */
export const paymentExceptions = pgTable(
  "payment_exceptions",
  {
    id: text("id").primaryKey(),
    obligationId: text("obligation_id").notNull(),
    attemptId: text("attempt_id"),
    receiptId: text("receipt_id"),
    kind: text("kind").notNull(),
    blocksFulfilment: boolean("blocks_fulfilment").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    status: text("status").notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
    openedBy: text("opened_by").notNull(),
    resolutionCode: text("resolution_code"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedByPrincipalId: text("resolved_by_principal_id"),
  },
  (table) => [
    foreignKey({ name: "payment_exceptions_obligation_fk", columns: [table.obligationId], foreignColumns: [paymentObligations.id] }).onDelete("restrict"),
    foreignKey({ name: "payment_exceptions_attempt_fk", columns: [table.attemptId], foreignColumns: [paymentAttempts.id] }).onDelete("restrict"),
    foreignKey({ name: "payment_exceptions_receipt_fk", columns: [table.receiptId], foreignColumns: [paymentReceipts.id] }).onDelete("restrict"),
    foreignKey({ name: "payment_exceptions_resolver_fk", columns: [table.resolvedByPrincipalId], foreignColumns: [principals.id] }).onDelete("restrict"),
    unique("payment_exceptions_dedupe_unique").on(table.obligationId, table.kind, table.dedupeKey),
    index("payment_exceptions_open_idx").on(table.obligationId).where(sql`status = 'open'`),
    index("payment_exceptions_attempt_idx").on(table.attemptId),
    index("payment_exceptions_receipt_idx").on(table.receiptId),
    check("payment_exceptions_kind_check", sql`${table.kind} in (${PAYMENT_EXCEPTION_KINDS_SQL})`),
    check("payment_exceptions_blocking_check", sql`${table.blocksFulfilment} = (${table.kind} <> 'duplicate_charge')`),
    check("payment_exceptions_dedupe_check", sql`length(${table.dedupeKey}) between 1 and 200`),
    check("payment_exceptions_status_check", sql`${table.status} in ('open', 'resolved')`),
    check("payment_exceptions_opened_by_check", sql`${table.openedBy} = 'system'`),
    check(
      "payment_exceptions_resolution_check",
      sql`(${table.status} = 'open' and ${table.resolutionCode} is null and ${table.resolvedAt} is null and ${table.resolvedByPrincipalId} is null) or (${table.status} = 'resolved' and ${table.resolutionCode} is not null and ${table.resolvedAt} is not null and ${table.resolvedByPrincipalId} is not null)`,
    ),
  ],
);

/* Append-only obligation audit log (sequence per obligation, written under the obligation row lock). */
export const paymentObligationEvents = pgTable(
  "payment_obligation_events",
  {
    id: text("id").primaryKey(),
    obligationId: text("obligation_id").notNull(),
    sequence: integer("sequence").notNull(),
    eventType: text("event_type").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    actorType: text("actor_type").notNull(),
    actorPrincipalId: text("actor_principal_id"),
    detail: jsonb("detail").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ name: "payment_obligation_events_obligation_fk", columns: [table.obligationId], foreignColumns: [paymentObligations.id] }).onDelete("restrict"),
    foreignKey({ name: "payment_obligation_events_actor_fk", columns: [table.actorPrincipalId], foreignColumns: [principals.id] }).onDelete("restrict"),
    unique("payment_obligation_events_sequence_unique").on(table.obligationId, table.sequence),
    uniqueIndex("payment_obligation_events_one_settlement").on(table.obligationId).where(sql`to_status = 'settled'`),
    check("payment_obligation_events_sequence_check", sql`${table.sequence} >= 1`),
    check("payment_obligation_events_type_check", sql`${table.eventType} ~ '^[a-z][a-z_]{2,48}$'`),
    check("payment_obligation_events_from_check", sql`${table.fromStatus} is null or ${table.fromStatus} in (${OBLIGATION_STATUSES_SQL})`),
    check("payment_obligation_events_to_check", sql`${table.toStatus} is null or ${table.toStatus} in (${OBLIGATION_STATUSES_SQL})`),
    check(
      "payment_obligation_events_actor_check",
      sql`(${table.actorType} = 'system' and ${table.actorPrincipalId} is null) or (${table.actorType} = 'payer' and ${table.actorPrincipalId} is not null)`,
    ),
  ],
);
