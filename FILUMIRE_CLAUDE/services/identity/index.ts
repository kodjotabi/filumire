import {
  createLocalJWKSet,
  jwtVerify,
  SignJWT,
} from "jose";

import {
  createPrincipalAuthSession,
  isPrincipalAuthSessionValid,
  updatePrincipalAuthSessionLastActivity,
} from "../auth-session";

import {
  isPrincipalAuthorizedForLearner,
  listLearnersForPrincipal,
  resolveOrCreatePrincipalForExternalIdentity,
} from "../principal";

import {
  ensureDevelopmentAdultAccess,
} from "../development-fixtures";

import type {
  LearnerId,
} from "../../packages/domain";

const DEVELOPMENT_IDENTITY_HEADER =
  "x-filumire-learner-id";

const DEVELOPMENT_PRINCIPAL_HEADER =
  "x-filumire-principal-id";

const PRODUCTION_SESSION_COOKIE =
  "filumire_auth_session";

const PRODUCTION_JWT_ISSUER =
  "filumire-learner";

const PRODUCTION_JWT_AUDIENCE =
  "filumire-learner-api";

const PRODUCTION_SESSION_LIFETIME_SECONDS =
  60 * 60;

const PRINCIPAL_SCOPE = "principal";

type CreatePrincipalAuthSession = (
  sessionId: string,
  principalId: string,
  expiresAt: string,
) => Promise<void>;

interface ExternalIdentity {
  providerNamespace: string;
  providerSubject: string;
}

export interface RequestIdentity {
  learnerId: LearnerId;
  principalId?: string;
  authenticated: boolean;
  sessionId?: string;
  source:
    | "development-header"
    | "production-session";
}

function isValidIdentity(
  value: string,
): boolean {
  return (
    value.trim().length > 0 &&
    value.length <= 128
  );
}

function getCookieValue(
  request: Request,
  name: string,
): string | undefined {
  const cookies =
    request.headers.get("cookie") ?? "";

  const cookie = cookies
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));

  if (!cookie) {
    return undefined;
  }

  try {
    return decodeURIComponent(
      cookie.slice(name.length + 1),
    );
  } catch {
    return undefined;
  }
}

/*
 * A real signed-in session always wins. Outside production the
 * development identity headers remain the fallback for local
 * testing when no one has signed in.
 */
function hasProductionSessionCookie(
  request: Request,
): boolean {
  return Boolean(
    getCookieValue(request, PRODUCTION_SESSION_COOKIE),
  );
}

/*
 * A session token always names its Principal (sub) and server
 * session (sid). Learner sessions also carry learner_id; a parent
 * or guardian session that has not chosen a learner instead
 * carries scope "principal" and can reach only adult endpoints.
 */
async function verifyProductionSessionToken(
  request: Request,
): Promise<{
  principalId: string;
  sessionId: string;
  learnerId?: string;
}> {
  const token = getCookieValue(
    request,
    PRODUCTION_SESSION_COOKIE,
  );

  if (!token) {
    throw new Error(
      "Unauthenticated request: production session is required.",
    );
  }

  const secret =
    process.env.FILUMIRE_AUTH_JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "Production authentication is unavailable.",
    );
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      {
        algorithms: ["HS256"],
        audience: PRODUCTION_JWT_AUDIENCE,
        issuer: PRODUCTION_JWT_ISSUER,
        requiredClaims: ["exp", "sid", "sub"],
      },
    );

    const learnerBound =
      typeof payload.learner_id === "string" &&
      isValidIdentity(payload.learner_id);
    const principalScoped =
      payload.learner_id === undefined &&
      payload.scope === PRINCIPAL_SCOPE;

    if (
      typeof payload.sub !== "string" ||
      !isValidIdentity(payload.sub) ||
      typeof payload.sid !== "string" ||
      !isValidIdentity(payload.sid) ||
      !(learnerBound || principalScoped)
    ) {
      throw new Error("Invalid claims.");
    }

    const principalId = payload.sub;
    const sessionId = payload.sid;
    const learnerId = learnerBound
      ? (payload.learner_id as string)
      : undefined;

    const validAuthSession =
      await isPrincipalAuthSessionValid(
        sessionId,
        principalId,
      );

    if (!validAuthSession) {
      throw new Error("Invalid server session.");
    }

    await updatePrincipalAuthSessionLastActivity(
      sessionId,
      principalId,
    );

    return { principalId, sessionId, learnerId };
  } catch {
    throw new Error(
      "Unauthenticated request: invalid production session.",
    );
  }
}

async function resolveProductionIdentity(
  request: Request,
): Promise<RequestIdentity> {
  const { principalId, sessionId, learnerId } =
    await verifyProductionSessionToken(request);

  if (!learnerId) {
    throw new Error(
      "Unauthenticated request: choose a learner to continue.",
    );
  }

  const authorized =
    await isPrincipalAuthorizedForLearner(
      principalId,
      learnerId,
    );

  if (!authorized) {
    throw new Error(
      "Unauthenticated request: invalid production session.",
    );
  }

  return {
    learnerId: learnerId as LearnerId,
    principalId,
    sessionId,
    authenticated: true,
    source: "production-session",
  };
}

export interface PrincipalRequestIdentity {
  principalId: string;
  sessionId?: string;
}

/*
 * Resolves the authenticated Principal from an
 * already-established session, independent of
 * which single Learner that session happens to be
 * bound to. Used by adult-supervision endpoints,
 * which must recheck authorization per requested
 * Learner rather than trusting a single bound claim.
 */
export async function resolvePrincipalIdentity(
  request: Request,
): Promise<PrincipalRequestIdentity> {
  if (
    process.env.NODE_ENV ===
      "production" ||
    hasProductionSessionCookie(request)
  ) {
    const { principalId, sessionId } =
      await verifyProductionSessionToken(request);

    return { principalId, sessionId };
  }

  const principalId =
    request.headers.get(
      DEVELOPMENT_PRINCIPAL_HEADER,
    );

  if (!principalId || !isValidIdentity(principalId)) {
    throw new Error(
      "Unauthenticated request: principal identity is required.",
    );
  }

  await ensureDevelopmentAdultAccess(principalId);

  return { principalId };
}

export async function resolveRequestIdentity(
  request: Request,
): Promise<RequestIdentity> {
  if (
    process.env.NODE_ENV ===
      "production" ||
    hasProductionSessionCookie(request)
  ) {
    return resolveProductionIdentity(request);
  }

  const learnerId =
    request.headers.get(
      DEVELOPMENT_IDENTITY_HEADER,
    );

  if (!learnerId) {
    throw new Error(
      "Unauthenticated request: learner identity is required.",
    );
  }

  if (!isValidIdentity(learnerId)) {
    throw new Error(
      "Invalid learner identity.",
    );
  }

  return {
    learnerId:
      learnerId as LearnerId,
    authenticated: true,
    source:
      "development-header",
  };
}

function getRequiredEnvironmentVariable(
  name: string,
): string {
  const value = process.env[name];

  if (!value) {
    throw new Error("Production authentication is unavailable.");
  }

  return value;
}

function getBearerToken(
  request: Request,
): string | undefined {
  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return undefined;
  }

  const token = authorization.slice("Bearer ".length);

  return token || undefined;
}

async function getRequestedLearnerId(
  request: Request,
): Promise<string | undefined> {
  const contentType =
    request.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return undefined;
  }

  try {
    const body = await request.json() as {
      learnerId?: unknown;
    };

    return typeof body.learnerId === "string" &&
      isValidIdentity(body.learnerId)
      ? body.learnerId
      : undefined;
  } catch {
    return undefined;
  }
}

async function resolveExternalIdentity(
  request: Request,
): Promise<ExternalIdentity> {
  const token = getBearerToken(request);

  if (!token) {
    throw new Error(
      "Unauthenticated request: external identity is required.",
    );
  }

  const jwks = getRequiredEnvironmentVariable(
    "FILUMIRE_EXTERNAL_AUTH_JWKS",
  );
  const issuer = getRequiredEnvironmentVariable(
    "FILUMIRE_EXTERNAL_AUTH_ISSUER",
  );
  const audience = getRequiredEnvironmentVariable(
    "FILUMIRE_EXTERNAL_AUTH_AUDIENCE",
  );

  try {
    const { payload } = await jwtVerify(
      token,
      createLocalJWKSet(JSON.parse(jwks)),
      {
        algorithms: ["RS256"],
        audience,
        issuer,
        requiredClaims: ["exp", "sub"],
      },
    );

    if (
      typeof payload.sub !== "string" ||
      !isValidIdentity(payload.sub)
    ) {
      throw new Error("Invalid claims.");
    }

    return {
      providerNamespace: issuer,
      providerSubject: payload.sub,
    };
  } catch {
    throw new Error(
      "Unauthenticated request: invalid external identity.",
    );
  }
}

export interface IssuedSession {
  learnerId?: LearnerId;
  principalId: string;
  sessionId: string;
  token: string;
}

/*
 * Creates the server session row and signs the cookie token for
 * an already-authenticated Principal. With a learnerId the session
 * is bound to that learner (the caller must already have checked
 * the Principal is authorised for it); without one it is a
 * principal-only session for adult pages.
 */
export async function issueSessionForPrincipal(
  principalId: string,
  learnerId?: string,
  createServerSession: CreatePrincipalAuthSession =
    createPrincipalAuthSession,
): Promise<IssuedSession> {
  const secret =
    getRequiredEnvironmentVariable(
      "FILUMIRE_AUTH_JWT_SECRET",
    );

  if (secret.length < 32) {
    throw new Error(
      "Production authentication is unavailable.",
    );
  }

  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() +
      PRODUCTION_SESSION_LIFETIME_SECONDS * 1000,
  ).toISOString();

  await createServerSession(
    sessionId,
    principalId,
    expiresAt,
  );

  const token = await new SignJWT(
    learnerId
      ? { sid: sessionId, learner_id: learnerId }
      : { sid: sessionId, scope: PRINCIPAL_SCOPE },
  )
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setAudience(PRODUCTION_JWT_AUDIENCE)
    .setExpirationTime(
      `${PRODUCTION_SESSION_LIFETIME_SECONDS}s`,
    )
    .setIssuedAt()
    .setIssuer(PRODUCTION_JWT_ISSUER)
    .setSubject(principalId)
    .sign(new TextEncoder().encode(secret));

  return {
    learnerId: learnerId as LearnerId | undefined,
    principalId,
    sessionId,
    token,
  };
}

/*
 * Reads the current session cookie with no development-header
 * fallback. Account endpoints use this: they only ever act for a
 * Principal who really signed in.
 */
export async function resolveSignedInSession(
  request: Request,
): Promise<{
  principalId: string;
  sessionId: string;
  learnerId?: string;
}> {
  const session =
    await verifyProductionSessionToken(request);

  if (
    session.learnerId &&
    !(await isPrincipalAuthorizedForLearner(
      session.principalId,
      session.learnerId,
    ))
  ) {
    throw new Error(
      "Unauthenticated request: invalid production session.",
    );
  }

  return session;
}

export async function issueProductionSession(
  request: Request,
  createServerSession: CreatePrincipalAuthSession =
    createPrincipalAuthSession,
): Promise<{
  learnerId: LearnerId;
  principalId: string;
  sessionId: string;
  token: string;
}> {
  const externalIdentity =
    await resolveExternalIdentity(request);
  const requestedLearnerId =
    await getRequestedLearnerId(request);

  const principalId =
    await resolveOrCreatePrincipalForExternalIdentity(
      externalIdentity.providerNamespace,
      externalIdentity.providerSubject,
    );

  const learnerIds =
    await listLearnersForPrincipal(principalId);

  let learnerId: string;

  if (requestedLearnerId) {
    if (!learnerIds.includes(requestedLearnerId)) {
      throw new Error(
        "Requested learner is not authorised for this principal.",
      );
    }

    learnerId = requestedLearnerId;
  } else if (learnerIds.length === 0) {
    throw new Error(
      "No authorised learner is available for this principal.",
    );
  } else if (learnerIds.length > 1) {
    throw new Error(
      "Explicit learner selection is required for this principal.",
    );
  } else {
    learnerId = learnerIds[0];
  }

  const session = await issueSessionForPrincipal(
    principalId,
    learnerId,
    createServerSession,
  );

  return {
    ...session,
    learnerId: learnerId as LearnerId,
  };
}

export function getProductionSessionCookie(
  token: string,
): string {
  return `${PRODUCTION_SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Max-Age=${PRODUCTION_SESSION_LIFETIME_SECONDS}; Path=/; SameSite=Strict; Secure`;
}

export function getProductionSessionClearCookie(): string {
  return `${PRODUCTION_SESSION_COOKIE}=; HttpOnly; Max-Age=0; Path=/; SameSite=Strict; Secure`;
}