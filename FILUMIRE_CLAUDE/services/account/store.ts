import { eq } from "drizzle-orm";

import { db } from "../database";
import {
  accountCredentials,
  accountProfiles,
  guardianConsentRecords,
  learnerProfiles,
  learners,
  principalLearnerAccess,
  principals,
} from "../database-schema";
import { persistenceStore } from "../persistence-provider";

export type AccountKind = "guardian" | "learner";

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

export interface NewGuardianAccount {
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
    this.addCredential(account.principalId, "guardian", account.credential);
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
          accountKind: "guardian",
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
