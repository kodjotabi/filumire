import { localFamilyServices, requireFamilyAdult } from "../../../../../../services/family-access";
import { AccessError, type OtpPurpose } from "../../../../../../services/family-access/otp";
import { getClientAddress } from "../../../../../../services/account/rate-limit";
import { issueSessionForPrincipal, resolveSignedInSession } from "../../../../../../services/identity";
import { checkRateLimits, json, readJsonBody, withSessionCookies } from "../http";

/** Mock workflows only. Never route real SMS or production accounts to these adapters. */
export async function POST(request: Request) {
  try {
    const services = localFamilyServices();
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new AccessError("forbidden");
    const limited = await checkRateLimits(request, "family-phone", [{ limit: 30, windowMs: 60_000 }]);
    if (limited) return limited;
    const body = await readJsonBody(request);
    if (Object.keys(body).some(key => !["action", "purpose", "phone", "challengeId", "code", "displayName", "language", "confirmsGuardian", "acceptsNotice", "currentPassword", "newPassword"].includes(key))) throw new AccessError("invalid_request");
    const purpose = body.purpose as OtpPurpose;
    if (!["register", "login", "link", "recover"].includes(purpose)) throw new AccessError("invalid_request");
    // Link challenges bind to both the authenticated adult and current server session.
    const session = purpose === "link" ? await resolveSignedInSession(request) : undefined;
    if (session) await requireFamilyAdult(session.principalId);
    const actor = session ? `${session.principalId}:${session.sessionId}` : "public-phone-flow";
    const address = getClientAddress(request);
    if (body.action === "start") return json(await services.otp.start(body.phone, purpose, actor, address));
    if (body.action !== "verify") throw new AccessError("invalid_request");
    const phone = services.otp.verify(body.challengeId, body.code, purpose, actor, address);
    if (purpose === "link") {
      await services.phones.linkVerified(phone, session!.principalId, body.currentPassword);
      return json({ verified: true });
    }
    if (purpose === "recover") {
      await services.phones.recoverVerified(phone, body.newPassword);
      return withSessionCookies(json({ verified: true, signInRequired: true }), null);
    }
    const principalId = purpose === "register" ? await services.phones.registerVerified(phone, {
      displayName: body.displayName, language: body.language, confirmsGuardian: body.confirmsGuardian, acceptsNotice: body.acceptsNotice,
    }) : await services.phones.loginVerified(phone);
    const issued = await issueSessionForPrincipal(principalId);
    return withSessionCookies(json({ verified: true, accountKind: "guardian" }), issued.token);
  } catch (error) {
    // Never echo provider errors, numbers, codes, secrets or account-existence details.
    const code = error instanceof AccessError ? error.code : "verification_failed";
    return json({ code }, { status: code === "unavailable" ? 503 : code === "rate_limited" ? 429 : code === "forbidden" ? 403 : 400 });
  }
}
