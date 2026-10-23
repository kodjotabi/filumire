import { and, eq, gt, isNull, sql, TransactionRollbackError } from "drizzle-orm";

import { db, pool } from "../database";
import {
  accountCredentials,
  accountProfiles,
  guardianConsentRecords,
  learnerProfiles,
  learners,
  principalLearnerAccess,
  principals,
  teacherLinkCodes,
} from "../database-schema";
import { persistenceStore } from "../persistence-provider";

export type AccountKind = "guardian" | "learner" | "teacher";

export type AccountLanguage = "en" | "fr";

export interface AccountCredentialRecord {
  id: string;
  principalId: string;
  accountKind: AccountKind;
  loginIdentifier: string;
  passwordHash: string;
  failedAttemptCount: number;
  lockedUntil?: string;
  lastSignInAt?: string;
  status: string;
}

export interface AccountProfileRecord {
  principalId: string;
  displayName: string;
  preferredLanguage: AccountLanguage;
}

export interface LearnerProfileRecord {
  learnerId: string;
  displayName: string;
  avatarId?: string;
  preferredLanguage: AccountLanguage;
  onboardingCompletedAt?: string;
  signInPrincipalId?: string;
  createdByPrincipalId: string;
  createdAt: string;
  updatedAt: string;
}

export interface GuardianConsentRecord {
  id: string;
  guardianPrincipalId: string;
  learnerId?: string;
  consentType: string;
  noticeVersion: string;
  method: string;
  verificationStatus: string;
  recordedAt: string;
  withdrawnAt?: string;
}

export interface NewCredential {
  id: string;
  loginIdentifier: string;
  passwordHash: string;
}

/*
 * An adult account: a guardian (the default) or a teacher. Both
 * sign in with an email address and have a display profile.
 */
export interface NewGuardianAccount {
  accountKind?: "guardian" | "teacher";
  principalId: string;
  credential: NewCredential;
  profile: {
    displayName: string;
    preferredLanguage: AccountLanguage;
  };
  consents: GuardianConsentRecord[];
}

export interface NewLearnerAccount {
  guardianPrincipalId: string;
  learnerId: string;
  learnerPrincipalId: string;
  guardianAccessId: string;
  selfAccessId: string;
  credential: NewCredential;
  profile: {
    displayName: string;
    preferredLanguage: AccountLanguage;
    avatarId?: string;
  };
  consent: GuardianConsentRecord;
}

export type LearnerProfilePatch = Partial<
  Pick<
    LearnerProfileRecord,
    | "displayName"
    | "avatarId"
    | "preferredLanguage"
    | "onboardingCompletedAt"
  >
>;

export class LoginIdentifierTakenError extends Error {
  constructor() {
    super("That sign-in name is already in use.");
  }
}

export interface NewTeacherLinkCode {
  id: string;
  codeHash: string;
  learnerId: string;
  createdByPrincipalId: string;
  expiresAt: string;
}

export interface LinkedTeacher {
  principalId: string;
  displayName: string;
  email: string;
  linkedAt: string;
}

export interface FailedSignInPolicy {
  threshold: number;
  lockMs: number;
  now: number;
}

export interface AccountStore {
  createGuardianAccount(account: NewGuardianAccount): Promise<void>;
  createLearnerAccount(account: NewLearnerAccount): Promise<void>;
  getCredentialByLogin(
    loginIdentifier: string,
  ): Promise<AccountCredentialRecord | undefined>;
  getCredentialByPrincipal(
    principalId: string,
  ): Promise<AccountCredentialRecord | undefined>;
  setSignInAttemptState(
    credentialId: string,
    state: {
      failedAttemptCount: number;
      lockedUntil?: string;
      lastSignInAt?: string;
    },
  ): Promise<void>;
  /*
   * Counts one failed sign-in atomically, so parallel guesses can
   * never lose a count. A lock that has run out starts a fresh
   * count; reaching the threshold locks until now + lockMs.
   */
  recordFailedSignIn(
    credentialId: string,
    policy: FailedSignInPolicy,
  ): Promise<{ lockedUntil?: string }>;
  updatePasswordHash(
    principalId: string,
    passwordHash: string,
  ): Promise<void>;
  getAccountProfile(
    principalId: string,
  ): Promise<AccountProfileRecord | undefined>;
  getLearnerProfile(
    learnerId: string,
  ): Promise<LearnerProfileRecord | undefined>;
  updateLearnerProfile(
    learnerId: string,
    patch: LearnerProfilePatch,
  ): Promise<LearnerProfileRecord | undefined>;
  listConsentRecords(
    guardianPrincipalId: string,
  ): Promise<GuardianConsentRecord[]>;
  /*
   * Stores a new teacher link code for the learner and revokes any
   * unused earlier code for the same learner.
   */
  createTeacherLinkCode(code: NewTeacherLinkCode): Promise<void>;
  revokeTeacherLinkCodes(learnerId: string): Promise<void>;
  /*
   * Uses a code once: it must be unused, unrevoked and unexpired,
   * and its creator must still be an active guardian of the
   * learner. On success the teacher relationship is created (or
   * re-activated) and the learner id is returned.
   */
  redeemTeacherLinkCode(
    codeHash: string,
    teacherPrincipalId: string,
    accessId: string,
    now: string,
  ): Promise<string | undefined>;
  listLinkedTeachers(learnerId: string): Promise<LinkedTeacher[]>;
}

/*
 * In-memory store for local development and tests. Principals,
 * learners and access links go through the shared in-memory
 * persistence store so the rest of FILUMIRE sees them.
 */
class MemoryAccountStore implements AccountStore {
  private credentials = new Map<string, AccountCredentialRecord>();
  private profiles = new Map<string, AccountProfileRecord>();
  private learnerProfiles = new Map<string, LearnerProfileRecord>();
  private consents: GuardianConsentRecord[] = [];
  private linkCodes = new Map<
    string,
    NewTeacherLinkCode & { usedAt?: string; usedByPrincipalId?: string; revokedAt?: string }
  >();

  async createTeacherLinkCode(code: NewTeacherLinkCode) {
    const now = new Date().toISOString();

    for (const existing of this.linkCodes.values()) {
      if (existing.learnerId === code.learnerId && !existing.usedAt && !existing.revokedAt) {
        existing.revokedAt = now;
      }
    }

    this.linkCodes.set(code.codeHash, { ...code });
  }

  async revokeTeacherLinkCodes(learnerId: string) {
    const now = new Date().toISOString();
    for (const code of this.linkCodes.values()) {
      if (code.learnerId === learnerId && !code.usedAt && !code.revokedAt) {
        code.revokedAt = now;
      }
    }
  }

  async redeemTeacherLinkCode(
    codeHash: string,
    teacherPrincipalId: string,
    accessId: string,
    now: string,
  ) {
    const code = this.linkCodes.get(codeHash);

    if (!code || code.usedAt || code.revokedAt || code.expiresAt <= now) {
      return undefined;
    }

    const guardian = await persistenceStore.getPrincipalLearnerAccess(
      code.createdByPrincipalId,
      code.learnerId,
      "guardian",
    );

    if (guardian?.status !== "active") {
      return undefined;
    }

    // Recheck after the asynchronous guardian lookup: another request
    // may have claimed or cancelled the code while it was in flight.
    if (code.usedAt || code.revokedAt) return undefined;
    code.usedAt = now;
    code.usedByPrincipalId = teacherPrincipalId;

    await persistenceStore.activatePrincipalLearnerAccess(
      accessId,
      teacherPrincipalId,
      code.learnerId,
      "teacher",
    );

    return code.learnerId;
  }

  async listLinkedTeachers(learnerId: string) {
    const teachers: LinkedTeacher[] = [];

    for (const credential of this.credentials.values()) {
      if (credential.accountKind !== "teacher") continue;

      const access = await persistenceStore.getPrincipalLearnerAccess(
        credential.principalId,
        learnerId,
        "teacher",
      );

      if (access?.status === "active") {
        teachers.push({
          principalId: credential.principalId,
          displayName: this.profiles.get(credential.principalId)?.displayName ?? "",
          email: credential.loginIdentifier,
          linkedAt: access.updatedAt,
        });
      }
    }

    return teachers;
  }

  private assertLoginFree(loginIdentifier: string): void {
    for (const credential of this.credentials.values()) {
      if (credential.loginIdentifier === loginIdentifier) {
        throw new LoginIdentifierTakenError();
      }
    }
  }

  private addCredential(
    principalId: string,
    accountKind: AccountKind,
    credential: NewCredential,
  ): void {
    this.credentials.set(credential.id, {
      ...credential,
      principalId,
      accountKind,
      failedAttemptCount: 0,
      status: "active",
    });
  }

  async createGuardianAccount(account: NewGuardianAccount): Promise<void> {
    this.assertLoginFree(account.credential.loginIdentifier);

    await persistenceStore.createPrincipal(account.principalId);
    this.addCredential(
      account.principalId,
      account.accountKind ?? "guardian",
      account.credential,
    );
    this.profiles.set(account.principalId, {
      principalId: account.principalId,
      ...account.profile,
    });
    this.consents.push(...account.consents);
  }

  async createLearnerAccount(account: NewLearnerAccount): Promise<void> {
    this.assertLoginFree(account.credential.loginIdentifier);

    const now = new Date().toISOString();

    await persistenceStore.createPrincipal(account.learnerPrincipalId);
    await persistenceStore.ensureLearnerExists(account.learnerId);
    await persistenceStore.createPrincipalLearnerAccess(
      account.guardianAccessId,
      account.guardianPrincipalId,
      account.learnerId,
      "guardian",
    );
    await persistenceStore.createPrincipalLearnerAccess(
      account.selfAccessId,
      account.learnerPrincipalId,
      account.learnerId,
      "self",
    );
    this.addCredential(
      account.learnerPrincipalId,
      "learner",
      account.credential,
    );
    this.learnerProfiles.set(account.learnerId, {
      learnerId: account.learnerId,
      ...account.profile,
      signInPrincipalId: account.learnerPrincipalId,
      createdByPrincipalId: account.guardianPrincipalId,
      createdAt: now,
      updatedAt: now,
    });
    this.consents.push(account.consent);
  }

  async getCredentialByLogin(loginIdentifier: string) {
    for (const credential of this.credentials.values()) {
      if (credential.loginIdentifier === loginIdentifier) {
        return { ...credential };
      }
    }

    return undefined;
  }

  async getCredentialByPrincipal(principalId: string) {
    for (const credential of this.credentials.values()) {
      if (credential.principalId === principalId) {
        return { ...credential };
      }
    }

    return undefined;
  }

  async setSignInAttemptState(
    credentialId: string,
    state: {
      failedAttemptCount: number;
      lockedUntil?: string;
      lastSignInAt?: string;
    },
  ): Promise<void> {
    const credential = this.credentials.get(credentialId);

    if (credential) {
      credential.failedAttemptCount = state.failedAttemptCount;
      credential.lockedUntil = state.lockedUntil;
      credential.lastSignInAt =
        state.lastSignInAt ?? credential.lastSignInAt;
    }
  }

  async recordFailedSignIn(credentialId: string, policy: FailedSignInPolicy) {
    const credential = this.credentials.get(credentialId);

    if (!credential) {
      return {};
    }

    const lockedUntil = credential.lockedUntil ? Date.parse(credential.lockedUntil) : 0;

    if (lockedUntil > policy.now) {
      return { lockedUntil: credential.lockedUntil };
    }

    const next = (lockedUntil > 0 ? 0 : credential.failedAttemptCount) + 1;

    if (next >= policy.threshold) {
      credential.failedAttemptCount = 0;
      credential.lockedUntil = new Date(policy.now + policy.lockMs).toISOString();
    } else {
      credential.failedAttemptCount = next;
      credential.lockedUntil = undefined;
    }

    return credential.lockedUntil ? { lockedUntil: credential.lockedUntil } : {};
  }

  async updatePasswordHash(principalId: string, passwordHash: string) {
    for (const credential of this.credentials.values()) {
      if (credential.principalId === principalId) {
        credential.passwordHash = passwordHash;
        credential.failedAttemptCount = 0;
        credential.lockedUntil = undefined;
      }
    }
  }

  async getAccountProfile(principalId: string) {
    const profile = this.profiles.get(principalId);
    return profile ? { ...profile } : undefined;
  }

  async getLearnerProfile(learnerId: string) {
    const profile = this.learnerProfiles.get(learnerId);
    return profile ? { ...profile } : undefined;
  }

  async updateLearnerProfile(learnerId: string, patch: LearnerProfilePatch) {
    const profile = this.learnerProfiles.get(learnerId);

    if (!profile) {
      return undefined;
    }

    Object.assign(profile, patch, {
      updatedAt: new Date().toISOString(),
    });

    return { ...profile };
  }

  async listConsentRecords(guardianPrincipalId: string) {
    return this.consents
      .filter((record) => record.guardianPrincipalId === guardianPrincipalId)
      .map((record) => ({ ...record }));
  }
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;

  // drizzle wraps driver errors; walk the cause chain.
  while (current && typeof current === "object") {
    if ((current as { code?: unknown }).code === "23505") {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }

  return false;
}

function toIso(value: Date | null): string | undefined {
  return value ? value.toISOString() : undefined;
}

function mapCredential(
  row: typeof accountCredentials.$inferSelect,
): AccountCredentialRecord {
  return {
    id: row.id,
    principalId: row.principalId,
    accountKind: row.accountKind as AccountKind,
    loginIdentifier: row.loginIdentifier,
    passwordHash: row.passwordHash,
    failedAttemptCount: row.failedAttemptCount,
    lockedUntil: toIso(row.lockedUntil),
    lastSignInAt: toIso(row.lastSignInAt),
    status: row.status,
  };
}

function mapLearnerProfile(
  row: typeof learnerProfiles.$inferSelect,
): LearnerProfileRecord {
  return {
    learnerId: row.learnerId,
    displayName: row.displayName,
    avatarId: row.avatarId ?? undefined,
    preferredLanguage: row.preferredLanguage as AccountLanguage,
    onboardingCompletedAt: toIso(row.onboardingCompletedAt),
    signInPrincipalId: row.signInPrincipalId ?? undefined,
    createdByPrincipalId: row.createdByPrincipalId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function consentValues(record: GuardianConsentRecord) {
  return {
    id: record.id,
    guardianPrincipalId: record.guardianPrincipalId,
    learnerId: record.learnerId ?? null,
    consentType: record.consentType,
    noticeVersion: record.noticeVersion,
    method: record.method,
    verificationStatus: record.verificationStatus,
    recordedAt: new Date(record.recordedAt),
  };
}

/*
 * Postgres store. Each account is created in one transaction so
 * a failure (for example a taken username) leaves no partial
 * principal, learner or access link behind.
 */
class PostgresAccountStore implements AccountStore {
  async createGuardianAccount(account: NewGuardianAccount): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        await tx.insert(principals).values({ id: account.principalId });
        await tx.insert(accountCredentials).values({
          ...account.credential,
          principalId: account.principalId,
          accountKind: account.accountKind ?? "guardian",
        });
        await tx.insert(accountProfiles).values({
          principalId: account.principalId,
          ...account.profile,
        });
        if (account.consents.length > 0) {
          await tx
            .insert(guardianConsentRecords)
            .values(account.consents.map(consentValues));
        }
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new LoginIdentifierTakenError();
      }
      throw error;
    }
  }

  async createLearnerAccount(account: NewLearnerAccount): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        await tx.insert(principals).values({ id: account.learnerPrincipalId });
        await tx.insert(learners).values({ id: account.learnerId });
        await tx.insert(principalLearnerAccess).values([
          {
            id: account.guardianAccessId,
            principalId: account.guardianPrincipalId,
            learnerId: account.learnerId,
            relationshipType: "guardian",
          },
          {
            id: account.selfAccessId,
            principalId: account.learnerPrincipalId,
            learnerId: account.learnerId,
            relationshipType: "self",
          },
        ]);
        await tx.insert(accountCredentials).values({
          ...account.credential,
          principalId: account.learnerPrincipalId,
          accountKind: "learner",
        });
        await tx.insert(learnerProfiles).values({
          learnerId: account.learnerId,
          displayName: account.profile.displayName,
          avatarId: account.profile.avatarId ?? null,
          preferredLanguage: account.profile.preferredLanguage,
          signInPrincipalId: account.learnerPrincipalId,
          createdByPrincipalId: account.guardianPrincipalId,
        });
        await tx
          .insert(guardianConsentRecords)
          .values(consentValues(account.consent));
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new LoginIdentifierTakenError();
      }
      throw error;
    }
  }

  async getCredentialByLogin(loginIdentifier: string) {
    const rows = await db
      .select()
      .from(accountCredentials)
      .where(eq(accountCredentials.loginIdentifier, loginIdentifier))
      .limit(1);

    return rows[0] ? mapCredential(rows[0]) : undefined;
  }

  async getCredentialByPrincipal(principalId: string) {
    const rows = await db
      .select()
      .from(accountCredentials)
      .where(eq(accountCredentials.principalId, principalId))
      .limit(1);

    return rows[0] ? mapCredential(rows[0]) : undefined;
  }

  async setSignInAttemptState(
    credentialId: string,
    state: {
      failedAttemptCount: number;
      lockedUntil?: string;
      lastSignInAt?: string;
    },
  ): Promise<void> {
    await db
      .update(accountCredentials)
      .set({
        failedAttemptCount: state.failedAttemptCount,
        lockedUntil: state.lockedUntil ? new Date(state.lockedUntil) : null,
        ...(state.lastSignInAt
          ? { lastSignInAt: new Date(state.lastSignInAt) }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(accountCredentials.id, credentialId));
  }

  async recordFailedSignIn(credentialId: string, policy: FailedSignInPolicy) {
    // $1 now, $2 threshold, $3 lock end, $4 credential. A row still
    // locked is left alone; a non-null locked_until past the first
    // branch has expired, so the count starts again from zero.
    const result = await pool.query<{ locked_until: Date | null }>(
      `UPDATE account_credentials AS c SET
         failed_attempt_count = CASE
           WHEN c.locked_until > $1 THEN c.failed_attempt_count
           WHEN (CASE WHEN c.locked_until IS NOT NULL THEN 0 ELSE c.failed_attempt_count END) + 1 >= $2 THEN 0
           ELSE (CASE WHEN c.locked_until IS NOT NULL THEN 0 ELSE c.failed_attempt_count END) + 1
         END,
         locked_until = CASE
           WHEN c.locked_until > $1 THEN c.locked_until
           WHEN (CASE WHEN c.locked_until IS NOT NULL THEN 0 ELSE c.failed_attempt_count END) + 1 >= $2 THEN $3
           ELSE NULL
         END,
         updated_at = $1
       WHERE c.id = $4
       RETURNING c.locked_until`,
      [new Date(policy.now), policy.threshold, new Date(policy.now + policy.lockMs), credentialId],
    );

    const lockedUntil = result.rows[0]?.locked_until;

    return lockedUntil ? { lockedUntil: lockedUntil.toISOString() } : {};
  }

  async updatePasswordHash(principalId: string, passwordHash: string) {
    const now = new Date();

    await db
      .update(accountCredentials)
      .set({
        passwordHash,
        passwordUpdatedAt: now,
        failedAttemptCount: 0,
        lockedUntil: null,
        updatedAt: now,
      })
      .where(eq(accountCredentials.principalId, principalId));
  }

  async getAccountProfile(principalId: string) {
    const rows = await db
      .select()
      .from(accountProfiles)
      .where(eq(accountProfiles.principalId, principalId))
      .limit(1);
    const row = rows[0];

    return row
      ? {
          principalId: row.principalId,
          displayName: row.displayName,
          preferredLanguage: row.preferredLanguage as AccountLanguage,
        }
      : undefined;
  }

  async getLearnerProfile(learnerId: string) {
    const rows = await db
      .select()
      .from(learnerProfiles)
      .where(eq(learnerProfiles.learnerId, learnerId))
      .limit(1);

    return rows[0] ? mapLearnerProfile(rows[0]) : undefined;
  }

  async updateLearnerProfile(learnerId: string, patch: LearnerProfilePatch) {
    const rows = await db
      .update(learnerProfiles)
      .set({
        ...(patch.displayName !== undefined
          ? { displayName: patch.displayName }
          : {}),
        ...(patch.avatarId !== undefined ? { avatarId: patch.avatarId } : {}),
        ...(patch.preferredLanguage !== undefined
          ? { preferredLanguage: patch.preferredLanguage }
          : {}),
        ...(patch.onboardingCompletedAt !== undefined
          ? { onboardingCompletedAt: new Date(patch.onboardingCompletedAt) }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(learnerProfiles.learnerId, learnerId))
      .returning();

    return rows[0] ? mapLearnerProfile(rows[0]) : undefined;
  }

  async createTeacherLinkCode(code: NewTeacherLinkCode) {
    await db.transaction(async (tx) => {
      // Serialize replacement/cancellation even when no code exists yet.
      // An advisory lock, not a row lock: learners is append-only for the
      // app role, and FOR NO KEY UPDATE would need UPDATE on it.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${code.learnerId}), hashtext('teacher-link-code'))`);
      await tx
        .update(teacherLinkCodes)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(teacherLinkCodes.learnerId, code.learnerId),
            isNull(teacherLinkCodes.usedAt),
            isNull(teacherLinkCodes.revokedAt),
          ),
        );
      await tx.insert(teacherLinkCodes).values({
        ...code,
        expiresAt: new Date(code.expiresAt),
      });
    });
  }

  async revokeTeacherLinkCodes(learnerId: string) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${learnerId}), hashtext('teacher-link-code'))`);
      await tx.update(teacherLinkCodes).set({ revokedAt: new Date() }).where(
        and(
          eq(teacherLinkCodes.learnerId, learnerId),
          isNull(teacherLinkCodes.usedAt),
          isNull(teacherLinkCodes.revokedAt),
        ),
      );
    });
  }

  async redeemTeacherLinkCode(
    codeHash: string,
    teacherPrincipalId: string,
    accessId: string,
    now: string,
  ) {
    const at = new Date(now);

    return db.transaction(async (tx) => {
      // Claiming the code and checking its guardian happen in one
      // transaction, so a code can never be used twice.
      const [claimed] = await tx
        .update(teacherLinkCodes)
        .set({ usedAt: at, usedByPrincipalId: teacherPrincipalId })
        .where(
          and(
            eq(teacherLinkCodes.codeHash, codeHash),
            isNull(teacherLinkCodes.usedAt),
            isNull(teacherLinkCodes.revokedAt),
            gt(teacherLinkCodes.expiresAt, at),
          ),
        )
        .returning({
          learnerId: teacherLinkCodes.learnerId,
          createdBy: teacherLinkCodes.createdByPrincipalId,
        });

      if (!claimed) {
        return undefined;
      }

      const [guardian] = await tx
        .select({ status: principalLearnerAccess.status })
        .from(principalLearnerAccess)
        .where(
          and(
            eq(principalLearnerAccess.principalId, claimed.createdBy),
            eq(principalLearnerAccess.learnerId, claimed.learnerId),
            eq(principalLearnerAccess.relationshipType, "guardian"),
          ),
        );

      if (guardian?.status !== "active") {
        tx.rollback();
      }

      await tx
        .insert(principalLearnerAccess)
        .values({
          id: accessId,
          principalId: teacherPrincipalId,
          learnerId: claimed.learnerId,
          relationshipType: "teacher",
        })
        .onConflictDoUpdate({
          target: [
            principalLearnerAccess.principalId,
            principalLearnerAccess.learnerId,
            principalLearnerAccess.relationshipType,
          ],
          set: { status: "active", updatedAt: at },
        });

      return claimed.learnerId;
    }).catch((error: unknown) => {
      if (error instanceof TransactionRollbackError) {
        return undefined;
      }
      throw error;
    });
  }

  async listLinkedTeachers(learnerId: string) {
    const rows = await db
      .select({
        principalId: principalLearnerAccess.principalId,
        linkedAt: principalLearnerAccess.updatedAt,
        displayName: accountProfiles.displayName,
        email: accountCredentials.loginIdentifier,
      })
      .from(principalLearnerAccess)
      .innerJoin(
        accountCredentials,
        eq(accountCredentials.principalId, principalLearnerAccess.principalId),
      )
      .leftJoin(
        accountProfiles,
        eq(accountProfiles.principalId, principalLearnerAccess.principalId),
      )
      .where(
        and(
          eq(principalLearnerAccess.learnerId, learnerId),
          eq(principalLearnerAccess.relationshipType, "teacher"),
          eq(principalLearnerAccess.status, "active"),
          eq(accountCredentials.accountKind, "teacher"),
        ),
      );

    return rows.map((row) => ({
      principalId: row.principalId,
      displayName: row.displayName ?? "",
      email: row.email,
      linkedAt: row.linkedAt.toISOString(),
    }));
  }

  async listConsentRecords(guardianPrincipalId: string) {
    const rows = await db
      .select()
      .from(guardianConsentRecords)
      .where(eq(guardianConsentRecords.guardianPrincipalId, guardianPrincipalId));

    return rows.map((row) => ({
      id: row.id,
      guardianPrincipalId: row.guardianPrincipalId,
      learnerId: row.learnerId ?? undefined,
      consentType: row.consentType,
      noticeVersion: row.noticeVersion,
      method: row.method,
      verificationStatus: row.verificationStatus,
      recordedAt: row.recordedAt.toISOString(),
      withdrawnAt: toIso(row.withdrawnAt),
    }));
  }
}

const shared = globalThis as { __filumireAccountStore?: AccountStore };

export const accountStore: AccountStore =
  (process.env.FILUMIRE_PERSISTENCE ?? "memory") === "postgres"
    ? new PostgresAccountStore()
    : (shared.__filumireAccountStore ??= new MemoryAccountStore());
