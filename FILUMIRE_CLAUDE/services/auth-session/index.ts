import { persistenceStore } from "../persistence-provider";
import type {
  PrincipalAuthSessionRecord,
  PrincipalAuthSessionRenewal,
} from "../persistence";

/*
 * Signed-in sessions last eight hours from the most recent
 * authenticated request, and never more than seven days from
 * sign-in. The server row is the authority: logout and revocation
 * end a session at once whatever the cookie says.
 */
export const SESSION_IDLE_SECONDS = 8 * 60 * 60;

export const SESSION_MAX_LIFETIME_SECONDS = 7 * 24 * 60 * 60;

export const SESSION_RENEWAL: PrincipalAuthSessionRenewal = {
  idleSeconds: SESSION_IDLE_SECONDS,
  maxLifetimeSeconds: SESSION_MAX_LIFETIME_SECONDS,
};

export async function createPrincipalAuthSession(
  sessionId: string,
  principalId: string,
  expiresAt: string,
): Promise<void> {
  await persistenceStore.createPrincipalAuthSession(
    sessionId,
    principalId,
    expiresAt,
  );
}

export async function getPrincipalAuthSession(
  sessionId: string,
): Promise<PrincipalAuthSessionRecord | undefined> {
  return persistenceStore.getPrincipalAuthSession(
    sessionId,
  );
}

export async function isPrincipalAuthSessionValid(
  sessionId: string,
  principalId: string,
  at = new Date().toISOString(),
): Promise<boolean> {
  return persistenceStore.isPrincipalAuthSessionValid(
    sessionId,
    principalId,
    at,
  );
}

export async function updatePrincipalAuthSessionLastActivity(
  sessionId: string,
  principalId: string,
  lastActivityAt = new Date().toISOString(),
  renewal?: PrincipalAuthSessionRenewal,
): Promise<void> {
  await persistenceStore.updatePrincipalAuthSessionLastActivity(
    sessionId,
    principalId,
    lastActivityAt,
    renewal,
  );
}

/*
 * Records activity and slides the session's expiry forward.
 */
export async function renewPrincipalAuthSession(
  sessionId: string,
  principalId: string,
  at = new Date().toISOString(),
): Promise<void> {
  await updatePrincipalAuthSessionLastActivity(
    sessionId,
    principalId,
    at,
    SESSION_RENEWAL,
  );
}

/*
 * Ends every session of the Principal except exceptSessionId:
 * after a password change, or "sign out other devices".
 */
export async function revokeOtherPrincipalAuthSessions(
  principalId: string,
  exceptSessionId?: string,
  revokedAt = new Date().toISOString(),
): Promise<number> {
  return persistenceStore.revokeOtherPrincipalAuthSessions(
    principalId,
    exceptSessionId,
    revokedAt,
  );
}

export async function revokePrincipalAuthSession(
  sessionId: string,
  principalId: string,
  revokedAt = new Date().toISOString(),
): Promise<void> {
  await persistenceStore.revokePrincipalAuthSession(
    sessionId,
    principalId,
    revokedAt,
  );
}