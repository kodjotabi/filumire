import { localFamilyServices, requireFamilyAdult } from "../../../../../../services/family-access";
import { AccessError } from "../../../../../../services/family-access/otp";
import type { BillingInterval, PaidPlan } from "../../../../../../services/family-access/subscriptions";
import { resolveSignedInSession } from "../../../../../../services/identity";
import { checkRateLimits, json, readJsonBody } from "../http";

function safeError(error: unknown) {
  const code = error instanceof AccessError ? error.code : "forbidden";
  return json({ code }, { status: code === "unavailable" ? 503 : code === "forbidden" ? 403 : 400 });
}
export async function GET(request: Request) {
  try {
    const { subscriptions } = localFamilyServices();
    const session = await resolveSignedInSession(request);
    await requireFamilyAdult(session.principalId);
    return json({ ...subscriptions.snapshot(session.principalId), choices: subscriptions.choices(), history: subscriptions.billingHistory(session.principalId) });
  } catch (error) { return safeError(error); }
}
export async function POST(request: Request) {
  try {
    const { subscriptions } = localFamilyServices();
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new AccessError("forbidden");
    const session = await resolveSignedInSession(request);
    await requireFamilyAdult(session.principalId);
    const limited = await checkRateLimits(request, "family-subscription", [{ key: session.principalId, limit: 10, windowMs: 60_000 }]);
    if (limited) return limited;
    const body = await readJsonBody(request);
    if (Object.keys(body).some(key => !["action", "plan", "interval", "authorised", "requestId"].includes(key))) throw new AccessError("invalid_request");
    if (body.action === "cancel") return json(subscriptions.cancel(session.principalId));
    if (body.action !== "checkout" || typeof body.requestId !== "string") throw new AccessError("invalid_request");
    return json(subscriptions.checkout(session.principalId, body.plan as PaidPlan, body.interval as BillingInterval, body.authorised, body.requestId), { status: 201 });
  } catch (error) { return safeError(error); }
}
