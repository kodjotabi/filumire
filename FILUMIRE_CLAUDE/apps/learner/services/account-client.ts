"use client";

import { AVATAR_KEY } from "../components/filumire/avatars";
import {
  saveLanguage,
  type Language,
} from "../components/filumire/language";
import { clearSignedInMarker, hasAccountSession } from "./session-marker";

export { hasAccountSession };

/*
 * Browser side of built-in FILUMIRE accounts: registration,
 * sign-in, the signed-in account, learner profiles and sign-out.
 * The session itself is an HttpOnly cookie this code never sees;
 * the readable filumire_signed_in marker only says one exists.
 */

const NAME_KEY = "filumire.learnerName";

export type AccountKind = "guardian" | "learner" | "external";

export interface AccountLearner {
  learnerId: string;
  displayName: string;
  avatarId?: string;
  preferredLanguage: Language;
  onboardingComplete: boolean;
  username?: string;
}

export interface Account {
  principalId: string;
  accountKind: AccountKind;
  displayName?: string;
  preferredLanguage: Language;
  learners: AccountLearner[];
  activeLearnerId: string | null;
}

export class AccountRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly field?: string,
  ) {
    super(message);
  }
}


async function request<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers:
        init.body === undefined
          ? undefined
          : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new AccountRequestError(
      "Unable to reach FILUMIRE.",
      "network",
      0,
    );
  }

  const result = (await response.json().catch(() => null)) as
    | (T & { error?: string; code?: string; field?: string })
    | null;

  if (!response.ok) {
    if (response.status === 401) {
      clearSignedInMarker();
    }

    throw new AccountRequestError(
      result?.error ?? "Request failed.",
      result?.code ?? "server_error",
      response.status,
      result?.field,
    );
  }

  return result as T;
}

/* The signed-in account, or null when nobody is signed in. */
export async function fetchAccount(): Promise<Account | null> {
  try {
    return await request<Account>("/api/session/me");
  } catch (error) {
    if (error instanceof AccountRequestError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export function activeLearner(account: Account | null): AccountLearner | undefined {
  return account?.learners.find(
    (learner) => learner.learnerId === account.activeLearnerId,
  );
}

/*
 * The dashboard, header and profile read the learner's name and
 * avatar from device storage. After sign-in that copy is replaced
 * with the server profile, so a shared device always shows the
 * learner who is signed in.
 */
export function applyLearnerProfileToDevice(learner: AccountLearner): void {
  try {
    if (learner.displayName) {
      window.localStorage.setItem(NAME_KEY, learner.displayName);
    } else {
      window.localStorage.removeItem(NAME_KEY);
    }
    if (learner.avatarId) {
      window.localStorage.setItem(AVATAR_KEY, learner.avatarId);
    } else {
      window.localStorage.removeItem(AVATAR_KEY);
    }
  } catch {
    /* storage unavailable */
  }
  saveLanguage(learner.preferredLanguage);
  window.dispatchEvent(new Event("filumire-avatar"));
}

export function clearLearnerProfileFromDevice(): void {
  try {
    window.localStorage.removeItem(NAME_KEY);
    window.localStorage.removeItem(AVATAR_KEY);
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event("filumire-avatar"));
}

export async function signIn(
  login: string,
  password: string,
): Promise<{ accountKind: "guardian" | "learner"; learnerId: string | null }> {
  return request("/api/session/login", { body: { login, password } });
}

export async function signOut(): Promise<void> {
  try {
    await request("/api/session/logout", { body: {} });
  } catch {
    /* already signed out */
  }
  clearSignedInMarker();
  clearLearnerProfileFromDevice();
}

export interface GuardianRegistration {
  displayName: string;
  email: string;
  password: string;
  preferredLanguage: Language;
  confirmsGuardian: boolean;
  acceptsNotice: boolean;
}

export async function registerGuardian(
  registration: GuardianRegistration,
): Promise<void> {
  await request("/api/account/register", { body: registration });
}

export interface NewLearner {
  displayName: string;
  username: string;
  password: string;
  preferredLanguage: Language;
  gradeId?: string;
  consentsToLearnerData: boolean;
}

export async function addLearner(
  learner: NewLearner,
): Promise<{ learnerId: string; username: string }> {
  return request("/api/account/learners", { body: learner });
}

export interface LearnerProfileChange {
  displayName?: string;
  avatarId?: string;
  preferredLanguage?: Language;
  gradeId?: string;
  completeOnboarding?: boolean;
}

export async function updateLearnerProfile(
  learnerId: string,
  change: LearnerProfileChange,
): Promise<AccountLearner> {
  return request(`/api/account/learners/${encodeURIComponent(learnerId)}`, {
    method: "PATCH",
    body: change,
  });
}

/*
 * Saves a profile change for the signed-in learner if there is
 * one; a no-op for the local test learner, whose details live on
 * this device only.
 */
export async function saveSignedInLearnerProfile(
  change: LearnerProfileChange,
): Promise<void> {
  if (!hasAccountSession()) return;

  const account = await fetchAccount();
  const learnerId = account?.activeLearnerId;

  if (learnerId) {
    await updateLearnerProfile(learnerId, change);
  }
}

export async function setLearnerPassword(
  learnerId: string,
  password: string,
): Promise<void> {
  await request(
    `/api/account/learners/${encodeURIComponent(learnerId)}/password`,
    { body: { password } },
  );
}

export async function selectLearner(learnerId: string | null): Promise<void> {
  await request("/api/session/select-learner", { body: { learnerId } });
}

const MESSAGES: Record<string, { en: string; fr: string }> = {
  invalid_email: {
    en: "Enter a valid email address.",
    fr: "Saisis une adresse e-mail valide.",
  },
  invalid_username: {
    en: "Usernames are 3 to 24 letters or numbers, and may include . _ or -.",
    fr: "L'identifiant contient 3 à 24 lettres ou chiffres, avec éventuellement . _ ou -.",
  },
  invalid_password: {
    en: "That password is too short.",
    fr: "Ce mot de passe est trop court.",
  },
  invalid_displayName: {
    en: "Enter a name of 1 to 40 characters.",
    fr: "Saisis un nom de 1 à 40 caractères.",
  },
  invalid_consent: {
    en: "Please tick the confirmation boxes to continue.",
    fr: "Coche les cases de confirmation pour continuer.",
  },
  invalid_learner: {
    en: "This family account already has the maximum number of learners.",
    fr: "Ce compte famille a déjà le nombre maximum d'apprenants.",
  },
  invalid_grade: {
    en: "Choose a class from the list.",
    fr: "Choisis une classe dans la liste.",
  },
  login_taken: {
    en: "That email or username is already in use. Try another, or sign in.",
    fr: "Cet e-mail ou cet identifiant est déjà utilisé. Essaie un autre, ou connecte-toi.",
  },
  invalid_credentials: {
    en: "The email, username or password is not correct.",
    fr: "L'e-mail, l'identifiant ou le mot de passe est incorrect.",
  },
  locked: {
    en: "Too many unsuccessful attempts. Please wait 15 minutes and try again.",
    fr: "Trop de tentatives sans succès. Attends 15 minutes puis réessaie.",
  },
  rate_limited: {
    en: "Too many attempts. Please wait a few minutes and try again.",
    fr: "Trop de tentatives. Attends quelques minutes puis réessaie.",
  },
  registration_closed: {
    en: "New FILUMIRE accounts are not open yet.",
    fr: "La création de comptes FILUMIRE n'est pas encore ouverte.",
  },
  forbidden: {
    en: "This account cannot do that.",
    fr: "Ce compte ne peut pas faire cela.",
  },
  unauthenticated: {
    en: "Please sign in again.",
    fr: "Merci de te reconnecter.",
  },
  auth_unavailable: {
    en: "Sign-in is temporarily unavailable. Please try again later.",
    fr: "La connexion est momentanément indisponible. Réessaie plus tard.",
  },
  network: {
    en: "FILUMIRE could not be reached. Check your connection and try again.",
    fr: "Impossible de joindre FILUMIRE. Vérifie ta connexion et réessaie.",
  },
};

export function accountErrorMessage(error: unknown, language: Language): string {
  const code = error instanceof AccountRequestError ? error.code : "server_error";

  return (
    MESSAGES[code]?.[language] ??
    (language === "fr"
      ? "Une erreur s'est produite. Réessaie."
      : "Something went wrong. Please try again.")
  );
}

/*
 * Where a freshly signed-in browser should go: a guardian without
 * a chosen learner to the family page, a learner to first-time
 * setup until it is done, otherwise to their learning home.
 */
export function destinationFor(account: Account, language: Language): string {
  if (account.accountKind === "guardian" && !account.activeLearnerId) {
    return `/family?lang=${language}`;
  }

  const learner = activeLearner(account);

  return learner && !learner.onboardingComplete
    ? `/dashboard?lang=${language}&view=setup`
    : `/dashboard?lang=${language}`;
}
