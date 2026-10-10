import { revokeOtherPrincipalAuthSessions } from "../auth-session";

import { createHash, randomInt } from "node:crypto";

import {
  getPrincipalLearnerAccess,
  isPrincipalAuthorizedForLearner,
  listAuthorizedLearnersForPrincipal,
  revokePrincipalLearnerAccess,
} from "../principal";

import {
  hashPassword,
  PASSWORD_MAX_LENGTH,
  verifyAgainstDummy,
  verifyPassword,
} from "./password";

import {
  accountStore,
  LoginIdentifierTakenError,
  type AccountKind,
  type AccountLanguage,
  type GuardianConsentRecord,
  type LearnerProfileRecord,
  type LinkedTeacher,
} from "./store";

export {
  LoginIdentifierTakenError,
  type AccountKind,
  type AccountLanguage,
  type LearnerProfileRecord,
};

/*
 * Built-in FILUMIRE accounts.
 *
 * A guardian registers with an email address and password and
 * records consent. The guardian then adds learners; each learner
 * gets its own Principal with a 'self' link to the learner and a
 * username/password the guardian chose, and the guardian Principal
 * gets a 'guardian' link. Sessions, authorization and learner data
 * stay with the existing principal / auth-session / learner-state
 * services. External identity providers keep working alongside.
 */

/*
 * The privacy notice and terms the consent records refer to.
 * Draft wording for testing; bump the version whenever the
 * reviewed notice changes so existing records stay attributable.
 */
export const CONSENT_NOTICE_VERSION = "filumire-test-notice-2026-10-draft";

export const CONSENT_METHOD = "self_declared_checkbox";

export const GUARDIAN_PASSWORD_MIN_LENGTH = 8;
export const LEARNER_PASSWORD_MIN_LENGTH = 6;
export const MAX_LEARNERS_PER_GUARDIAN = 10;

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 15;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,23}$/;
const AVATAR_PATTERN = /^[a-z0-9-]{1,16}$/;

export type AccountErrorField =
  | "email"
  | "username"
  | "password"
  | "currentPassword"
  | "displayName"
  | "consent"
  | "learner"
  | "avatarId"
  | "preferredLanguage"
  | "linkCode"
  | "registration";

export class AccountValidationError extends Error {
  constructor(
    public readonly field: AccountErrorField,
    message: string,
  ) {
    super(message);
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("The sign-in name or password is not correct.");
  }
}

export class AccountLockedError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super(
      "Too many unsuccessful attempts. Please wait a few minutes and try again.",
    );
  }
}

export class AccountForbiddenError extends Error {}

/*
 * Registration is always available in development and tests.
 * A production build only accepts new accounts once
 * FILUMIRE_ACCOUNT_REGISTRATION=open is set, so a preview cannot
 * start collecting real families' details before the privacy and
 * consent review is complete.
 */
export function isRegistrationOpen(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.FILUMIRE_ACCOUNT_REGISTRATION === "open"
  );
}

export function normaliseEmail(value: unknown): string {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new AccountValidationError("email", "Enter a valid email address.");
  }

  return email;
}

export function normaliseUsername(value: unknown): string {
  const username =
    typeof value === "string" ? value.trim().toLowerCase() : "";

  if (!USERNAME_PATTERN.test(username)) {
    throw new AccountValidationError(
      "username",
      "Usernames are 3 to 24 letters or numbers, and may include . _ or -.",
    );
  }

  return username;
}

/*
 * Guardians sign in with an email address, learners with a
 * username. Usernames cannot contain '@', so the two never clash.
 */
export function normaliseLoginIdentifier(value: unknown): string | undefined {
  const login = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (login.length === 0 || login.length > 254) {
    return undefined;
  }

  return login;
}

function validatePassword(value: unknown, minLength: number): string {
  if (
    typeof value !== "string" ||
    value.length < minLength ||
    value.length > PASSWORD_MAX_LENGTH
  ) {
    throw new AccountValidationError(
      "password",
      `Passwords must be at least ${minLength} characters.`,
    );
  }

  return value;
}

function normaliseDisplayName(value: unknown): string {
  const name =
    typeof value === "string"
      ? value
          .replace(/[\u0000-\u001f\u007f]/g, "")
          .replace(/\s+/g, " ")
          .trim()
      : "";

  if (name.length < 1 || name.length > 40) {
    throw new AccountValidationError(
      "displayName",
      "Enter a name of 1 to 40 characters.",
    );
  }

  return name;
}

function normaliseLanguage(value: unknown): AccountLanguage {
  if (value === undefined || value === null || value === "") {
    return "en";
  }

  if (value === "en" || value === "fr") {
    return value;
  }

  throw new AccountValidationError(
    "preferredLanguage",
    "Language must be English or French.",
  );
}

function consentRecord(
  guardianPrincipalId: string,
  consentType: string,
  learnerId?: string,
): GuardianConsentRecord {
  return {
    id: crypto.randomUUID(),
    guardianPrincipalId,
    learnerId,
    consentType,
    noticeVersion: CONSENT_NOTICE_VERSION,
    method: CONSENT_METHOD,
    verificationStatus: "unverified",
    recordedAt: new Date().toISOString(),
  };
}

export interface GuardianRegistrationInput {
  email: unknown;
  password: unknown;
  displayName: unknown;
  preferredLanguage?: unknown;
  confirmsGuardian: unknown;
  acceptsNotice: unknown;
}

export async function registerGuardian(
  input: GuardianRegistrationInput,
): Promise<{ principalId: string }> {
  if (!isRegistrationOpen()) {
    throw new AccountValidationError(
      "registration",
      "New accounts are not open yet.",
    );
  }

  const email = normaliseEmail(input.email);
  const password = validatePassword(
    input.password,
    GUARDIAN_PASSWORD_MIN_LENGTH,
  );
  const displayName = normaliseDisplayName(input.displayName);
  const preferredLanguage = normaliseLanguage(input.preferredLanguage);

  if (input.confirmsGuardian !== true || input.acceptsNotice !== true) {
    throw new AccountValidationError(
      "consent",
      "Please confirm you are the parent or guardian and accept the privacy notice.",
    );
  }

  const principalId = crypto.randomUUID();

  await accountStore.createGuardianAccount({
    principalId,
    credential: {
      id: crypto.randomUUID(),
      loginIdentifier: email,
      passwordHash: await hashPassword(password),
    },
    profile: { displayName, preferredLanguage },
    consents: [
      consentRecord(principalId, "guardian_declaration"),
      consentRecord(principalId, "privacy_notice_and_terms"),
    ],
  });

  return { principalId };
}

export interface TeacherRegistrationInput {
  email: unknown;
  password: unknown;
  displayName: unknown;
  preferredLanguage?: unknown;
  confirmsTeacher: unknown;
  acceptsNotice: unknown;
}

/*
 * A teacher account starts with no learners. A teacher only ever
 * sees a learner after that learner's guardian gives them a link
 * code (createTeacherLinkCodeFor). Registration is gated exactly
 * like guardian registration.
 */
export async function registerTeacher(
  input: TeacherRegistrationInput,
): Promise<{ principalId: string }> {
  if (!isRegistrationOpen()) {
    throw new AccountValidationError(
      "registration",
      "New accounts are not open yet.",
    );
  }

  const email = normaliseEmail(input.email);
  const password = validatePassword(
    input.password,
    GUARDIAN_PASSWORD_MIN_LENGTH,
  );
  const displayName = normaliseDisplayName(input.displayName);
  const preferredLanguage = normaliseLanguage(input.preferredLanguage);

  if (input.confirmsTeacher !== true || input.acceptsNotice !== true) {
    throw new AccountValidationError(
      "consent",
      "Please confirm you are a teacher and accept the privacy notice.",
    );
  }

  const principalId = crypto.randomUUID();

  await accountStore.createGuardianAccount({
    accountKind: "teacher",
    principalId,
    credential: {
      id: crypto.randomUUID(),
      loginIdentifier: email,
      passwordHash: await hashPassword(password),
    },
    profile: { displayName, preferredLanguage },
    consents: [
      consentRecord(principalId, "teacher_declaration"),
      consentRecord(principalId, "privacy_notice_and_terms"),
    ],
  });

  return { principalId };
}

async function requireTeacher(principalId: string): Promise<void> {
  const credential = await accountStore.getCredentialByPrincipal(principalId);

  if (credential?.accountKind !== "teacher") {
    throw new AccountForbiddenError("Only a teacher account can do this.");
  }
}

const TEACHER_LINK_CODE_DAYS = 7;

// No 0/O, 1/I/L or U, so a code read aloud or copied by hand
// survives. Ten characters from 30 is about 49 bits.
const LINK_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
const LINK_CODE_LENGTH = 10;

export function hashLinkCode(code: string): string {
  return createHash("sha256").update(`teacher-link:${code}`).digest("hex");
}

function normaliseLinkCode(value: unknown): string {
  const code =
    typeof value === "string"
      ? value.toUpperCase().replace(/[^A-Z0-9]/g, "")
      : "";

  if (
    code.length !== LINK_CODE_LENGTH ||
    [...code].some((char) => !LINK_CODE_ALPHABET.includes(char))
  ) {
    throw new AccountValidationError(
      "linkCode",
      "Enter the code exactly as the parent gave it.",
    );
  }

  return code;
}

/*
 * A guardian creates a one-time code for a teacher to link to one
 * of their learners. Only the code's hash is stored; the plain code
 * is returned once, to be passed on by the guardian. Creating a new
 * code cancels any unused earlier one for the same learner.
 */
export async function createTeacherLinkCodeFor(
  guardianPrincipalId: string,
  learnerId: string,
): Promise<{ code: string; expiresAt: string }> {
  await requireGuardianOf(guardianPrincipalId, learnerId);

  const code = Array.from(
    { length: LINK_CODE_LENGTH },
    () => LINK_CODE_ALPHABET[randomInt(LINK_CODE_ALPHABET.length)],
  ).join("");
  const expiresAt = new Date(
    Date.now() + TEACHER_LINK_CODE_DAYS * 24 * 60 * 60_000,
  ).toISOString();

  await accountStore.createTeacherLinkCode({
    id: crypto.randomUUID(),
    codeHash: hashLinkCode(code),
    learnerId,
    createdByPrincipalId: guardianPrincipalId,
    expiresAt,
  });

  return { code: `${code.slice(0, 5)}-${code.slice(5)}`, expiresAt };
}

/*
 * A teacher uses a guardian's code. The same message covers every
 * reason a code fails, so codes cannot be probed.
 */
export async function linkTeacherWithCode(
  teacherPrincipalId: string,
  code: unknown,
): Promise<AccountLearnerSummary> {
  await requireTeacher(teacherPrincipalId);

  const learnerId = await accountStore.redeemTeacherLinkCode(
    hashLinkCode(normaliseLinkCode(code)),
    teacherPrincipalId,
    crypto.randomUUID(),
    new Date().toISOString(),
  );

  if (!learnerId) {
    throw new AccountValidationError(
      "linkCode",
      "That code cannot be used. It may have expired or already been used.",
    );
  }

  return summariseLearner(learnerId, false);
}

export async function listTeachersForLearner(
  guardianPrincipalId: string,
  learnerId: string,
): Promise<LinkedTeacher[]> {
  await requireGuardianOf(guardianPrincipalId, learnerId);
  return accountStore.listLinkedTeachers(learnerId);
}

export async function cancelTeacherLinkCodesFor(
  guardianPrincipalId: string,
  learnerId: string,
): Promise<void> {
  await requireGuardianOf(guardianPrincipalId, learnerId);
  await accountStore.revokeTeacherLinkCodes(learnerId);
}

/* A guardian ends a teacher's access to their learner at once. */
export async function removeTeacherFromLearner(
  guardianPrincipalId: string,
  learnerId: string,
  teacherPrincipalId: string,
): Promise<void> {
  await requireGuardianOf(guardianPrincipalId, learnerId);

  const access = await getPrincipalLearnerAccess(
    teacherPrincipalId,
    learnerId,
    "teacher",
  );

  if (access?.status !== "active") {
    throw new AccountForbiddenError("That teacher is not linked to this learner.");
  }

  await revokePrincipalLearnerAccess(teacherPrincipalId, learnerId, "teacher");
}

async function requireGuardian(principalId: string): Promise<void> {
  const credential = await accountStore.getCredentialByPrincipal(principalId);

  if (credential?.accountKind !== "guardian") {
    throw new AccountForbiddenError(
      "Only a parent or guardian account can do this.",
    );
  }
}

async function requireGuardianOf(
  guardianPrincipalId: string,
  learnerId: string,
): Promise<void> {
  await requireGuardian(guardianPrincipalId);

  const access = await getPrincipalLearnerAccess(
    guardianPrincipalId,
    learnerId,
    "guardian",
  );

  if (access?.status !== "active") {
    throw new AccountForbiddenError("This learner is not linked to you.");
  }
}

export interface AddLearnerInput {
  displayName: unknown;
  username: unknown;
  password: unknown;
  preferredLanguage?: unknown;
  avatarId?: unknown;
  consentsToLearnerData: unknown;
}

export async function addLearnerForGuardian(
  guardianPrincipalId: string,
  input: AddLearnerInput,
): Promise<{ learnerId: string; username: string }> {
  await requireGuardian(guardianPrincipalId);

  const displayName = normaliseDisplayName(input.displayName);
  const username = normaliseUsername(input.username);
  const password = validatePassword(
    input.password,
    LEARNER_PASSWORD_MIN_LENGTH,
  );
  const preferredLanguage = normaliseLanguage(input.preferredLanguage);
  const avatarId = normaliseAvatar(input.avatarId);

  if (input.consentsToLearnerData !== true) {
    throw new AccountValidationError(
      "consent",
      "Please confirm you agree to FILUMIRE keeping this learner's learning records.",
    );
  }

  const existing = await listGuardianLearnerIds(guardianPrincipalId);

  if (existing.length >= MAX_LEARNERS_PER_GUARDIAN) {
    throw new AccountValidationError(
      "learner",
      `A family account can have up to ${MAX_LEARNERS_PER_GUARDIAN} learners.`,
    );
  }

  const learnerId = `learner-${crypto.randomUUID()}`;

  await accountStore.createLearnerAccount({
    guardianPrincipalId,
    learnerId,
    learnerPrincipalId: crypto.randomUUID(),
    guardianAccessId: crypto.randomUUID(),
    selfAccessId: crypto.randomUUID(),
    credential: {
      id: crypto.randomUUID(),
      loginIdentifier: username,
      passwordHash: await hashPassword(password),
    },
    profile: { displayName, preferredLanguage, avatarId },
    consent: consentRecord(
      guardianPrincipalId,
      "learner_data_processing",
      learnerId,
    ),
  });

  return { learnerId, username };
}

function normaliseAvatar(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string" || !AVATAR_PATTERN.test(value)) {
    throw new AccountValidationError("avatarId", "Unknown avatar.");
  }

  return value;
}

/*
 * Checks a sign-in name and password. Unknown names cost the same
 * hashing work as known ones and produce the same error, so the
 * response does not reveal which accounts exist. Five wrong
 * passwords lock the account for fifteen minutes.
 */
export async function authenticateWithPassword(
  login: unknown,
  password: unknown,
): Promise<{ principalId: string; accountKind: AccountKind }> {
  const identifier = normaliseLoginIdentifier(login);
  const candidate = typeof password === "string" ? password : "";
  const credential = identifier
    ? await accountStore.getCredentialByLogin(identifier)
    : undefined;

  if (!credential || credential.status !== "active") {
    await verifyAgainstDummy(candidate);
    throw new InvalidCredentialsError();
  }

  const now = Date.now();
  const lockedUntil = credential.lockedUntil
    ? Date.parse(credential.lockedUntil)
    : 0;

  if (lockedUntil > now) {
    throw new AccountLockedError(Math.ceil((lockedUntil - now) / 1000));
  }

  const valid = await verifyPassword(candidate, credential.passwordHash);

  if (!valid) {
    const { lockedUntil: lockEnd } = await accountStore.recordFailedSignIn(
      credential.id,
      { threshold: LOCKOUT_THRESHOLD, lockMs: LOCKOUT_MINUTES * 60_000, now },
    );

    if (lockEnd) {
      throw new AccountLockedError(
        Math.max(1, Math.ceil((Date.parse(lockEnd) - now) / 1000)),
      );
    }

    throw new InvalidCredentialsError();
  }

  await accountStore.setSignInAttemptState(credential.id, {
    failedAttemptCount: 0,
    lastSignInAt: new Date(now).toISOString(),
  });

  return {
    principalId: credential.principalId,
    accountKind: credential.accountKind,
  };
}

async function listGuardianLearnerIds(
  guardianPrincipalId: string,
): Promise<string[]> {
  const access = await listAuthorizedLearnersForPrincipal(guardianPrincipalId);

  return access
    .filter((entry) => entry.relationshipType === "guardian")
    .map((entry) => entry.learnerId);
}

export interface AccountLearnerSummary {
  learnerId: string;
  displayName: string;
  avatarId?: string;
  preferredLanguage: AccountLanguage;
  onboardingComplete: boolean;
  username?: string;
}

export interface AccountSummary {
  principalId: string;
  accountKind: AccountKind | "external";
  displayName?: string;
  preferredLanguage: AccountLanguage;
  learners: AccountLearnerSummary[];
}

async function summariseLearner(
  learnerId: string,
  includeUsername: boolean,
): Promise<AccountLearnerSummary> {
  const profile = await accountStore.getLearnerProfile(learnerId);
  const credential =
    includeUsername && profile?.signInPrincipalId
      ? await accountStore.getCredentialByPrincipal(profile.signInPrincipalId)
      : undefined;

  return {
    learnerId,
    displayName: profile?.displayName ?? "",
    avatarId: profile?.avatarId,
    preferredLanguage: profile?.preferredLanguage ?? "en",
    onboardingComplete: Boolean(profile?.onboardingCompletedAt),
    username: credential?.loginIdentifier,
  };
}

/*
 * What the signed-in Principal may see about their own account:
 * never another family's learners, and never password hashes,
 * lockout state or consent internals.
 */
export async function describeAccount(
  principalId: string,
): Promise<AccountSummary> {
  const credential = await accountStore.getCredentialByPrincipal(principalId);
  const access = await listAuthorizedLearnersForPrincipal(principalId);

  if (credential?.accountKind === "guardian") {
    const profile = await accountStore.getAccountProfile(principalId);
    const learnerIds = access
      .filter((entry) => entry.relationshipType === "guardian")
      .map((entry) => entry.learnerId);

    return {
      principalId,
      accountKind: "guardian",
      displayName: profile?.displayName,
      preferredLanguage: profile?.preferredLanguage ?? "en",
      learners: await Promise.all(
        learnerIds.map((learnerId) => summariseLearner(learnerId, true)),
      ),
    };
  }

  if (credential?.accountKind === "teacher") {
    const profile = await accountStore.getAccountProfile(principalId);

    return {
      principalId,
      accountKind: "teacher",
      displayName: profile?.displayName,
      preferredLanguage: profile?.preferredLanguage ?? "en",
      learners: await Promise.all(
        access
          .filter((entry) => entry.relationshipType === "teacher")
          .map((entry) => summariseLearner(entry.learnerId, false)),
      ),
    };
  }

  if (credential?.accountKind === "learner") {
    const learners = await Promise.all(
      access
        .filter((entry) => entry.relationshipType === "self")
        .map((entry) => summariseLearner(entry.learnerId, false)),
    );

    return {
      principalId,
      accountKind: "learner",
      displayName: learners[0]?.displayName,
      preferredLanguage: learners[0]?.preferredLanguage ?? "en",
      learners,
    };
  }

  return {
    principalId,
    accountKind: "external",
    preferredLanguage: "en",
    learners: await Promise.all(
      access.map((entry) => summariseLearner(entry.learnerId, false)),
    ),
  };
}

export interface LearnerProfileUpdateInput {
  displayName?: unknown;
  avatarId?: unknown;
  preferredLanguage?: unknown;
  completeOnboarding?: unknown;
}

/*
 * The learner themselves or their guardian may change the
 * learner's name, avatar and language and mark onboarding done.
 */
export async function updateLearnerProfileFor(
  principalId: string,
  learnerId: string,
  input: LearnerProfileUpdateInput,
  // Runs once the caller is authorised and the input is valid,
  // before the profile is written; throwing here changes nothing.
  beforeWrite?: (existing: { onboardingComplete: boolean }) => Promise<void>,
): Promise<AccountLearnerSummary> {
  if (!(await isPrincipalAuthorizedForLearner(principalId, learnerId))) {
    throw new AccountForbiddenError("This learner is not linked to you.");
  }

  const self = await getPrincipalLearnerAccess(principalId, learnerId, "self");
  const guardian = await getPrincipalLearnerAccess(
    principalId,
    learnerId,
    "guardian",
  );

  if (self?.status !== "active" && guardian?.status !== "active") {
    throw new AccountForbiddenError("This learner is not linked to you.");
  }

  const existing = await accountStore.getLearnerProfile(learnerId);

  if (!existing) {
    throw new AccountForbiddenError("This learner has no FILUMIRE profile.");
  }

  const changes = {
    ...(input.displayName !== undefined
      ? { displayName: normaliseDisplayName(input.displayName) }
      : {}),
    ...(input.avatarId !== undefined
      ? { avatarId: normaliseAvatar(input.avatarId) }
      : {}),
    ...(input.preferredLanguage !== undefined
      ? { preferredLanguage: normaliseLanguage(input.preferredLanguage) }
      : {}),
    ...(input.completeOnboarding === true && !existing.onboardingCompletedAt
      ? { onboardingCompletedAt: new Date().toISOString() }
      : {}),
  };

  await beforeWrite?.({ onboardingComplete: Boolean(existing.onboardingCompletedAt) });

  await accountStore.updateLearnerProfile(learnerId, changes);

  return summariseLearner(learnerId, guardian?.status === "active");
}

export async function resetLearnerPassword(
  guardianPrincipalId: string,
  learnerId: string,
  password: unknown,
): Promise<void> {
  await requireGuardianOf(guardianPrincipalId, learnerId);

  const profile = await accountStore.getLearnerProfile(learnerId);

  if (!profile?.signInPrincipalId) {
    throw new AccountForbiddenError("This learner has no FILUMIRE sign-in.");
  }

  await accountStore.updatePasswordHash(
    profile.signInPrincipalId,
    await hashPassword(
      validatePassword(password, LEARNER_PASSWORD_MIN_LENGTH),
    ),
  );

  // Whoever knew the old password is signed out everywhere.
  await revokeOtherPrincipalAuthSessions(profile.signInPrincipalId);
}

/*
 * A signed-in guardian or learner changes their own password. The
 * current password is required and a wrong one counts towards the
 * account lockout, so this cannot be used to guess it. The caller
 * ends the account's other sessions afterwards.
 */
export async function changeOwnPassword(
  principalId: string,
  currentPassword: unknown,
  newPassword: unknown,
): Promise<void> {
  const credential = await accountStore.getCredentialByPrincipal(principalId);

  if (!credential || credential.status !== "active") {
    throw new AccountForbiddenError("This account has no FILUMIRE password.");
  }

  const now = Date.now();
  const lockedUntil = credential.lockedUntil ? Date.parse(credential.lockedUntil) : 0;

  if (lockedUntil > now) {
    throw new AccountLockedError(Math.ceil((lockedUntil - now) / 1000));
  }

  const current = typeof currentPassword === "string" ? currentPassword : "";

  if (!(await verifyPassword(current, credential.passwordHash))) {
    const { lockedUntil: lockEnd } = await accountStore.recordFailedSignIn(
      credential.id,
      { threshold: LOCKOUT_THRESHOLD, lockMs: LOCKOUT_MINUTES * 60_000, now },
    );

    if (lockEnd) {
      throw new AccountLockedError(
        Math.max(1, Math.ceil((Date.parse(lockEnd) - now) / 1000)),
      );
    }

    throw new AccountValidationError(
      "currentPassword",
      "Your current password is not correct.",
    );
  }

  const next = validatePassword(
    newPassword,
    credential.accountKind === "guardian"
      ? GUARDIAN_PASSWORD_MIN_LENGTH
      : LEARNER_PASSWORD_MIN_LENGTH,
  );

  if (next === current) {
    throw new AccountValidationError(
      "password",
      "Choose a new password that is different from the current one.",
    );
  }

  await accountStore.updatePasswordHash(principalId, await hashPassword(next));
}

export async function listGuardianConsentRecords(
  guardianPrincipalId: string,
) {
  await requireGuardian(guardianPrincipalId);
  return accountStore.listConsentRecords(guardianPrincipalId);
}
