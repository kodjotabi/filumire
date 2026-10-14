import { resolveSignedInSession } from "../../../../../../services/identity";
import { describeAccount } from "../../../../../../services/account";
import { errorResponse, json } from "../http";

/** No payment prototype, browser claim or public-site session grants learning access. */
export async function GET(request: Request) {
  try {
    const session = await resolveSignedInSession(request);
    await describeAccount(session.principalId);
    return json({
      accountAuthority: "filumire-learner",
      billing: { operational: false, providerMode: "test", entitlementBridge: "not_configured" },
      // Preserve today's access rules; do not silently impose an unfinished paywall.
      learningAccessPolicy: "existing_authorisation",
    });
  } catch (error) { return errorResponse(error, "access status"); }
}
