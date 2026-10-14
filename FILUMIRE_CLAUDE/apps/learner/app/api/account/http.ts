import { NextResponse } from "next/server";

import {
  AccountForbiddenError,
  AccountLockedError,
  AccountValidationError,
  InvalidCredentialsError,
  LoginIdentifierTakenError,
} from "../../../../../services/account";

import {
  consumeRateLimit,
  getClientAddress,
} from "../../../../../services/account/rate-limit";

import {
  getProductionSessionClearCookie,
  getProductionSessionCookie,
  getSignedInMarkerClearCookie,
  getSignedInMarkerCookie,
} from "../../../../../services/identity";

import { LearnerContextValidationError } from "../../../../../services/learner-context";

/*
 * Shared request/response handling for the account and sign-in
 * endpoints. Every error carries a stable `code` so the browser
 * can show the message in English or French.
 */

export class BadRequestError extends Error {}

export function assertSameOrigin(request: Request): void {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    throw new BadRequestError("Cross-site account requests are not allowed.");
  }
  const origin = request.headers.get("origin");
  const expected = new URL(request.url);
  const host = request.headers.get("host");
  if (host) expected.host = host;
  const protocol = request.headers.get("x-forwarded-proto");
  if (process.env.VERCEL && (protocol === "https" || protocol === "http")) expected.protocol = `${protocol}:`;
  if (origin && origin !== expected.origin) {
    throw new BadRequestError("Account requests must come from this application.");
  }
}

const NO_STORE = { "cache-control": "no-store" };

/*
 * Account mutations require same-origin JSON and a bounded body.
 * SameSite=Strict cookies and CORS remain additional protections.
 */
export async function readJsonBody(
  request: Request,
): Promise<Record<string, unknown>> {
  assertSameOrigin(request);
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new BadRequestError("Expected a JSON request.");
  }

  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 16_384) {
          await reader.cancel();
          throw new BadRequestError("Request is too large.");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const text = new TextDecoder().decode(bytes);

  try {
    const body = JSON.parse(text) as unknown;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error();
    }

    return body as Record<string, unknown>;
  } catch {
    throw new BadRequestError("Request body is not valid JSON.");
  }
}

export function json(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): NextResponse {
  return NextResponse.json(body, {
    status: init.status ?? 200,
    headers: { ...NO_STORE, ...init.headers },
  });
}

/*
 * Sets (token) or clears (null) the HttpOnly session cookie and
 * the readable signed-in marker together.
 */
export function withSessionCookies(
  response: NextResponse,
  token: string | null,
): NextResponse {
  if (token) {
    response.headers.append("set-cookie", getProductionSessionCookie(token));
    response.headers.append("set-cookie", getSignedInMarkerCookie());
  } else {
    response.headers.append("set-cookie", getProductionSessionClearCookie());
    response.headers.append("set-cookie", getSignedInMarkerClearCookie());
  }

  return response;
}

export function rateLimited(retryAfterSeconds: number): NextResponse {
  return json(
    {
      error: "Too many attempts. Please wait a few minutes and try again.",
      code: "rate_limited",
    },
    {
      status: 429,
      headers: { "retry-after": String(retryAfterSeconds) },
    },
  );
}

/*
 * Applies each limit in turn; returns a 429 response for the
 * first exceeded one, or undefined when the request may proceed.
 */
export async function checkRateLimits(
  request: Request,
  scope: string,
  limits: Array<{ key?: string; limit: number; windowMs: number }>,
): Promise<NextResponse | undefined> {
  const address = getClientAddress(request);

  for (const entry of limits) {
    const result = await consumeRateLimit(
      `${scope}:${entry.key ?? `ip:${address}`}`,
      entry.limit,
      entry.windowMs,
    );

    if (!result.allowed) {
      return rateLimited(result.retryAfterSeconds);
    }
  }

  return undefined;
}

export function errorResponse(
  error: unknown,
  context: string,
): NextResponse {
  if (error instanceof AccountValidationError) {
    return json(
      {
        error: error.message,
        code:
          error.field === "registration"
            ? "registration_closed"
            : `invalid_${error.field}`,
        field: error.field,
      },
      { status: error.field === "registration" ? 403 : 400 },
    );
  }

  if (error instanceof LoginIdentifierTakenError) {
    return json(
      { error: error.message, code: "login_taken" },
      { status: 409 },
    );
  }

  if (error instanceof InvalidCredentialsError) {
    return json(
      { error: error.message, code: "invalid_credentials" },
      { status: 401 },
    );
  }

  if (error instanceof AccountLockedError) {
    return json(
      { error: error.message, code: "locked" },
      {
        status: 429,
        headers: { "retry-after": String(error.retryAfterSeconds) },
      },
    );
  }

  if (error instanceof AccountForbiddenError) {
    return json(
      { error: error.message, code: "forbidden" },
      { status: 403 },
    );
  }

  if (error instanceof LearnerContextValidationError) {
    return json(
      { error: error.message, code: "invalid_grade", field: "gradeId" },
      { status: 400 },
    );
  }

  if (error instanceof BadRequestError) {
    return json(
      { error: error.message, code: "bad_request" },
      { status: 400 },
    );
  }

  if (
    error instanceof Error &&
    error.message === "Production authentication is unavailable."
  ) {
    console.error(
      "FILUMIRE sign-in is not configured: FILUMIRE_AUTH_JWT_SECRET must be set (32+ characters).",
    );
    return json(
      { error: "Sign-in is temporarily unavailable.", code: "auth_unavailable" },
      { status: 503 },
    );
  }

  if (
    error instanceof Error &&
    error.message.startsWith("Unauthenticated request")
  ) {
    return json(
      { error: "Please sign in.", code: "unauthenticated" },
      { status: 401 },
    );
  }

  console.error(`FILUMIRE ${context} error:`, error);

  return json(
    { error: "Something went wrong. Please try again.", code: "server_error" },
    { status: 500 },
  );
}
